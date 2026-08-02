/**
 * PUNICODEX — Service Worker
 * Lightweight: precache shell pages, stale-while-revalidate for assets.
 * Cache-bust revision: v5-2026-08-02 (document branch no longer caches error pages)
 *
 * Hard rules (learned from production failures):
 * - NEVER intercept /api/ or /admin-portal/ requests. Admin tooling and
 *   customer checkout need live, authenticated responses; a service-worker
 *   cache layer adds nothing and a rejected respondWith turns any hiccup
 *   into a hard network error for the page.
 * - respondWith must always resolve to a real Response. Any miss path that
 *   can yield undefined produces "Failed to convert value to 'Response'"
 *   and breaks the page's own fetch handling.
 */

const SHELL_CACHE = 'punicodex-shell-v5';
const ASSET_CACHE = 'punicodex-assets-v5';

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

function offlineDocumentResponse() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline — PuniCodex</title></head>' +
      '<body style="background:#0a0a0c;color:#e8e4dc;font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0">' +
      '<div style="text-align:center"><h1 style="color:#D4AF37">You are offline</h1>' +
      '<p>PuniCodex could not reach the network. Check your connection and reload.</p></div></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API and admin traffic: never intercept — the browser handles these
  // natively so auth, errors and streaming behave exactly as the server
  // intends. (Returning here without respondWith hands control straight
  // back to the network stack.)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin-portal/')) {
    return;
  }

  // HTML pages: network-first (always fresh content), with a guaranteed
  // Response on every failure path.
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Never cache error responses (404/500 HTML): a cached error page
          // would keep being served as the document until eviction.
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(r => r || caches.match('/'))
            .then(r => r || offlineDocumentResponse())
            .catch(() => offlineDocumentResponse())
        )
    );
    return;
  }

  // CSS/JS/Fonts/Images: stale-while-revalidate (instant, then update),
  // again with a guaranteed Response-shaped outcome.
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(ASSET_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cached || Promise.reject(new Error('offline')));

      return cached || fetchPromise;
    })
  );
});
