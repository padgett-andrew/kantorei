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
const apiKey = (env.RESEND_API_KEY || '').trim();
const fromEmail = (env.PORTAL_FROM_EMAIL || 'Kantorei Portal <onboarding@resend.dev>').trim();
const sandboxTo = (env.SANDBOX_OVERRIDE_EMAIL || '').trim();

console.log('--- Kantorei Resend Email Connection Doctor ---\n');

if (!apiKey) {
  console.log('⚠️  RESEND_API_KEY is empty in .env.');
  console.log('   Paste your re_... key and SANDBOX_OVERRIDE_EMAIL into .env first.\n');
  process.exit(0);
}

if (fromEmail.toLowerCase().includes('onboarding@resend.dev') && !sandboxTo) {
  console.log('⚠️  Using onboarding@resend.dev without SANDBOX_OVERRIDE_EMAIL.');
  console.log(
    '   Please set SANDBOX_OVERRIDE_EMAIL="your-resend-login@gmail.com" in .env so Resend allows sandbox delivery.\n'
  );
  process.exit(1);
}

const recipient = sandboxTo || 'delivered@resend.dev';
console.log(`Sending test portal email via Resend...`);
console.log(`   From: ${fromEmail}`);
console.log(`   To:   ${recipient}`);

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: fromEmail,
    to: [recipient],
    subject: '[Kantorei Portal] Resend Email Integration Verified!',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;color:#18181b;">
        <div style="background:#132235;color:#faf8f5;padding:20px 24px;border-radius:12px 12px 0 0;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#e49c6e;">Kantorei Singer Portal</p>
          <h2 style="margin:6px 0 0;font-size:20px;">Resend Email Delivery Active</h2>
        </div>
        <div style="border:1px solid #e4e4e7;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
          <p style="margin:0 0 12px;">Your <strong>Kantorei Singer Portal</strong> is now connected to Resend!</p>
          <ul style="margin:0;padding-left:18px;line-height:1.6;color:#3f3f46;">
            <li><strong>6-Digit Login Codes (OTP)</strong> for non-Gmail singers will arrive like this.</li>
            <li><strong>Absence Notifications</strong> will route dynamically to Section Leaders + Adam + Maggie (redirected safely to <code>${recipient}</code> while in sandbox mode).</li>
          </ul>
        </div>
      </div>
    `,
  }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`\n❌ Resend returned HTTP ${res.status}:`, data);
  process.exit(1);
}

console.log(`\n✅ Delivered! Resend Email ID: ${data.id}`);
console.log(`   Check your inbox at ${recipient}!`);

