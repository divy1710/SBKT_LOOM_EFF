/**
 * Service Worker for SBKT Textile Management System
 * Provides PWA installability, static shell caching, and graceful offline fallback.
 *
 * CRITICAL SECURITY & DATA INTEGRITY RULES:
 * - NEVER cache authenticated API responses (/api/*) or auth endpoints (/auth/*).
 * - NEVER cache login responses or credentials.
 * - Non-GET requests always bypass service worker caching.
 */

const CACHE_NAME = 'sbkt-pwa-v1.0.0';

// Essential application shell assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/maskable-icon-512x512.png',
];

// ── Install Event: Precache static shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Precache error should not prevent service worker installation
        console.warn('[SW] Precache asset failed:', err);
      });
    }),
  );
  // Do not automatically skipWaiting; wait for user confirmation or app update prompt
});

// ── Activate Event: Clean up old caches ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }).then(() => self.clients.claim()),
  );
});

// ── Fetch Event: Network-first / Stale-While-Revalidate with strict exclusions ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never handle non-GET requests (POST, PUT, PATCH, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. NEVER cache API requests or Auth requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/health')
  ) {
    // Pass directly to network
    return;
  }

  // 3. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 4. For navigation requests (HTML pages), network-first with cached index.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('/index.html');
        if (cachedIndex) return cachedIndex;
        return new Response(
          '<!doctype html><html><body style="font-family:sans-serif;background:#0b0f19;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Offline</h2><p>Please check your internet connection.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        );
      }),
    );
    return;
  }

  // 5. For static hashed assets (JS, CSS, fonts, images), Cache-First with Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webmanifest');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Asynchronously update cache in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache, fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // Default: pass through to network
  event.respondWith(fetch(request));
});

// ── Message Event: User confirmed update ─────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
