// Versioned cache name to allow for easy invalidation
const CACHE_NAME = 'pch-static-assets-v1';

// 1. Install Event: Triggered when the service worker is registered
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// 2. Activate Event: Triggered when the SW starts up (Cache Invalidation)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If the cache name doesn't match the current version, delete it
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// 3. Fetch Event: Intercept network requests (Cache-First Strategy)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apply caching specifically for immutable static assets (JS, CSS, Images, Fonts)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Cache-first: If we found it in the cache, return it immediately
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network
        return fetch(request).then((networkResponse) => {
          // Only cache valid, successful, and basic (same-origin) responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response because it's a stream and can only be consumed once
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch((error) => {
          console.error('[Service Worker] Fetch failed for:', request.url, error);
        });
      })
    );
  }
});
