/**
 * PUNYCODEX — Service Worker
 * Lightweight: precache shell, stale-while-revalidate for assets
 */

const SHELL_CACHE = 'punycodex-shell-v1';
const ASSET_CACHE = 'punycodex-assets-v1';

// Precache critical shell files on install
const SHELL_URLS = [
  '/',
  '/css/main.css',
  '/js/main.js',
  '/js/archetypes-v2.js',
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
        keys.filter(key => key !== SHELL_CACHE && key !== ASSET_CACHE)
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
