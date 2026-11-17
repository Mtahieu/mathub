// Service Worker: macht Mathub offline-fähig und liefert Updates aus.
// Bei JEDER Änderung an App-Dateien VERSION erhöhen (tools/bump-version.mjs), sonst sieht das Handy das Update nicht.

const VERSION = '0.1.0';
const CACHE = `mathub-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/version.js',
  './js/core/backup.js',
  './js/core/charts.js',
  './js/core/dates.js',
  './js/core/db.js',
  './js/core/events.js',
  './js/core/registry.js',
  './js/core/router.js',
  './js/core/settings.js',
  './js/core/streaks.js',
  './js/core/ui.js',
  './js/core/update.js',
  './js/modules/index.js',
  './js/modules/hub/calendar.js',
  './js/modules/hub/more.js',
  './js/modules/hub/progress.js',
  './js/modules/hub/settings.js',
  './js/modules/hub/today.js',
  './js/modules/fitness/body.js',
  './js/modules/fitness/nutrition.js',
  './js/modules/fitness/training.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mathub-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
