/**
 * PUNICODEX — Service Worker
 * Lightweight: precache shell pages, stale-while-revalidate for assets.
 * Cache-bust revision: v2-2026-07-15
 */

const SHELL_CACHE = 'punicodex-shell-v2';
const ASSET_CACHE = 'punicodex-assets-v2';

// Precache critical shell HTML pages only.
// Versioned JS/CSS are fetched on demand and will update when their query
// strings change; precaching unversioned asset URLs caused stale data.
const SHELL_URLS = [
  '/',
  '/pantheon/',
  '/type/',
  '/lexicon/',
  '/tiers/',
  '/realms/',
  '/about/',
  '/contact/',
  '/codex/',
  '/store/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // HTML pages: network-first (always fresh content)
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    );
    return;
  }

  // API responses: never serve stale — always go to network.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // CSS/JS/Fonts/Images: stale-while-revalidate (instant, then update)
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(ASSET_CACHE).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
