import type { APIRoute } from 'astro';
import {
  createSessionToken,
  exchangeGoogleCodeForVerifiedEmail,
  getGoogleOAuthConfig,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  setSessionCookie,
} from '../../../../lib/auth';
import { canAccessPortal } from '../../../../types/choir';
import { getRoster } from '../../../../lib/google';

export const GET: APIRoute = async ({ url, cookies, locals, redirect }) => {
  const config = getGoogleOAuthConfig(url, locals);
  if (!config) {
    return redirect('/login?error=oauth_not_configured');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookies.get(OAUTH_VERIFIER_COOKIE)?.value;

  cookies.delete(OAUTH_STATE_COOKIE, { path: '/' });
  cookies.delete(OAUTH_VERIFIER_COOKIE, { path: '/' });

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return redirect('/login?error=oauth_state_mismatch');
  }

  try {
    const { email, emailVerified } = await exchangeGoogleCodeForVerifiedEmail({
      code,
      codeVerifier,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });

    if (!email || emailVerified === false) {
      return redirect('/login?error=unverified_email');
    }

    const roster = await getRoster(locals);
    const singer = roster.find((s) => s.email === email && canAccessPortal(s));
    if (!singer) {
      return redirect('/login?error=not_on_roster');
    }

    const sessionJwt = await createSessionToken(singer.email, locals);
    setSessionCookie(cookies, sessionJwt, url);

    return redirect('/portal');
  } catch (err) {
    console.error('[Google OAuth Callback Error]', err);
    return redirect('/login?error=oauth_exchange_failed');
  }
};
