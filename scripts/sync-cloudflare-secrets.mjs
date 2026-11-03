import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const targetFile =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) || '.env';
const envPath = resolve(process.cwd(), targetFile);

if (!existsSync(envPath)) {
  console.error(`❌ File not found: ${targetFile}`);
  process.exit(1);
}

function parseDotEnv(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const parsed = parseDotEnv(envPath);
const SKIP_KEYS = new Set(['DEV_PREVIEW_BYPASS']);
const secretsToUpload = {};

for (const [key, value] of Object.entries(parsed)) {
  if (SKIP_KEYS.has(key)) continue;
  if (!value) continue;
  // Never push a localhost PUBLIC_SITE_URL to Cloudflare; runtime auto-detects origin
  if (key === 'PUBLIC_SITE_URL' && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value)) {
    continue;
  }
  secretsToUpload[key] = value;
}

if (
  secretsToUpload.AUTH_SECRET &&
  (secretsToUpload.AUTH_SECRET.length < 32 ||
    secretsToUpload.AUTH_SECRET === 'kantorei-dev-fallback-secret-key-32chars' ||
    secretsToUpload.AUTH_SECRET.startsWith('dev-kantorei-secret'))
) {
  console.error('❌ Cannot push secrets to Cloudflare: AUTH_SECRET is using an insecure dev default.');
  console.error('   Generate a production 32+ byte secret using: openssl rand -base64 32\n');
  process.exit(1);
}

const keys = Object.keys(secretsToUpload);
if (keys.length === 0) {
  console.error('⚠️  No non-empty production variables found in .env.');
  process.exit(1);
}

console.log(`\n🔐 Uploading ${keys.length} environment variables to Cloudflare Workers (kantorei-web):`);
for (const k of keys) {
  console.log(`   • ${k}`);
}
console.log('');

const wranglerBin = resolve(process.cwd(), 'node_modules/wrangler/bin/wrangler.js');
const result = spawnSync(process.execPath, [wranglerBin, 'secret', 'bulk'], {
  input: JSON.stringify(secretsToUpload),
  stdio: ['pipe', 'inherit', 'inherit'],
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('\n✅ Cloudflare Worker secrets synced successfully!');
