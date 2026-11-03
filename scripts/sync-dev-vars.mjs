#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
const devVarsPath = path.resolve(process.cwd(), '.dev.vars');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found to sync.');
  process.exit(0);
}

const content = fs.readFileSync(envPath, 'utf8');

const banner = `# ==============================================================================
# CLOUDFLARE WORKERS LOCAL PREVIEW VARS (.dev.vars)
# Generated automatically from .env by: npm run env:sync-dev
# Used by 'wrangler dev' (npm run preview). This file is git-ignored.
# ==============================================================================

`;

fs.writeFileSync(devVarsPath, banner + content, 'utf8');
console.log('✅ Synchronized .env -> .dev.vars for Cloudflare Workers preview.');

