// Service Worker (ES-Modul): macht Mathub offline-fähig, liefert Updates aus und zeigt Push-Erinnerungen.
// Bei JEDER Änderung an App-Dateien VERSION erhöhen (tools/bump-version.mjs), sonst sieht das Handy das Update nicht.

import { buildReminder, slotForHour } from './js/core/reminders.js';
import { kv } from './js/core/db.js';

const VERSION = '0.4.0';
const CACHE = `mathub-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/badge-96.png',
  './js/app.js',
  './js/version.js',
  './js/core/backup.js',
  './js/core/charts.js',
  './js/core/push.js',
  './js/core/reminders.js',
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
  './js/modules/job/checkin.js',
  './js/modules/fitness/nutrition.js',
  './js/modules/fitness/physio-catalog.js',
  './js/modules/fitness/ratings.js',
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

// ---------- Push-Erinnerungen ----------
// Das Signal von GitHub ist leer; der Text entsteht hier aus den lokalen Daten.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let n;
    try {
      n = await buildReminder(slotForHour(new Date().getHours()));
      await kv.set('push:last', { at: Date.now(), title: n.title });
    } catch (err) {
      n = { title: 'Mathub', body: 'Schau kurz rein – deine Tagesziele warten.', url: './#/heute', tag: 'mathub' };
    }
    await self.registration.showNotification(n.title, {
      body: n.body,
      tag: n.tag,
      renotify: true,
      icon: './icons/icon-192.png',
      badge: './icons/badge-96.png',
      data: { url: n.url },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './#/heute', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        if ('navigate' in w) await w.navigate(target).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
