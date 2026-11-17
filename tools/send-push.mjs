// Sendet ein leeres Web-Push-Signal (VAPID, ohne Inhalt) an die in PUSH_CONFIG hinterlegten Geräte.
// Läuft im GitHub-Workflow .github/workflows/reminders.yml. Keine Abhängigkeiten.
//
// Umgebungsvariablen:
//   PUSH_CONFIG     JSON {v, subscription:{endpoint,…}, jwk:{kty,crv,x,y,d}} – oder ein Array davon (mehrere Geräte)
//   SCHEDULE        cron-Ausdruck, der den Lauf ausgelöst hat (leer bei manuellem Start → sofort senden)
//   REMINDER_TIMES  Ortszeiten Europe/Berlin, z. B. "07:30,20:30"
//   APP_URL         für das VAPID-"sub"-Feld

import { createPrivateKey, sign } from 'node:crypto';

const pad = (n) => String(n).padStart(2, '0');
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function berlinOffsetHours(date = new Date()) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || 'GMT+1';
  const m = part.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? Number(m[1]) : 1;
}

/** Ist dieser cron-Lauf (UTC) heute die gewünschte Ortszeit? */
export function scheduleMatches(schedule, times, date = new Date()) {
  const [min, hour] = schedule.trim().split(/\s+/).map(Number);
  const local = `${pad((hour + berlinOffsetHours(date) + 24) % 24)}:${pad(min)}`;
  return { local, ok: times.includes(local) };
}

export function vapidAuth(endpoint, jwk, subject) {
  const key = createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }, format: 'jwk' });
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  }));
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' });
  const publicKey = b64url(Buffer.concat([Buffer.from([4]), fromB64url(jwk.x), fromB64url(jwk.y)]));
  return `vapid t=${header}.${payload}.${b64url(signature)}, k=${publicKey}`;
}

async function sendOne(cfg, subject) {
  const endpoint = cfg.subscription?.endpoint;
  if (!endpoint || !cfg.jwk?.d) throw new Error('PUSH_CONFIG unvollständig – bitte in der App neu einrichten.');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { TTL: '7200', Urgency: 'high', Authorization: vapidAuth(endpoint, cfg.jwk, subject), 'Content-Length': '0' },
  });
  if (res.status === 404 || res.status === 410) {
    throw new Error(`Push-Abo abgelaufen (${res.status}). In der App unter Einstellungen → Erinnerungen neu einrichten und das Secret ersetzen.`);
  }
  if (!res.ok) throw new Error(`Push fehlgeschlagen: HTTP ${res.status} ${await res.text().catch(() => '')}`);
  return res.status;
}

async function main() {
  const raw = process.env.PUSH_CONFIG;
  if (!raw) {
    console.log('Kein Secret PUSH_CONFIG gesetzt – Erinnerungen sind noch nicht eingerichtet. Nichts zu tun.');
    return;
  }
  const times = (process.env.REMINDER_TIMES || '07:30,20:30').split(',').map((t) => t.trim());
  const schedule = process.env.SCHEDULE;
  if (schedule) {
    const { local, ok } = scheduleMatches(schedule, times);
    if (!ok) {
      console.log(`Lauf "${schedule}" UTC entspricht ${local} Uhr in Berlin – keine Erinnerung zu dieser Zeit (Sommer-/Winterzeit-Ausgleich).`);
      return;
    }
    console.log(`Erinnerung für ${local} Uhr (Berlin).`);
  } else {
    console.log('Manueller Start – sende sofort.');
  }

  let configs;
  try { configs = JSON.parse(raw); } catch { throw new Error('PUSH_CONFIG ist kein gültiges JSON – Code in der App neu kopieren.'); }
  configs = Array.isArray(configs) ? configs : [configs];
  const subject = process.env.APP_URL || 'https://mtahieu.github.io/mathub/';
  let failed = 0;
  for (const [i, cfg] of configs.entries()) {
    try {
      const status = await sendOne(cfg, subject);
      console.log(`Gerät ${i + 1}: gesendet (HTTP ${status}).`);
    } catch (err) {
      failed++;
      console.error(`Gerät ${i + 1}: ${err.message}`);
    }
  }
  if (failed) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
