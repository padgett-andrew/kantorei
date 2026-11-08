import type { APIRoute } from 'astro';
import {
  DEV_ROLE_EMAIL_COOKIE,
  DEV_SIGNOUT_COOKIE,
  matchRosterEmail,
  SESSION_COOKIE,
} from '../../../lib/auth';
import { isDevPreviewEnabled } from '../../../lib/env';
import { getRoster } from '../../../lib/google';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (!isDevPreviewEnabled(locals)) {
    return new Response(JSON.stringify({ error: 'Dev preview disabled.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const targetEmail = body.email?.trim().toLowerCase();
  const roster = await getRoster(locals);
  const singer = roster.find(
    (s) => matchRosterEmail(s.email, targetEmail || '') && s.active
  );

  if (!singer) {
    return new Response(JSON.stringify({ error: 'Selected demo singer not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
  cookies.delete(DEV_SIGNOUT_COOKIE, { path: '/' });
  const maxAge = 60 * 60 * 24 * 7;
  cookies.set(DEV_ROLE_EMAIL_COOKIE, singer.email, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  });

  return new Response(JSON.stringify({ ok: true, singer }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

