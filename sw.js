// Service Worker (ES-Modul): macht Mathub offline-fähig, liefert Updates aus und zeigt Push-Erinnerungen.
// Bei JEDER Änderung an App-Dateien VERSION erhöhen (tools/bump-version.mjs), sonst sieht das Handy das Update nicht.

import { buildReminder, slotForHour } from './js/core/reminders.js';
import { kv } from './js/core/db.js';

const VERSION = '0.19.3';
const CACHE = `mathub-${VERSION}`;
const POSTER_CACHE = 'posters-v1';   // Filmposter von Wikipedia – bleibt über Updates erhalten
const POSTER_HOST = 'upload.wikimedia.org';
const POSTER_MAX = 300;

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
  './js/core/push.js',
  './js/core/reminders.js',
  './js/core/dates.js',
  './js/core/db.js',
  './js/core/events.js',
  './js/core/registry.js',
  './js/core/router.js',
  './js/core/settings.js',
  './js/core/theme.js',
  './js/core/ui.js',
  './js/core/update.js',
  './js/modules/index.js',
  './js/modules/hub/home.js',
  './js/modules/hub/home-quotes.js',
  './js/modules/hub/settings.js',
  './js/modules/fitness/food-data.js',
  './js/modules/fitness/kochen.js',
  './js/modules/fitness/rezept-texte.js',
  './js/modules/fitness/ratings.js',
  './js/modules/fitness/rezept-bild.js',
  './js/modules/fitness/rezept-log.js',
  './js/modules/freizeit/filme-data.js',
  './js/modules/freizeit/filme-poster.js',
  './js/modules/freizeit/filme-store.js',
  './js/modules/freizeit/teilen.js',
  './js/modules/freizeit/karlsruhe.js',
  './js/modules/freizeit/filme-wiki.js',
  './js/modules/freizeit/filme.js',
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
  if (url.hostname === POSTER_HOST && req.destination === 'image') {
    event.respondWith(posterFromCache(req));
    return;
  }
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

// Filmposter: zuerst aus dem Cache, sonst laden und merken (auch undurchsichtige Antworten für <img>).
async function posterFromCache(req) {
  const cache = await caches.open(POSTER_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      const keys = await cache.keys();
      for (const k of keys.slice(0, Math.max(0, keys.length - POSTER_MAX))) await cache.delete(k);
    }
    return res;
  } catch {
    return Response.error();
  }
}

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
