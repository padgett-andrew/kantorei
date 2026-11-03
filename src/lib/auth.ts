import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import type { AstroCookies } from 'astro';
import { canAccessPortal, type MemberRole, type Singer } from '../types/choir';
import { getAuthSecret, getEnv, isDevPreviewEnabled } from './env';
import { getRoster } from './google';

export const SESSION_COOKIE = 'kantorei_session';
export const OTP_CHALLENGE_COOKIE = 'kantorei_otp';
export const OAUTH_STATE_COOKIE = 'kantorei_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'kantorei_oauth_verifier';
export const DEV_ROLE_EMAIL_COOKIE = 'kantorei_dev_email';
export const DEV_SIGNOUT_COOKIE = 'kantorei_dev_signed_out';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function getSecretKey(locals?: App.Locals): Uint8Array {
  const raw = getAuthSecret(locals);
  return new TextEncoder().encode(raw);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRandomUrlSafeString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function computeS256CodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function getGoogleOAuthConfig(
  requestUrl: URL,
  locals?: App.Locals
): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = getEnv('GOOGLE_OAUTH_CLIENT_ID', locals);
  const clientSecret = getEnv('GOOGLE_OAUTH_CLIENT_SECRET', locals);
  if (!clientId || !clientSecret || clientId.includes('your-google-oauth')) {
    return null;
  }
  const configuredSite = getEnv('PUBLIC_SITE_URL', locals).trim();
  const isLocalConfigured = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredSite);
  const isLocalRequest =
    requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  const siteBase =
    configuredSite && (!isLocalConfigured || isLocalRequest)
      ? configuredSite
      : requestUrl.origin;
  const redirectUri = `${siteBase.replace(/\/$/, '')}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export async function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
}): Promise<string> {
  const codeChallenge = await computeS256CodeChallenge(params.codeVerifier);
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', params.clientId);
  authUrl.searchParams.set('redirect_uri', params.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');
  return authUrl.toString();
}

export async function exchangeGoogleCodeForVerifiedEmail(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ email?: string; emailVerified?: boolean }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) {
    throw new Error('Missing id_token in Google OAuth response.');
  }

  const { payload } = await jwtVerify(data.id_token, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: params.clientId,
  });

  return {
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}

export async function createSessionToken(email: string, locals?: App.Locals): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ typ: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(normalized)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 180) // 180 days (full choral season)
    .sign(getSecretKey(locals));
}

export async function verifySessionToken(
  token: string,
  locals?: App.Locals
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(locals));
    if (payload.typ !== 'session' || typeof payload.sub !== 'string') return null;
    return payload.sub.trim().toLowerCase();
  } catch {
    return null;
  }
}

export function generateSixDigitCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = array[0] % 1_000_000;
  return String(num).padStart(6, '0');
}

export async function createOtpChallengeToken(
  email: string,
  code: string,
  locals?: App.Locals
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const secretRaw = getAuthSecret(locals);
  const digest = await sha256Hex(`${normalized}:${code}:${secretRaw}`);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ typ: 'otp', email: normalized, digest })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 10) // 10 minutes
    .sign(getSecretKey(locals));
}

export async function verifyOtpChallengeToken(params: {
  challengeToken: string;
  email: string;
  code: string;
  locals?: App.Locals;
}): Promise<boolean> {
  const { challengeToken, email, code, locals } = params;
  const normalized = email.trim().toLowerCase();
  const cleanCode = code.replace(/\s+/g, '');

  try {
    const { payload } = await jwtVerify(challengeToken, getSecretKey(locals));
    if (
      payload.typ !== 'otp' ||
      payload.email !== normalized ||
      typeof payload.digest !== 'string'
    ) {
      return false;
    }

    const secretRaw = getAuthSecret(locals);
    const expected = await sha256Hex(`${normalized}:${cleanCode}:${secretRaw}`);
    if (expected.length !== payload.digest.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ payload.digest.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string, requestUrl: URL): void {
  const isSecure = requestUrl.protocol === 'https:';
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180, // 180 days (full choral season so singers never get logged out mid-cycle)
  });
  cookies.delete(DEV_SIGNOUT_COOKIE, { path: '/' });
}

export async function resolveAuthenticatedSinger(
  cookies: AstroCookies,
  locals?: App.Locals
): Promise<{ singer: Singer | null; isDevPreview: boolean }> {
  const roster = await getRoster(locals);

  const sessionToken = cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const email = await verifySessionToken(sessionToken, locals);
    if (email) {
      const match = roster.find((s) => s.email === email && canAccessPortal(s));
      if (match) {
        return { singer: match, isDevPreview: false };
      }
    }
  }

  // Strictly honored ONLY when import.meta.env.DEV === true && DEV_PREVIEW_BYPASS === 'true'
  if (isDevPreviewEnabled(locals)) {
    const signedOut = cookies.get(DEV_SIGNOUT_COOKIE)?.value === '1';
    if (!signedOut) {
      const requestedDevEmail = cookies.get(DEV_ROLE_EMAIL_COOKIE)?.value?.trim().toLowerCase();
      const devSinger =
        (requestedDevEmail
          ? roster.find((s) => s.email === requestedDevEmail && canAccessPortal(s))
          : undefined) ??
        roster.find((s) => s.role === 'Admin' && s.active) ??
        roster.find((s) => s.active) ??
        null;

      if (devSinger) {
        return { singer: devSinger, isDevPreview: true };
      }
    }
  }

  return { singer: null, isDevPreview: false };
}

export function hasRole(singer: Singer | undefined, allowedRoles: MemberRole[]): boolean {
  if (!singer || !canAccessPortal(singer)) return false;
  return allowedRoles.includes(singer.role);
}
