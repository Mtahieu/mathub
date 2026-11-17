// Push-Erinnerungen einrichten (App-Seite).
// Die App erzeugt lokal ein VAPID-Schlüsselpaar, abonniert Push und erstellt daraus den Wert für das
// GitHub-Secret PUSH_CONFIG. Der GitHub-Workflow (.github/workflows/reminders.yml) sendet damit zu festen
// Zeiten ein leeres Signal; der Service Worker baut den Text aus den lokalen Daten (reminders.js).

import { kv } from './db.js';
import { buildReminder } from './reminders.js';

export const REPO_SECRET_URL = 'https://github.com/Mtahieu/mathub/settings/secrets/actions/new';
export const WORKFLOW_URL = 'https://github.com/Mtahieu/mathub/actions/workflows/reminders.yml';

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function registration() {
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function pushState() {
  if (!pushSupported()) return { status: 'unsupported' };
  const perm = Notification.permission;
  const saved = await kv.get('push', null);
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (perm === 'denied') return { status: 'denied' };
  if (!sub || !saved) return { status: 'off', permission: perm };
  const changed = saved.subscription?.endpoint !== sub.endpoint;
  return { status: changed ? 'changed' : 'on', saved, config: configString(saved) };
}

function configString(saved) {
  return JSON.stringify({ v: 1, subscription: saved.subscription, jwk: saved.jwk });
}

export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt. Du kannst das in den Chrome-Einstellungen der Seite ändern.');
  const reg = await registration();
  const old = await reg.pushManager.getSubscription();
  if (old) await old.unsubscribe();

  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = await crypto.subtle.exportKey('raw', keys.publicKey);
  const jwkFull = await crypto.subtle.exportKey('jwk', keys.privateKey);
  const jwk = { kty: jwkFull.kty, crv: jwkFull.crv, x: jwkFull.x, y: jwkFull.y, d: jwkFull.d };

  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: new Uint8Array(raw) });
  const saved = { subscription: sub.toJSON(), jwk, publicKey: b64url(raw), createdAt: Date.now() };
  await kv.set('push', saved);
  return { saved, config: configString(saved) };
}

export async function disablePush() {
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  await kv.set('push', null);
}

/** Zeigt sofort eine Erinnerung mit dem echten Inhalt – zum Testen ohne GitHub. */
export async function testNotification(slot) {
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('Benachrichtigungen sind nicht erlaubt.');
  }
  const n = await buildReminder(slot);
  const reg = await registration();
  await reg.showNotification(n.title, {
    body: n.body, tag: n.tag, icon: './icons/icon-192.png', badge: './icons/badge-96.png', data: { url: n.url },
  });
  return n;
}
