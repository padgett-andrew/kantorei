export type EnvBag = Record<string, string | undefined>;

/**
 * Reads an environment variable seamlessly across Cloudflare Workers runtime
 * (`locals.runtime.env`), Astro/Vite `import.meta.env`, and Node `process.env`.
 */
export function getEnv(key: string, locals?: App.Locals): string {
  const runtimeVal = locals?.runtime?.env?.[key];
  if (typeof runtimeVal === 'string' && runtimeVal.length > 0) {
    return runtimeVal;
  }

  const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const metaVal = metaEnv?.[key];
  if (typeof metaVal === 'string' && metaVal.length > 0) {
    return metaVal;
  }

  const nodeEnv = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  if (nodeEnv?.[key]) {
    return nodeEnv[key] as string;
  }

  return '';
}

export function extractGoogleId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'DEMO') return trimmed;

  // Match /folders/<id> or /d/<id> in pasted Google Drive / Sheets / Docs URLs
  const folderMatch = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(trimmed);
  if (folderMatch) return folderMatch[1];

  const docMatch = /\/d\/([a-zA-Z0-9_-]{15,})/.exec(trimmed);
  if (docMatch) return docMatch[1];

  const idParamMatch = /[?&]id=([a-zA-Z0-9_-]{15,})/.exec(trimmed);
  if (idParamMatch) return idParamMatch[1];

  return trimmed;
}

export function hasGoogleServiceAccount(locals?: App.Locals): boolean {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', locals);
  const key = getEnv('GOOGLE_PRIVATE_KEY', locals);
  return (
    Boolean(email) &&
    !email.includes('your-project') &&
    Boolean(key) &&
    !key.includes('...')
  );
}

export function isSandboxSheetMode(locals?: App.Locals): boolean {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  return (
    !sheetId ||
    sheetId === 'DEMO' ||
    sheetId === 'your-master-google-sheet-id' ||
    !hasGoogleServiceAccount(locals)
  );
}

export function isDevPreviewEnabled(locals?: App.Locals): boolean {
  return import.meta.env.DEV === true && getEnv('DEV_PREVIEW_BYPASS', locals) === 'true';
}

export function getCalendarId(locals?: App.Locals): string {
  const envVal = getEnv('GOOGLE_CALENDAR_ID', locals);
  return envVal ? envVal.trim() : '';
}
