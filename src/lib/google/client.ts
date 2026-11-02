import { importPKCS8, SignJWT } from 'jose';
import { extractGoogleId, getEnv } from '../env';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(locals?: App.Locals): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const clientEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', locals);
  const rawPrivateKey = getEnv('GOOGLE_PRIVATE_KEY', locals);
  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing Google Service Account credentials.');
  }

  const normalizedPem = rawPrivateKey.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const nowSec = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: GOOGLE_SCOPES })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth token exchange failed (${res.status}): ${errText}`);
  }

  const payload = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 120) * 1000,
  };
  return payload.access_token;
}

export async function readSheetValues(range: string, locals?: App.Locals): Promise<string[][]> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets read failed for ${range} (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

export async function writeSheetValues(
  range: string,
  values: string[][],
  locals?: App.Locals
): Promise<void> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets write failed for ${range} (${res.status}): ${errText}`);
  }
}

export async function appendSheetValues(
  range: string,
  values: string[][],
  locals?: App.Locals
): Promise<void> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ majorDimension: 'ROWS', values }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets append failed for ${range} (${res.status}): ${errText}`);
  }
}

export function padRow(row: string[], length: number): string[] {
  const out = new Array<string>(length).fill('');
  for (let i = 0; i < length; i++) {
    out[i] = row[i] ?? '';
  }
  return out;
}

export function isBlankRow(row: string[]): boolean {
  return row.every((cell) => !cell || cell.trim() === '');
}

