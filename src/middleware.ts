import { defineMiddleware } from 'astro:middleware';
import { hasRole, resolveAuthenticatedSinger } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip static assets quickly
  if (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/favicon') ||
    /\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(pathname)
  ) {
    return next();
  }

  // Hydrate authenticated singer (with 60s cached Roster verification) for portal, login, and API routes
  const needsAuthHydration =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/api/') ||
    pathname === '/login' ||
    pathname === '/';

  if (needsAuthHydration) {
    try {
      const { singer, isDevPreview } = await resolveAuthenticatedSinger(
        context.cookies,
        context.locals
      );
      context.locals.singer = singer ?? undefined;
      context.locals.isDevPreview = isDevPreview;
    } catch (err) {
      console.error('[Middleware Auth Error]', err);
    }
  }

  // Gate all /portal routes
  if (pathname.startsWith('/portal')) {
    if (!context.locals.singer) {
      const returnTo = encodeURIComponent(pathname);
      return context.redirect(`/login?next=${returnTo}`);
    }

    if (
      pathname.startsWith('/portal/admin') &&
      !hasRole(context.locals.singer, ['Section_Leader', 'Admin'])
    ) {
      return context.redirect('/portal?error=insufficient_role');
    }
  }

  // Gate protected /api routes (excluding /api/auth/* and HMAC-verified /api/calendar.ics)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    pathname !== '/api/calendar.ics'
  ) {
    if (!context.locals.singer) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const response = await next();

  // Edge Security Headers (clickjacking defense, MIME-sniffing prevention, referrer policy)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
});

