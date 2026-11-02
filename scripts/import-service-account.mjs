import fs from 'node:fs';
import path from 'node:path';

const argPath = process.argv[2];
if (!argPath) {
  console.error('Usage: npm run setup:key -- /path/to/service-account-key.json');
  process.exit(1);
}

const resolvedJson = path.resolve(argPath);
if (!fs.existsSync(resolvedJson)) {
  console.error(`File not found: ${resolvedJson}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(resolvedJson, 'utf8'));
if (!raw.client_email || !raw.private_key) {
  console.error('Invalid Service Account JSON: missing client_email or private_key.');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), '.env');
let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const escapedKey = raw.private_key.replace(/\r?\n/g, '\\n');

function upsertEnvLine(content, key, val) {
  const line = `${key}="${val}"`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, () => line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

envText = upsertEnvLine(envText, 'GOOGLE_SERVICE_ACCOUNT_EMAIL', raw.client_email);
envText = upsertEnvLine(envText, 'GOOGLE_PRIVATE_KEY', escapedKey);

fs.writeFileSync(envPath, envText, 'utf8');
console.log(`✅ Imported Service Account into .env:`);
console.log(`   Email: ${raw.client_email}`);
console.log(`\nNext: Share your Master Google Sheet (as Editor) with:\n   ${raw.client_email}`);

