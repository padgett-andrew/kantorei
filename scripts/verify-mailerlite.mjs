#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

const dotEnv = loadDotEnv();
const env = { ...process.env };
for (const [k, v] of Object.entries(dotEnv)) {
  if (v !== '') env[k] = v;
}

const apiKey = (env.MAILERLITE_API_KEY || '').trim();
const groupId = (env.MAILERLITE_GROUP_ID || '').trim();

console.log('\n======================================================');
console.log(' 📬  KANTOREI MAILERLITE CONNECTION VERIFIER');
console.log('======================================================\n');

if (!apiKey) {
  console.log('❌ MAILERLITE_API_KEY is empty in .env');
  process.exit(1);
}

console.log('🔑 Authenticating with MailerLite API...');

try {
  // 1. Test authentication by fetching subscriber count / groups
  const res = await fetch('https://connect.mailerlite.com/api/groups', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.log(`❌ MailerLite authentication failed (HTTP ${res.status}):`);
    console.log(`   ${errorText}\n`);
    process.exit(1);
  }

  const data = await res.json();
  const groups = data.data || [];

  console.log('✅ MailerLite connection successful!\n');
  console.log(`📊 Subscriber Groups Found: ${groups.length}`);

  if (groups.length > 0) {
    for (const g of groups) {
      console.log(`   • ${g.name} (ID: ${g.id}) — ${g.total} subscriber(s)`);
    }
  } else {
    console.log('   (No subscriber groups created yet in MailerLite.)');
  }

  if (groupId) {
    const matched = groups.find((g) => g.id === groupId);
    if (matched) {
      console.log(`\n🎯 Active Target Group: "${matched.name}" (ID: ${groupId})`);
    } else {
      console.log(`\n⚠️  Configured MAILERLITE_GROUP_ID="${groupId}" was not found among available groups.`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 MAILERLITE API IS READY FOR FRIENDS OF KANTOREI!');
  console.log('======================================================\n');
} catch (err) {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
}

