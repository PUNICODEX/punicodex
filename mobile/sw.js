/**
 * PÚNYCODEX Type Mobile — Service Worker
 * Cache-first strategy for offline-first experience.
 */

const CACHE_NAME = 'punycodex-mobile-v4';
const ASSETS = [
    './',
    './index.html',
    './css/mobile.css',
    './js/mobile.js',
    './shared/engine.js',
    './shared/lexicon.js',
    './shared/unicode-dir.js',
    './icon192.png',
    './icon512.png',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // API calls: network first, fallback to offline response
    if (request.url.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful API responses for offline use
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache first
    event.respondWith(
        caches.match(request).then((response) => {
            if (response) return response;
            return fetch(request).then((networkResponse) => {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return networkResponse;
            });
        })
    );
});
