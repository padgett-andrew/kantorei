import type { APIRoute } from 'astro';
import { extractGoogleId, getEnv } from '../../lib/env';
import { getGoogleAccessToken } from '../../lib/google/client';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  services: {
    googleSheets: { status: 'ok' | 'error' | 'skipped'; latencyMs?: number; message?: string };
    googleDrive: { status: 'ok' | 'error' | 'skipped'; latencyMs?: number; message?: string };
    resend: { status: 'ok' | 'error' | 'skipped'; latencyMs?: number; message?: string };
    ticketTailor?: { status: 'ok' | 'error' | 'skipped'; latencyMs?: number; message?: string };
    mailerLite?: { status: 'ok' | 'error' | 'skipped'; latencyMs?: number; message?: string };
  };
}

export const GET: APIRoute = async ({ locals }) => {
  const isDemo = getEnv('GOOGLE_SHEET_ID', locals) === 'DEMO' || !getEnv('GOOGLE_SHEET_ID', locals);

  const services: HealthCheckResult['services'] = {
    googleSheets: { status: 'skipped' },
    googleDrive: { status: 'skipped' },
    resend: { status: 'skipped' },
  };

  let hasCriticalError = false;
  let hasDegradedError = false;

  // 1. Check Google Sheets & Service Account
  const rawSheetId = getEnv('GOOGLE_SHEET_ID', locals);
  const sheetId = extractGoogleId(rawSheetId);
  const clientEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', locals);
  const privateKey = getEnv('GOOGLE_PRIVATE_KEY', locals);

  if (isDemo || !clientEmail || !privateKey || sheetId === 'DEMO') {
    services.googleSheets = {
      status: 'ok',
      message: 'Demo mode active; using mock data store.',
    };
  } else {
    const t0 = Date.now();
    try {
      const token = await getGoogleAccessToken(locals);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,properties.title`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const latencyMs = Date.now() - t0;

      if (res.ok) {
        services.googleSheets = { status: 'ok', latencyMs };
      } else {
        hasCriticalError = true;
        const errText = await res.text();
        services.googleSheets = {
          status: 'error',
          latencyMs,
          message: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
        };
      }
    } catch (err: any) {
      hasCriticalError = true;
      services.googleSheets = {
        status: 'error',
        latencyMs: Date.now() - t0,
        message: err?.message || 'Failed to authenticate Google Service Account.',
      };
    }
  }

  // 2. Check Google Drive Repertoire Folder
  const rawDriveId = getEnv('REPERTOIRE_DRIVE_FOLDER_ID', locals);
  const driveId = extractGoogleId(rawDriveId);

  if (isDemo || !clientEmail || !privateKey || driveId === 'DEMO' || !driveId) {
    services.googleDrive = {
      status: 'ok',
      message: 'Demo mode or drive folder unconfigured.',
    };
  } else {
    const t0 = Date.now();
    try {
      const token = await getGoogleAccessToken(locals);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${driveId}?fields=id,name&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const latencyMs = Date.now() - t0;

      if (res.ok) {
        services.googleDrive = { status: 'ok', latencyMs };
      } else {
        hasDegradedError = true;
        const errText = await res.text();
        services.googleDrive = {
          status: 'error',
          latencyMs,
          message: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
        };
      }
    } catch (err: any) {
      hasDegradedError = true;
      services.googleDrive = {
        status: 'error',
        latencyMs: Date.now() - t0,
        message: err?.message || 'Failed to connect to Google Drive.',
      };
    }
  }

  // 3. Check Resend API Key
  const resendKey = getEnv('RESEND_API_KEY', locals).trim();
  if (!resendKey || resendKey.startsWith('DEMO')) {
    services.resend = {
      status: 'ok',
      message: 'Resend API key unset; sandbox OTP on-screen fallback active.',
    };
  } else {
    const t0 = Date.now();
    try {
      const res = await fetch('https://api.resend.com/emails?limit=1', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      const latencyMs = Date.now() - t0;

      if (res.ok) {
        services.resend = { status: 'ok', latencyMs };
      } else {
        const body = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
        // A sending-restricted key returns 401 with name: "restricted_api_key", which proves the key is valid!
        if (body?.name === 'restricted_api_key') {
          services.resend = { status: 'ok', latencyMs };
        } else {
          hasDegradedError = true;
          services.resend = {
            status: 'error',
            latencyMs,
            message: `HTTP ${res.status}: ${body?.message || 'Invalid Resend API Key.'}`,
          };
        }
      }
    } catch (err: any) {
      hasDegradedError = true;
      services.resend = {
        status: 'error',
        latencyMs: Date.now() - t0,
        message: err?.message || 'Failed to ping Resend API.',
      };
    }
  }

  // 4. Check Ticket Tailor (Optional)
  const ttKey = getEnv('TICKET_TAILOR_API_KEY', locals).trim();
  if (ttKey && ttKey !== 'DEMO') {
    const t0 = Date.now();
    try {
      const authHeader = 'Basic ' + btoa(ttKey + ':');
      const res = await fetch('https://api.tickettailor.com/v1/events?limit=1', {
        headers: { Authorization: authHeader, Accept: 'application/json' },
      });
      const latencyMs = Date.now() - t0;
      if (res.ok) {
        services.ticketTailor = { status: 'ok', latencyMs };
      } else {
        hasDegradedError = true;
        services.ticketTailor = {
          status: 'error',
          latencyMs,
          message: `HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      services.ticketTailor = {
        status: 'error',
        message: err?.message || 'Ticket Tailor connection failed.',
      };
    }
  }

  // 5. Check MailerLite (Optional)
  const mailerKey = getEnv('MAILERLITE_API_KEY', locals).trim();
  if (mailerKey && mailerKey !== 'DEMO') {
    const t0 = Date.now();
    try {
      const res = await fetch('https://connect.mailerlite.com/api/groups?limit=1', {
        headers: { Authorization: `Bearer ${mailerKey}`, Accept: 'application/json' },
      });
      const latencyMs = Date.now() - t0;
      if (res.ok) {
        services.mailerLite = { status: 'ok', latencyMs };
      } else {
        hasDegradedError = true;
        services.mailerLite = {
          status: 'error',
          latencyMs,
          message: `HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      services.mailerLite = {
        status: 'error',
        message: err?.message || 'MailerLite connection failed.',
      };
    }
  }

  const overallStatus: HealthCheckResult['status'] = hasCriticalError
    ? 'unhealthy'
    : hasDegradedError
      ? 'degraded'
      : 'healthy';

  const statusCode = hasCriticalError ? 503 : 200;

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: import.meta.env.DEV ? 'development' : 'production',
    services,
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};
