import type { APIRoute } from 'astro';
import {
  buildGoogleAuthorizationUrl,
  generateRandomUrlSafeString,
  getGoogleOAuthConfig,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from '../../../lib/auth';

export const GET: APIRoute = async ({ url, cookies, locals, redirect }) => {
  const config = getGoogleOAuthConfig(url, locals);
  if (!config) {
    return redirect('/login?error=oauth_not_configured');
  }

  const state = generateRandomUrlSafeString(24);
  const codeVerifier = generateRandomUrlSafeString(32);
  const authUrl = await buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
    codeVerifier,
  });

  const isSecure = url.protocol === 'https:';
  const cookieOpts = {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    maxAge: 60 * 10,
  };

  cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  cookies.set(OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOpts);

  return redirect(authUrl);
};
