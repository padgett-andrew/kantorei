// public/sw.js — Kantorei Singer Portal Offline Service Worker
const CACHE_NAME = 'kantorei-sw-v1';
const OFFLINE_FALLBACK_URL = '/offline.html';

const CORE_PRECACHE_URLS = [
  OFFLINE_FALLBACK_URL,
  '/',
  '/portal',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/images/kantorei-logo-transparent.webp',
  '/images/kantorei-logo-transparent.png',
];

// Install: pre-cache offline fallback and core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_PRECACHE_URLS))
      .catch((err) => {
        console.warn('[SW] Core precache failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate: clean up outdated caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('kantorei-sw-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Helper: fetch with an explicit timeout to prevent hanging on zombie/dead Wi-Fi connections
function fetchWithTimeout(request, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal })
    .then((response) => {
      clearTimeout(timer);
      return response;
    })
    .catch((err) => {
      clearTimeout(timer);
      throw err;
    });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Cache Google Fonts stylesheets & woff2 files for offline typography
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open('kantorei-fonts-v1').then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // For other requests, only intercept same-origin HTTP/HTTPS GET requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip dynamic authentication and music streaming endpoints
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/music/')) {
    return;
  }

  // 1. Static Assets (/_astro/*, CSS, JS, images, fonts): Cache-First with background refresh
  const isStaticAsset =
    url.pathname.startsWith('/_astro/') ||
    /\.(woff2?|png|svg|webp|ico|css|js)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            }
            return networkRes;
          })
          .catch(() => cached || new Response('', { status: 408 }));
      })
    );
    return;
  }

  // 2. Portal & Public Navigation HTML: Stale-While-Revalidate with 2.5s Circuit Breaker
  const isHtmlNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isHtmlNavigation) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Network fetch promise with fast 2.5s timeout circuit breaker
        const networkFetchPromise = fetchWithTimeout(request, 2500)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              cache.put(request, networkRes.clone());
            }
            return networkRes;
          })
          .catch(async () => {
            if (cachedResponse) {
              return cachedResponse;
            }
            const fallback = await cache.match(OFFLINE_FALLBACK_URL);
            return fallback || new Response('Offline in rehearsal space. Please reconnect to Wi-Fi.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
          });

        // If we already have a cached copy of this portal page, return it immediately (< 20ms)
        // and let networkFetchPromise update the cache in the background
        if (cachedResponse) {
          event.waitUntil(networkFetchPromise);
          return cachedResponse;
        }

        // First time viewing this page: wait for network or fall back to offline page
        return networkFetchPromise;
      })
    );
    return;
  }
});
