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
console.log(' 💾  KANTOREI MASTER SHEET BACKUP UTILITY');
console.log('======================================================\n');

if (!clientEmail || !privateKeyRaw || !sheetId || sheetId === 'DEMO') {
  console.log('ℹ️   Running in DEMO mode or missing Google credentials.');
  console.log('   In production, set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,');
  console.log('   and GOOGLE_MASTER_SHEET_ID in .env to snapshot the live Google Sheet.\n');
  process.exit(0);
}

async function getAccessToken() {
  const normalizedPem = privateKeyRaw.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

async function fetchTabValues(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // Return empty array if tab doesn't exist yet (e.g. optional Snacks tab)
    return null;
  }
  const data = await res.json();
  return data.values || [];
}

async function run() {
  try {
    process.stdout.write('🔑 Authenticating with Google Cloud Service Account...');
    const token = await getAccessToken();
    console.log(' Connected!');

    console.log(`📋 Fetching tabs from Sheet ID: ${sheetId}...\n`);

    const TABS_TO_BACKUP = [
      'Roster!A1:G',
      'Schedule!A1:K',
      'Absences!A1:I',
      'Concerts!A1:I',
      'Config!A1:B',
      'Board!A1:E',
      'Leadership!A1:G',
      'Giving_Tiers!A1:E',
      'Media!A1:F',
      'Seating_Charts!A1:I',
      'Snacks!A1:E',
    ];

    const snapshot = {
      timestamp: new Date().toISOString(),
      sheetId,
      tabs: {},
    };

    for (const range of TABS_TO_BACKUP) {
      const tabName = range.split('!')[0];
      process.stdout.write(`   • Backing up [${tabName}]... `);
      const rows = await fetchTabValues(token, range);
      if (rows !== null) {
        snapshot.tabs[tabName] = rows;
        console.log(`✅ (${rows.length} rows)`);
      } else {
        console.log(`(tab not found, skipped)`);
      }
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kantorei-backup-${dateStr}.json`;
    const dest = path.join(backupsDir, filename);

    fs.writeFileSync(dest, JSON.stringify(snapshot, null, 2), 'utf8');

    console.log('\n======================================================');
    console.log(`🎉 Backup completed successfully!`);
    console.log(`📁 File saved to: backups/${filename}`);
    console.log(`🔒 Note: This file contains member data and is git-ignored.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Backup failed:', err.message);
    process.exit(1);
  }
}

run();

