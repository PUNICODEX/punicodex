/**
 * PÚNYCODEX Type Mobile — Service Worker
 * Caches the app shell for offline use.
 */

const CACHE_NAME = 'punycodex-mobile-v1';
const ASSETS = [
    './',
    './index.html',
    './css/mobile.css',
    './js/mobile.js',
    './shared/engine.js',
    './shared/lexicon.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
