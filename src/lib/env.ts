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

export function isSandboxSheetMode(locals?: App.Locals): boolean {
  const sheetId = getEnv('GOOGLE_MASTER_SHEET_ID', locals);
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', locals);
  const key = getEnv('GOOGLE_PRIVATE_KEY', locals);
  return (
    !sheetId ||
    sheetId === 'DEMO' ||
    sheetId === 'your-master-google-sheet-id' ||
    !email ||
    email.includes('your-project') ||
    !key ||
    key.includes('...')
  );
}

export function isDevPreviewEnabled(locals?: App.Locals): boolean {
  return import.meta.env.DEV === true && getEnv('DEV_PREVIEW_BYPASS', locals) === 'true';
}
