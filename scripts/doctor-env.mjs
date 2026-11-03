#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filename) {
  const filepath = path.resolve(process.cwd(), filename);
  const map = {};
  if (!fs.existsSync(filepath)) return map;
  for (const line of fs.readFileSync(filepath, 'utf8').split(/\r?\n/)) {
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

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='))?.split('=')[1]?.toLowerCase();
const targetMode = modeArg === 'production' || modeArg === 'preview' ? modeArg : 'development';

const fileArg =
  args.find((a) => a.startsWith('--file='))?.split('=')[1] ||
  args.find((a) => !a.startsWith('--'));
const targetEnvFile = fileArg || '.env';

const dotEnv = loadEnvFile(targetEnvFile);
const devVars = loadEnvFile('.dev.vars');

// Precedence: process.env > file > .dev.vars
const env = { ...devVars, ...dotEnv, ...process.env };

function extractId(raw = '') {
  const t = raw.trim();
  const folder = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (folder) return folder[1];
  const doc = /\/d\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (doc) return doc[1];
  return t;
}

console.log('\n======================================================');
console.log(` 🎶  KANTOREI ENVIRONMENT POLICY DOCTOR`);
console.log(` Target Mode: [ ${targetMode.toUpperCase()} ]`);
console.log('======================================================\n');

const errors = [];
const warnings = [];
const infos = [];

function check(title, condition, { error, warning, info } = {}) {
  if (condition) {
    console.log(`  ✅  ${title}`);
  } else if (error) {
    console.log(`  ❌  ${title}: ${error}`);
    errors.push(`${title}: ${error}`);
  } else if (warning) {
    console.log(`  ⚠️   ${title}: ${warning}`);
    warnings.push(`${title}: ${warning}`);
  } else if (info) {
    console.log(`  ℹ️   ${title}: ${info}`);
    infos.push(`${title}: ${info}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Core Platform & Stateless Auth
// -----------------------------------------------------------------------------
console.log('1. Core Platform & Stateless Auth');

const authSecret = (env.AUTH_SECRET || '').trim();
const isDefaultSecret =
  authSecret === 'kantorei-dev-fallback-secret-key-32chars' ||
  authSecret.startsWith('dev-kantorei-secret');
const hasAuthSecret = Boolean(authSecret) && authSecret.length >= 32 && !isDefaultSecret;

if (targetMode === 'production') {
  check('AUTH_SECRET', hasAuthSecret, {
    error: 'Must be a 32+ character high-entropy secret. Generate with: openssl rand -base64 32',
  });
} else {
  check('AUTH_SECRET', hasAuthSecret, {
    warning: isDefaultSecret
      ? 'Using default development fallback key. Safe for local dev, but generate a secret for production.'
      : 'AUTH_SECRET is empty or < 32 characters. Local dev will use fallback.',
  });
}

const siteUrl = (env.PUBLIC_SITE_URL || '').trim();
if (targetMode === 'production') {
  const isHttpsProd = siteUrl.startsWith('https://') && !siteUrl.includes('localhost');
  check('PUBLIC_SITE_URL', isHttpsProd, {
    error: `Must use https:// and production domain (current: "${siteUrl || 'unset'}").`,
  });
} else {
  check('PUBLIC_SITE_URL', Boolean(siteUrl), {
    info: `Local site URL set to "${siteUrl || 'http://localhost:4321'}".`,
  });
}

const bypass = (env.DEV_PREVIEW_BYPASS || '').trim();
if (targetMode === 'production') {
  check('DEV_PREVIEW_BYPASS disabled', bypass !== 'true', {
    error: 'DEV_PREVIEW_BYPASS must NEVER be true in production secrets!',
  });
} else {
  check('DEV_PREVIEW_BYPASS (Dev Only)', true, {
    info: bypass === 'true' ? 'Active: Dev role switcher enabled' : 'Disabled: Normal login required',
  });
}

// -----------------------------------------------------------------------------
// 2. Google Cloud Service Account & CMS
// -----------------------------------------------------------------------------
console.log('\n2. Google Cloud Service Account & CMS');

const saEmail = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const isPlaceholderEmail = !saEmail || saEmail.includes('your-project') || saEmail.includes('example.com');

const privateKey = (env.GOOGLE_PRIVATE_KEY || '').trim();
const hasPemHeaders = privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY');
const isPlaceholderKey = !privateKey || privateKey.includes('...') || !hasPemHeaders;

const sheetId = extractId(env.GOOGLE_MASTER_SHEET_ID || '');
const isDemoSheet = !sheetId || sheetId === 'DEMO' || sheetId === 'your-master-google-sheet-id';

if (targetMode === 'production') {
  check('GOOGLE_SERVICE_ACCOUNT_EMAIL', !isPlaceholderEmail, {
    error: 'Production requires a valid Google Cloud Service Account email.',
  });
  check('GOOGLE_PRIVATE_KEY', !isPlaceholderKey, {
    error: 'Production requires a valid RS256 PEM private key.',
  });
  check('GOOGLE_MASTER_SHEET_ID', !isDemoSheet, {
    error: 'GOOGLE_MASTER_SHEET_ID cannot be "DEMO" in production.',
  });
} else {
  if (isPlaceholderEmail || isPlaceholderKey || isDemoSheet) {
    check('Google Workspace Connection', false, {
      info: 'Running in SANDBOX / DEMO mode. Realistic mock data will be used automatically.',
    });
  } else {
    check('Google Workspace Connection', true);
  }
}

const driveFolder = extractId(env.REPERTOIRE_DRIVE_FOLDER_ID || '');
check('REPERTOIRE_DRIVE_FOLDER_ID', Boolean(driveFolder), {
  warning: 'Unset: Portal will use default repertoire folder fallback.',
});

// -----------------------------------------------------------------------------
// 3. Email & Communications (Resend)
// -----------------------------------------------------------------------------
console.log('\n3. Email & Communications (Resend)');

const resendApiKey = (env.RESEND_API_KEY || '').trim();
const fromEmail = (env.PORTAL_FROM_EMAIL || 'Kantorei Portal <onboarding@resend.dev>').trim();
const sandboxOverride = (env.SANDBOX_OVERRIDE_EMAIL || '').trim();

if (!resendApiKey) {
  check('RESEND_API_KEY', false, {
    info: 'Unset: Emails disabled; OTP verification code will display on-screen during local dev.',
  });
} else {
  check('RESEND_API_KEY', true);

  if (fromEmail.toLowerCase().includes('onboarding@resend.dev')) {
    if (!sandboxOverride) {
      check('Resend Sandbox Configuration', false, {
        warning:
          'Using onboarding@resend.dev without SANDBOX_OVERRIDE_EMAIL. Emails will bounce unless sent to the registered Resend account.',
      });
    } else {
      check('Resend Sandbox Mode', true, {
        info: `All emails redirected to ${sandboxOverride}`,
      });
    }
  } else {
    check(`Sender Domain (${fromEmail})`, true);
  }

  if (targetMode === 'production' && sandboxOverride) {
    check('Production Email Routing', false, {
      warning: `SANDBOX_OVERRIDE_EMAIL is active in production (${sandboxOverride}). Live absences will redirect here instead of Section Leaders.`,
    });
  }
}

// -----------------------------------------------------------------------------
// 4. Box Office & Fundraising Embeds
// -----------------------------------------------------------------------------
console.log('\n4. Box Office & Fundraising Embeds');

const ttUrl = (env.PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL || '').trim();
check('Ticket Tailor Box Office URL', Boolean(ttUrl), {
  info: 'Defaulting to demo ticket checkout sandbox.',
});

const gbAccount = (env.PUBLIC_GIVEBUTTER_ACCOUNT_ID || '').trim();
const gbCampaign = (env.PUBLIC_GIVEBUTTER_CAMPAIGN_ID || '').trim();
check('Givebutter Widget Config', Boolean(gbAccount && gbCampaign), {
  info: 'Defaulting to interactive donation sandbox preview.',
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n------------------------------------------------------');
if (errors.length > 0) {
  console.log(`❌  ENVIRONMENT POLICY VIOLATION: ${errors.length} critical issue(s) found for [${targetMode.toUpperCase()}].`);
  for (const err of errors) {
    console.log(`    • ${err}`);
  }
  console.log('------------------------------------------------------\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`⚠️   ENVIRONMENT CHECK PASSED with ${warnings.length} warning(s) for [${targetMode.toUpperCase()}].`);
  for (const w of warnings) {
    console.log(`    • ${w}`);
  }
  console.log('------------------------------------------------------\n');
  process.exit(0);
} else {
  console.log(`🎉  ENVIRONMENT HEALTHY! All policies satisfied for [${targetMode.toUpperCase()}].`);
  console.log('------------------------------------------------------\n');
  process.exit(0);
}

