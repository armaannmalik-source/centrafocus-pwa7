/* CentraFocus Service Worker */
const VERSION = 'v1.0.0';
const CACHE_NAME = `centrafocus-${VERSION}`;

/* Works at root or a GitHub Pages subfolder */
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');

/* Files to precache */
const PRECACHE_URLS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/service-worker.js`,
  // Core assets
  `${BASE_PATH}/assets/5162027.jpg`,
  `${BASE_PATH}/assets/logo.png`,
  `${BASE_PATH}/assets/centrafocus.mp3`,
  // Contact icons
  `${BASE_PATH}/assets/icons/phone.png`,
  `${BASE_PATH}/assets/icons/whatsapp.png`,
  `${BASE_PATH}/assets/icons/telegram.png`,
  // PWA icons
  `${BASE_PATH}/assets/icons/pwa-icon-192.png`,
  `${BASE_PATH}/assets/icons/pwa-icon-256.png`,
  `${BASE_PATH}/assets/icons/pwa-icon-384.png`,
  `${BASE_PATH}/assets/icons/pwa-icon-512.png`
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)));
    await self.clients.claim();
  })());
});

/* 
  Strategy:
  - Navigations (HTML pages): network-first, fallback to cached index.html
  - Same-origin assets: cache-first
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // HTML navigations
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(`${BASE_PATH}/index.html`)) || Response.error();
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // Optional: avoid caching audio to save space
      if (!req.url.endsWith('.mp3')) cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
