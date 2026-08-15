/* service-worker.js — basic service worker for a Next.js PWA */
/* Register this file from the client (e.g. in a layout or _app):     */
/*   if ('serviceWorker' in navigator) {                              */
/*     navigator.serviceWorker.register('/service-worker.js');        */
/*   }                                                                */

// Bump this version on EVERY release that changes precached assets or the
// app shell. A new CACHE_NAME triggers `activate`, which purges stale caches
// so users never run an outdated offline shell (see RELEASING.md).
const CACHE_NAME = 'next-pwa-cache-v2';

// Assets to precache on install (adjust to your actual build output).
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
];

// Offline fallback for navigation requests.
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Remove outdated caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and requests to other origins.
  if (request.method !== 'GET') return;

  // Skip browser-extension / non-http(s) requests.
  if (!request.url.startsWith('http')) return;

  // For navigation requests: network-first, falling back to cache,
  // then to the offline fallback page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_FALLBACK))
        )
    );
    return;
  }

  // For all other GET requests: cache-first, with network fallback
  // that populates the cache (stale-while-revalidate style).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Optional: return a cached fallback asset (e.g. an image) here.
          return Response.error();
        });
    })
  );
});
