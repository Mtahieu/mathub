// Service Worker + Update-Hinweis. Neue Version = neue VERSION in sw.js → Banner "Update verfügbar".

import { h, icon } from './ui.js';

let registration = null;

export function initUpdates() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showBanner(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showBanner(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('Service Worker nicht registriert:', err));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

/** Rückgabe: 'found' | 'none' | 'unsupported' */
export async function checkForUpdate() {
  if (!registration) return 'unsupported';
  await registration.update();
  const w = registration.waiting || registration.installing;
  if (w) { showBanner(w); return 'found'; }
  return 'none';
}

function showBanner(worker) {
  if (document.querySelector('.update-banner')) return;
  const el = h('div', { class: 'banner update-banner', role: 'alert' },
    icon('refresh'),
    h('div', { style: { flex: 1 } }, h('strong', null, 'Neue Version verfügbar'), h('div', { class: 'small muted' }, 'Deine Daten bleiben erhalten.')),
    h('button', {
      class: 'btn btn-primary small',
      onclick: () => {
        el.querySelector('button').disabled = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      },
    }, 'Aktualisieren'));
  document.body.append(el);
}
