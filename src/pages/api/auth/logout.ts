import type { APIRoute } from 'astro';
import { DEV_SIGNOUT_COOKIE, SESSION_COOKIE } from '../../../lib/auth';
import { isDevPreviewEnabled } from '../../../lib/env';

function handleSignOut(cookies: Parameters<APIRoute>[0]['cookies'], locals: App.Locals) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  if (isDevPreviewEnabled(locals)) {
    cookies.set(DEV_SIGNOUT_COOKIE, '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  }
}

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  handleSignOut(cookies, locals);
  return redirect('/login');
};

export const GET: APIRoute = async ({ cookies, locals, redirect }) => {
  handleSignOut(cookies, locals);
  return redirect('/login');
};

