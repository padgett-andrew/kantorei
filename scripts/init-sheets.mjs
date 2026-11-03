#!/usr/bin/env node
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

const dotEnv = loadDotEnv();
const env = { ...dotEnv, ...process.env };

const clientEmail = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const privateKeyRaw = (env.GOOGLE_PRIVATE_KEY || '').trim();
const sheetId = extractId(env.GOOGLE_MASTER_SHEET_ID || '');

console.log('\n======================================================');
console.log(' 🛠️   KANTOREI MASTER GOOGLE SHEET SCHEMA PROVISIONER');
console.log('======================================================\n');

const SCHEMA_SPEC = {
  Roster: {
    headers: ['Email', 'Name', 'Voice_Part', 'Section_Group', 'Role', 'Phone', 'Active'],
    sampleRows: [
      ['singer@example.com', 'Andrew Padgett', 'B2', 'Bass', 'Admin', '612-555-0100', 'TRUE'],
    ],
  },
  Schedule: {
    headers: [
      'Event_ID',
      'Date',
      'Time',
      'Type',
      'Title',
      'Location',
      'Snack_1_Name',
      'Snack_2_Name',
      'Snack_3_Name',
      'Snack_4_Name',
      'Notes',
    ],
    sampleRows: [
      [
        'reh-2026-11-10',
        '2026-11-10',
        '7:00 PM - 9:30 PM',
        'Rehearsal',
        'Tuesday Rehearsal',
        'Main Sanctuary',
        '',
        '',
        '',
        '',
        'Focus on movements 1-3',
      ],
    ],
  },
  Absences: {
    headers: [
      'Timestamp',
      'Event_ID',
      'Date',
      'Singer_Name',
      'Singer_Email',
      'Voice_Part',
      'Reason',
      'Submitted_By',
      'Status',
    ],
    sampleRows: [],
  },
  Concerts: {
    headers: [
      'Concert_Slug',
      'Title',
      'Dates_Display',
      'Venue_Name',
      'Venue_Address',
      'Description',
      'TT_Event_Series_ID',
      'Status',
      'Hero_Image_URL',
    ],
    sampleRows: [
      [
        'winter-2026',
        'Light in the Winter Dark',
        'Sat Dec 12 (7:30 PM) & Sun Dec 13 (3:00 PM)',
        'Cathedral Sanctuary',
        'Minneapolis, MN',
        'Join us for an evening of choral masterworks.',
        'DEMO_SERIES_ID',
        'On_Sale',
        '',
      ],
    ],
  },
  Config: {
    headers: ['Key', 'Value'],
    sampleRows: [
      ['Choir_Name', 'Kantorei'],
      ['Conductor_Email', 'adam.reinwald@kantorei.net'],
      ['Manager_Email', 'maggieakhavan@gmail.com'],
      ['Repertoire_Drive_Folder_ID', '1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc'],
      ['Handbook_Google_Doc_ID', ''],
      ['Strategic_Plan_Google_Doc_ID', ''],
      ['Season_Pass_TT_Widget_URL', 'DEMO'],
      ['Portal_Announcement', 'Welcome to the Kantorei Singer Portal.'],
      ['Calendar_Timezone', 'America/Chicago'],
      ['YouTube_URL', 'https://www.youtube.com/@kantoreiMN'],
      ['Instagram_URL', 'https://www.instagram.com/kantorei_mn'],
      ['Facebook_URL', 'https://www.facebook.com/kantoreimn'],
    ],
  },
  Media: {
    headers: ['Media_ID', 'Title', 'Subtitle', 'YouTube_URL', 'Category', 'Description'],
    sampleRows: [],
  },
  Seating_Charts: {
    headers: [
      'Chart_ID',
      'Season',
      'Concert_Slug',
      'Title',
      'Description',
      'Status',
      'Layout_JSON',
      'Created_At',
      'Updated_At',
    ],
    sampleRows: [],
  },
  Snacks: {
    headers: ['Event_ID', 'Slot', 'Singer_Name', 'Item', 'Updated_At'],
    sampleRows: [],
  },
};

if (!clientEmail || !privateKeyRaw || !sheetId || sheetId === 'DEMO') {
  console.log('ℹ️   Running in DEMO mode or missing Google credentials.');
  console.log('   Here is the canonical schema layout for the Master Sheet:\n');
  for (const [tab, spec] of Object.entries(SCHEMA_SPEC)) {
    console.log(`   📄 [${tab}]`);
    console.log(`      Columns: ${spec.headers.join(', ')}\n`);
  }
  console.log('Set your credentials in .env to provision live sheets automatically.\n');
  process.exit(0);
}

async function getAccessToken() {
  const normalizedPem = privateKeyRaw.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  const payload = await res.json();
  return payload.access_token;
}

async function run() {
  try {
    process.stdout.write('🔑 Authenticating with Google Cloud...');
    const token = await getAccessToken();
    console.log(' Connected!\n');

    console.log(`🔍 Inspecting Google Spreadsheet ID: ${sheetId}...`);
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Failed to read spreadsheet metadata (${metaRes.status}): ${errText}`);
    }

    const meta = await metaRes.json();
    console.log(`   Spreadsheet Title: "${meta.properties?.title || 'Master Sheet'}"`);

    const existingSheets = meta.sheets || [];
    const sheetMap = new Map();
    for (const s of existingSheets) {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }

    console.log(`   Existing Tabs: ${Array.from(sheetMap.keys()).join(', ')}\n`);

    for (const [tabName, spec] of Object.entries(SCHEMA_SPEC)) {
      if (!sheetMap.has(tabName)) {
        console.log(`➕ Creating missing tab [${tabName}]...`);

        // 1. Add sheet
        const addRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: tabName,
                      gridProperties: {
                        frozenRowCount: 1,
                      },
                    },
                  },
                },
              ],
            }),
          }
        );

        if (!addRes.ok) {
          console.error(`   ⚠️ Failed to create sheet [${tabName}]:`, await addRes.text());
          continue;
        }

        // 2. Write headers & default rows
        const valuesToWrite = [spec.headers, ...(spec.sampleRows || [])];
        const writeRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1`
          )}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${tabName}!A1`,
              majorDimension: 'ROWS',
              values: valuesToWrite,
            }),
          }
        );

        if (writeRes.ok) {
          console.log(`   ✅ Created [${tabName}] with ${spec.headers.length} canonical headers.`);
        }
      } else {
        // Tab exists: check headers
        const headRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1:Z1`
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (headRes.ok) {
          const headData = await headRes.json();
          const currentHeaders = headData.values?.[0] || [];
          const missing = spec.headers.filter(
            (h) => !currentHeaders.some((ch) => ch.trim().toLowerCase() === h.toLowerCase())
          );

          if (missing.length === 0) {
            console.log(`✅ [${tabName}] is healthy (all ${spec.headers.length} headers present).`);
          } else {
            console.log(`⚠️  [${tabName}] is missing columns: ${missing.join(', ')}`);
            // Non-destructively append missing column headers to row 1
            const updatedHeaders = [...currentHeaders, ...missing];
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
                `${tabName}!A1`
              )}?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  range: `${tabName}!A1`,
                  majorDimension: 'ROWS',
                  values: [updatedHeaders],
                }),
              }
            );
            console.log(`   ✅ Appended missing columns to [${tabName}].`);
          }
        }
      }
    }

    console.log('\n======================================================');
    console.log('🎉 Google Sheet Schema Provisioning Complete!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

run();

