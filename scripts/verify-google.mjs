import fs from 'node:fs';
import path from 'node:path';
import { importPKCS8, SignJWT } from 'jose';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const map = {};
  if (!fs.existsSync(envPath)) return map;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function extractId(raw = '') {
  const t = raw.trim();
  const folder = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (folder) return folder[1];
  const doc = /\/d\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (doc) return doc[1];
  return t;
}

const env = { ...loadDotEnv(), ...process.env };
const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const privateKeyRaw = env.GOOGLE_PRIVATE_KEY || '';
const sheetId = extractId(env.GOOGLE_MASTER_SHEET_ID || '');
const driveFolderId = extractId(
  env.REPERTOIRE_DRIVE_FOLDER_ID || '1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc'
);

console.log('--- Kantorei Google Workspace Connection Doctor ---\n');

if (!clientEmail || !privateKeyRaw) {
  console.log('⚠️  GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY are not set in .env yet.');
  console.log('   Once you download your Service Account JSON key, run:');
  console.log('   npm run setup:key -- ~/Downloads/your-key.json\n');
  process.exit(0);
}

console.log(`1. Authenticating Service Account (${clientEmail})...`);
const pem = privateKeyRaw.replace(/\\n/g, '\n');
const pk = await importPKCS8(pem, 'RS256');
const now = Math.floor(Date.now() / 1000);
const assertion = await new SignJWT({
  scope:
    'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
})
  .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
  .setIssuer(clientEmail)
  .setSubject(clientEmail)
  .setAudience('https://oauth2.googleapis.com/token')
  .setIssuedAt(now)
  .setExpirationTime(now + 3600)
  .sign(pk);

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }),
});

if (!tokenRes.ok) {
  console.error('❌ Token exchange failed:', await tokenRes.text());
  process.exit(1);
}
const { access_token: token } = await tokenRes.json();
console.log('   ✅ Google OAuth Bearer token acquired!\n');

// 2. Test Music Google Drive Folder (1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc)
console.log(`2. Checking Repertoire Drive Folder (${driveFolderId})...`);
const driveParams = new URLSearchParams({
  q: `'${driveFolderId}' in parents and trashed = false`,
  fields: 'files(id,name,mimeType)',
  pageSize: '50',
  supportsAllDrives: 'true',
  includeItemsFromAllDrives: 'true',
});
const driveRes = await fetch(
  `https://www.googleapis.com/drive/v3/files?${driveParams.toString()}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (!driveRes.ok) {
  console.error(`   ❌ Drive API error (${driveRes.status}):`, await driveRes.text());
} else {
  const { files = [] } = await driveRes.json();
  if (files.length === 0) {
    console.log(
      `   ⚠️  Connected to Drive API, but 0 items returned for folder ${driveFolderId}.`
    );
    console.log(
      `      If that folder is restricted (not "Anyone with the link"), ask the folder owner (or anyone with share access) to share it as Viewer with:`
    );
    console.log(`      ${clientEmail}`);
  } else {
    console.log(`   ✅ Found ${files.length} top-level item(s) in Music Drive Folder:`);
    for (const f of files.slice(0, 8)) {
      console.log(`      • ${f.name} (${f.mimeType})`);
    }
    if (files.length > 8) console.log(`      ...and ${files.length - 8} more.`);
  }
}

// 3. Test Master Google Sheet
console.log('\n3. Checking Master Google Sheet...');
if (!sheetId || sheetId === 'DEMO') {
  console.log('   ℹ️  GOOGLE_MASTER_SHEET_ID is still set to "DEMO" in .env.');
  console.log('      Upload setup/kantorei-master-sheet-starter.xlsx to Google Sheets,');
  console.log(`      share it as Editor with ${clientEmail}, and paste its URL/ID into .env.`);
} else {
  const tabs = ['Roster!A1:G5', 'Schedule!A1:I5', 'Concerts!A1:I5', 'Config!A1:B15', 'Media!A1:F5'];
  for (const range of tabs) {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error(`   ❌ Failed reading ${range} (${res.status}):`, await res.text());
      console.error(`      Make sure the Sheet is shared with ${clientEmail} as Editor.`);
      break;
    } else {
      const data = await res.json();
      console.log(`   ✅ ${range.split('!')[0]}: ${(data.values?.length ?? 1) - 1} data row(s)`);
    }
  }
}
console.log('\nDone!');

