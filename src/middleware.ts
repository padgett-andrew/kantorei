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
    pathname === '/' ||
    pathname === '/concerts';

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

  // Edge CSRF Defense: Block cross-origin mutations to API endpoints
  // Webhooks verify signatures rather than browser CSRF headers; auth routes handle OAuth/OTP
  const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(context.request.method);
  const isExcludedFromCsrf =
    pathname.startsWith('/api/auth/') || pathname.startsWith('/api/webhooks/');

  if (isMutatingMethod && pathname.startsWith('/api/') && !isExcludedFromCsrf) {
    const secFetchSite = context.request.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
      return new Response(JSON.stringify({ error: 'Cross-origin mutation forbidden.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const origin = context.request.headers.get('origin');
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const isLocalDev =
          import.meta.env.DEV &&
          (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1');

        if (!isLocalDev && originUrl.host !== context.url.host) {
          return new Response(JSON.stringify({ error: 'Origin mismatch forbidden.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid origin header.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Public API endpoints that do not require an authenticated singer session
  const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/webhooks/'];
  const PUBLIC_API_EXACT = new Set([
    '/api/health',
    '/api/calendar.ics',
    '/api/auditions/submit',
    '/api/subscribe',
  ]);

  const isPublicApiRoute =
    PUBLIC_API_EXACT.has(pathname) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Gate protected /api routes
  if (pathname.startsWith('/api/') && !isPublicApiRoute) {
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

