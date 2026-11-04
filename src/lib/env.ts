import { z } from 'zod';

export type EnvBag = Record<string, string | undefined>;

export const EnvironmentModeSchema = z.enum(['development', 'preview', 'production']);
export type EnvironmentMode = z.infer<typeof EnvironmentModeSchema>;

/**
 * Zod schema defining the expected shape and basic format of Kantorei environment variables.
 */
export const EnvSchema = z.object({
  ENVIRONMENT: EnvironmentModeSchema.optional(),
  PUBLIC_SITE_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters').optional(),
  DEV_PREVIEW_BYPASS: z.enum(['true', 'false']).or(z.literal('')).optional(),

  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional().or(z.literal('')),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_MASTER_SHEET_ID: z.string().optional(),
  REPERTOIRE_DRIVE_FOLDER_ID: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  PORTAL_FROM_EMAIL: z.string().optional(),
  SANDBOX_OVERRIDE_EMAIL: z.string().optional(),
  ABSENCE_NOTIFICATION_EMAILS: z.string().optional(),

  PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL: z.string().optional(),
  TICKET_TAILOR_API_KEY: z.string().optional(),
  YOUTUBE_CHANNEL_ID: z.string().optional(),
  PUBLIC_GIVEBUTTER_ACCOUNT_ID: z.string().optional(),
  PUBLIC_GIVEBUTTER_CAMPAIGN_ID: z.string().optional(),
  MAILERLITE_API_KEY: z.string().optional(),
  MAILERLITE_GROUP_ID: z.string().optional(),
  TICKET_TAILOR_WEBHOOK_SECRET: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;

export function parseRawEnv(raw: Record<string, unknown>) {
  return EnvSchema.safeParse(raw);
}

/**
 * All known environment variables utilized by the Kantorei platform.
 */
export const KNOWN_ENV_KEYS = [
  'AUTH_SECRET',
  'DEV_PREVIEW_BYPASS',
  'ENVIRONMENT',
  'PUBLIC_SITE_URL',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_MASTER_SHEET_ID',
  'REPERTOIRE_DRIVE_FOLDER_ID',
  'GOOGLE_CALENDAR_ID',
  'RESEND_API_KEY',
  'PORTAL_FROM_EMAIL',
  'SANDBOX_OVERRIDE_EMAIL',
  'ABSENCE_NOTIFICATION_EMAILS',
  'PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL',
  'TICKET_TAILOR_API_KEY',
  'YOUTUBE_CHANNEL_ID',
  'PUBLIC_GIVEBUTTER_ACCOUNT_ID',
  'PUBLIC_GIVEBUTTER_CAMPAIGN_ID',
  'MAILERLITE_API_KEY',
  'MAILERLITE_GROUP_ID',
  'TICKET_TAILOR_WEBHOOK_SECRET',
] as const;

export type KnownEnvKey = (typeof KNOWN_ENV_KEYS)[number] | (string & {});

export type EnvClassification = 'public' | 'secret' | 'config';

export const ENV_CLASSIFICATIONS: Record<(typeof KNOWN_ENV_KEYS)[number], EnvClassification> = {
  PUBLIC_SITE_URL: 'public',
  PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL: 'public',
  PUBLIC_GIVEBUTTER_ACCOUNT_ID: 'public',
  PUBLIC_GIVEBUTTER_CAMPAIGN_ID: 'public',

  AUTH_SECRET: 'secret',
  TICKET_TAILOR_API_KEY: 'secret',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'secret',
  GOOGLE_PRIVATE_KEY: 'secret',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  RESEND_API_KEY: 'secret',
  MAILERLITE_API_KEY: 'secret',
  TICKET_TAILOR_WEBHOOK_SECRET: 'secret',

  DEV_PREVIEW_BYPASS: 'config',
  ENVIRONMENT: 'config',
  GOOGLE_OAUTH_CLIENT_ID: 'config',
  GOOGLE_MASTER_SHEET_ID: 'config',
  REPERTOIRE_DRIVE_FOLDER_ID: 'config',
  GOOGLE_CALENDAR_ID: 'config',
  YOUTUBE_CHANNEL_ID: 'config',
  PORTAL_FROM_EMAIL: 'config',
  SANDBOX_OVERRIDE_EMAIL: 'config',
  ABSENCE_NOTIFICATION_EMAILS: 'config',
  MAILERLITE_GROUP_ID: 'config',
};

export const DEV_AUTH_SECRET_FALLBACK = 'kantorei-dev-fallback-secret-key-32chars';

/**
 * Reads an environment variable seamlessly across Cloudflare Workers runtime
 * (`locals.runtime.env`), Astro/Vite `import.meta.env`, and Node `process.env`.
 */
export function getEnv(key: KnownEnvKey, locals?: App.Locals): string {
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

/**
 * Resolves the active environment tier:
 * - 'development': local Vite / Astro dev server
 * - 'preview': PR preview builds or local `wrangler dev`
 * - 'production': live Cloudflare Worker deployment
 */
export function getEnvironmentMode(locals?: App.Locals): EnvironmentMode {
  const explicit = getEnv('ENVIRONMENT', locals).trim().toLowerCase();
  if (explicit === 'production' || explicit === 'preview' || explicit === 'development') {
    return explicit;
  }
  if (import.meta.env.DEV) {
    return 'development';
  }
  return 'production';
}

/**
 * Retrieves the cryptographic secret for session JWTs, OTP challenges, and calendar feeds.
 * In production, enforces that a valid 32+ character non-default secret is configured.
 */
export function getAuthSecret(locals?: App.Locals): string {
  const raw = getEnv('AUTH_SECRET', locals).trim();
  const mode = getEnvironmentMode(locals);

  const isInsecure =
    !raw ||
    raw === DEV_AUTH_SECRET_FALLBACK ||
    raw.startsWith('dev-kantorei-secret') ||
    raw.length < 32;

  if (isInsecure) {
    if (mode === 'production') {
      console.error(
        '[CRITICAL SECURITY VIOLATION] Insecure or missing AUTH_SECRET in production. Ensure a 32+ byte secret generated via `openssl rand -base64 32` is bound in Cloudflare.'
      );
      if (!raw) {
        throw new Error('Production environment missing AUTH_SECRET secret binding.');
      }
    }
    return raw || DEV_AUTH_SECRET_FALLBACK;
  }

  return raw;
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
  // CRITICAL INVARIANT: Mock sandbox data (demoStore with sample singers and schedules)
  // is strictly locked to local Vite development (import.meta.env.DEV === true).
  // In any deployed environment (staging / workers.dev or production / kantorei.net),
  // mock fallback is strictly prohibited.
  if (import.meta.env.DEV !== true) {
    return false;
  }
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  return (
    !sheetId ||
    sheetId === 'DEMO' ||
    sheetId === 'your-master-google-sheet-id' ||
    !hasGoogleServiceAccount(locals)
  );
}

/**
 * Strict invariant: Dev preview role switching is ONLY allowed during local Vite development.
 * Never permitted in production or preview edge deployments.
 */
export function isDevPreviewEnabled(locals?: App.Locals): boolean {
  return import.meta.env.DEV === true && getEnv('DEV_PREVIEW_BYPASS', locals) === 'true';
}

export function getCalendarId(locals?: App.Locals): string {
  const envVal = getEnv('GOOGLE_CALENDAR_ID', locals);
  return envVal ? envVal.trim() : '';
}

export interface VariableAuditResult {
  key: (typeof KNOWN_ENV_KEYS)[number];
  classification: EnvClassification;
  isSet: boolean;
  status: 'configured' | 'mock_demo' | 'missing' | 'insecure_default';
  message: string;
}

export interface EnvPolicyReport {
  mode: EnvironmentMode;
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: VariableAuditResult[];
}

/**
 * Evaluates the current runtime environment against Kantorei's environment policy.
 * Returns a structured report with errors (policy violations) and warnings (recommendations).
 */
export function validateEnvPolicy(
  locals?: App.Locals,
  targetMode?: EnvironmentMode
): EnvPolicyReport {
  const mode = targetMode || getEnvironmentMode(locals);
  const errors: string[] = [];
  const warnings: string[] = [];
  const variables: VariableAuditResult[] = [];

  for (const key of KNOWN_ENV_KEYS) {
    const rawValue = getEnv(key, locals).trim();
    const classification = ENV_CLASSIFICATIONS[key];
    const isSet = rawValue.length > 0;
    let status: VariableAuditResult['status'] = isSet ? 'configured' : 'missing';
    let message = 'Configured';

    if (!isSet) {
      status = 'missing';
      message = 'Unset';
    }

    switch (key) {
      case 'AUTH_SECRET': {
        const isDefault =
          rawValue === DEV_AUTH_SECRET_FALLBACK ||
          rawValue.startsWith('dev-kantorei-secret');
        const isShort = rawValue.length < 32;

        if (!isSet || isDefault || isShort) {
          status = isDefault ? 'insecure_default' : 'missing';
          if (mode === 'production') {
            const err = 'AUTH_SECRET in production must be a high-entropy secret >= 32 chars.';
            errors.push(err);
            message = err;
          } else {
            const warn = 'AUTH_SECRET using insecure dev default or is < 32 chars.';
            warnings.push(warn);
            message = warn;
          }
        }
        break;
      }

      case 'DEV_PREVIEW_BYPASS': {
        if (rawValue === 'true') {
          if (mode === 'production') {
            const err = 'DEV_PREVIEW_BYPASS must be false or removed in production.';
            errors.push(err);
            status = 'insecure_default';
            message = err;
          } else {
            message = 'Dev role switching active (local dev only)';
          }
        }
        break;
      }

      case 'GOOGLE_SERVICE_ACCOUNT_EMAIL': {
        const isPlaceholder = rawValue.includes('your-project') || rawValue.includes('example.com');
        if (isPlaceholder || !isSet) {
          status = isPlaceholder ? 'mock_demo' : 'missing';
          if (mode === 'production') {
            errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL is required for live Google Workspace sync.');
          } else {
            warnings.push('GOOGLE_SERVICE_ACCOUNT_EMAIL unset; running in mock demo mode.');
          }
        }
        break;
      }

      case 'GOOGLE_PRIVATE_KEY': {
        const hasPemHeaders =
          rawValue.includes('BEGIN PRIVATE KEY') && rawValue.includes('END PRIVATE KEY');
        const isPlaceholder = rawValue.includes('...') || !hasPemHeaders;

        if (!isSet || isPlaceholder) {
          status = isPlaceholder && isSet ? 'insecure_default' : 'missing';
          if (mode === 'production') {
            errors.push('GOOGLE_PRIVATE_KEY must contain a valid RS256 PEM private key.');
          }
        }
        break;
      }

      case 'GOOGLE_MASTER_SHEET_ID': {
        const id = extractGoogleId(rawValue);
        if (!id || id === 'DEMO' || id === 'your-master-google-sheet-id') {
          status = 'mock_demo';
          if (mode === 'production') {
            errors.push('GOOGLE_MASTER_SHEET_ID cannot be "DEMO" in production.');
          } else {
            message = 'Running in DEMO sheet mode with mock choir data.';
          }
        }
        break;
      }

      case 'PUBLIC_SITE_URL': {
        if (mode === 'production') {
          if (!isSet || !rawValue.startsWith('https://') || rawValue.includes('localhost')) {
            errors.push('PUBLIC_SITE_URL in production must use https:// and cannot be localhost.');
          }
        }
        break;
      }

      case 'PORTAL_FROM_EMAIL': {
        if (rawValue.toLowerCase().includes('onboarding@resend.dev')) {
          const hasSandboxOverride = Boolean(getEnv('SANDBOX_OVERRIDE_EMAIL', locals).trim());
          if (mode === 'production') {
            warnings.push(
              'PORTAL_FROM_EMAIL uses onboarding@resend.dev in production. A verified domain is recommended.'
            );
          } else if (getEnv('RESEND_API_KEY', locals) && !hasSandboxOverride) {
            warnings.push(
              'onboarding@resend.dev requires SANDBOX_OVERRIDE_EMAIL to prevent Resend bounce errors.'
            );
          }
        }
        break;
      }

      case 'SANDBOX_OVERRIDE_EMAIL': {
        if (isSet && mode === 'production') {
          warnings.push(
            `SANDBOX_OVERRIDE_EMAIL is active (${rawValue}). Absence alerts will redirect here instead of real section leaders.`
          );
        }
        break;
      }
    }

    variables.push({
      key,
      classification,
      isSet,
      status,
      message,
    });
  }

  return {
    mode,
    valid: errors.length === 0,
    errors,
    warnings,
    variables,
  };
}
