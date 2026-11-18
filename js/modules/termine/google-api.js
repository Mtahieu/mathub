// Google Kalender: Anmeldung (OAuth 2.0, nur Lesen) und Abgleich – ohne Server und ohne Bibliothek.
//
// Ablauf: Mathub leitet zu Google weiter (response_type=token). Google schickt den Nutzer mit einem
// kurzlebigen Zugriffs-Token im URL-Fragment zurück (#access_token=…). launchFromRedirect() liest das
// Token beim Start, bevor der Router das Fragment sieht. Termine werden lokal gespeichert, damit sie
// auch offline, in Erinnerungen und im Kalender verfügbar sind.
//
// Gespeichert (nur auf dem Gerät):
//   kv 'gcal'              {clientId, account, calendars:[{id, name, color, on, primary}], lastSync, lastError}
//   kv 'gcal:events'       {from, to, syncedAt, list:[{id, cal, title, start, end, allDay, loc, link, desc}]}
//   kv 'tmp:gcal:token'    {accessToken, expiresAt}   – nicht im Backup
//   kv 'tmp:gcal:state'    {state, returnHash, silent} – Schutz gegen fremde Weiterleitungen
//   kv 'tmp:gcal:autoAt'   Zeitpunkt der letzten automatischen Anmeldung (verhindert Schleifen)

import { kv } from '../../core/db.js';
import { emit } from '../../core/events.js';
import { today, addDays, fromKey, toKey } from '../../core/dates.js';

export const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
export const SYNC_PAST_DAYS = 30;
export const SYNC_FUTURE_DAYS = 120;
const FRESH_MS = 10 * 60 * 1000;
const AUTO_LOGIN_PAUSE_MS = 5 * 60 * 1000;

// ---------- Konfiguration ----------
export const getConfig = async () => ({ clientId: '', account: '', calendars: [], lastSync: null, lastError: null, ...(await kv.get('gcal', {})) });
export async function saveConfig(patch) {
  const cfg = { ...(await getConfig()), ...patch };
  await kv.set('gcal', cfg);
  emit('data:changed', { store: 'kv', type: 'gcal' });
  return cfg;
}

export async function getToken() {
  const t = await kv.get('tmp:gcal:token', null);
  return t && t.expiresAt > Date.now() ? t.accessToken : null;
}

/** Adresse, an die Google zurückleitet – muss exakt so in der Google Cloud Console stehen. */
export function redirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

export const isConfigured = (cfg) => !!cfg.clientId;
export const isConnected = (cfg) => !!cfg.clientId && !!cfg.lastSync;

// ---------- Anmeldung ----------
function randomState() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Leitet zu Google weiter. silent=true versucht es ohne Rückfrage (prompt=none);
 * klappt das nicht, kommt Google mit einem Fehler zurück und die App zeigt „Anmelden“.
 */
export async function login({ silent = false, returnHash = location.hash || '#/termine' } = {}) {
  const cfg = await getConfig();
  if (!cfg.clientId) throw new Error('Bitte zuerst die Client-ID eintragen.');
  const state = randomState();
  await kv.set('tmp:gcal:state', { state, returnHash, silent });
  if (silent) await kv.set('tmp:gcal:autoAt', Date.now());
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  if (silent) p.set('prompt', 'none');
  if (cfg.account) p.set('login_hint', cfg.account);
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p);
}

/** Beim Start: Token aus dem URL-Fragment übernehmen. Gibt true zurück, wenn es eine Google-Rückkehr war. */
export async function launchFromRedirect() {
  const frag = location.hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error)=/.test(frag) || !/(^|&)state=/.test(frag)) return false;
  const p = new URLSearchParams(frag);
  const saved = await kv.get('tmp:gcal:state', null);
  await kv.set('tmp:gcal:state', null);
  const back = saved?.returnHash && saved.returnHash.startsWith('#/') ? saved.returnHash : '#/termine';
  history.replaceState(null, '', location.pathname + location.search + back);
  if (!saved || p.get('state') !== saved.state) {
    await saveConfig({ lastError: 'Anmeldung abgelehnt (ungültige Antwort). Bitte erneut verbinden.' });
    return true;
  }
  if (p.get('error')) {
    const err = p.get('error');
    const msg = ['interaction_required', 'login_required', 'consent_required', 'account_selection_required'].includes(err)
      ? 'Bitte einmal bei Google anmelden.'
      : err === 'access_denied' ? 'Zugriff wurde nicht erlaubt.' : `Google meldet: ${err}`;
    await saveConfig({ lastError: msg, needsLogin: true });
    return true;
  }
  const ttl = Number(p.get('expires_in') || 3600);
  await kv.set('tmp:gcal:token', { accessToken: p.get('access_token'), expiresAt: Date.now() + (ttl - 60) * 1000 });
  await saveConfig({ lastError: null, needsLogin: false });
  return true;
}

/** Abmelden: Token bei Google widerrufen (falls online) und lokale Termine löschen. */
export async function disconnect({ keepClientId = true } = {}) {
  const token = await getToken();
  if (token) {
    fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=' + encodeURIComponent(token),
    }).catch(() => {});
  }
  const cfg = await getConfig();
  await kv.set('tmp:gcal:token', null);
  await kv.set('gcal:events', null);
  await kv.set('gcal', keepClientId ? { clientId: cfg.clientId } : {});
  emit('data:changed', { store: 'kv', type: 'gcal' });
}

// ---------- API ----------
class AuthError extends Error {}

async function api(path, params = {}) {
  const token = await getToken();
  if (!token) throw new AuthError('Nicht angemeldet');
  const url = API + path + (Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) {
    await kv.set('tmp:gcal:token', null);
    throw new AuthError('Anmeldung abgelaufen');
  }
  if (!res.ok) {
    let msg = `Fehler ${res.status}`;
    try { msg = (await res.json()).error?.message || msg; } catch { /* egal */ }
    if (res.status === 403 && /has not been used|disabled/i.test(msg)) msg = 'Die Google Calendar API ist im Cloud-Projekt noch nicht aktiviert.';
    throw new Error(msg);
  }
  return res.json();
}

async function fetchCalendars(previous) {
  const out = [];
  let pageToken;
  do {
    const r = await api('/users/me/calendarList', { maxResults: '250', ...(pageToken ? { pageToken } : {}) });
    out.push(...(r.items || []));
    pageToken = r.nextPageToken;
  } while (pageToken);
  const prev = new Map((previous || []).map((c) => [c.id, c]));
  return out
    .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || String(a.summaryOverride || a.summary).localeCompare(b.summaryOverride || b.summary, 'de'))
    .map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor || '#4f8cff',
      primary: !!c.primary,
      on: prev.has(c.id) ? prev.get(c.id).on : c.selected !== false && c.accessRole !== 'freeBusyReader',
    }));
}

const localMidnightIso = (k) => fromKey(k).toISOString();

function normalize(ev, calId) {
  if (ev.status === 'cancelled') return null;
  const allDay = !!ev.start?.date;
  const start = allDay ? ev.start.date : ev.start?.dateTime;
  const end = allDay ? ev.end?.date : ev.end?.dateTime;
  if (!start) return null;
  return {
    id: ev.id,
    cal: calId,
    title: ev.summary || '(ohne Titel)',
    start, end: end || start, allDay,
    loc: ev.location || '',
    link: ev.htmlLink || '',
    desc: (ev.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600),
  };
}

async function fetchEvents(calId, from, to) {
  const out = [];
  let pageToken;
  do {
    const r = await api(`/calendars/${encodeURIComponent(calId)}/events`, {
      timeMin: localMidnightIso(from),
      timeMax: localMidnightIso(addDays(to, 1)),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      fields: 'nextPageToken,items(id,status,summary,location,description,htmlLink,start,end)',
      ...(pageToken ? { pageToken } : {}),
    });
    for (const ev of r.items || []) {
      const n = normalize(ev, calId);
      if (n) out.push(n);
    }
    pageToken = r.nextPageToken;
  } while (pageToken);
  return out;
}

let running = null;

/**
 * Gleicht Kalender und Termine ab. Ergebnis: 'ok' | 'auth' (Anmeldung nötig) | 'offline' | 'error'.
 * reloadCalendars: auch die Kalenderliste neu laden (sonst nur beim ersten Mal).
 */
export function sync({ reloadCalendars = false } = {}) {
  if (running) return running;
  running = (async () => {
    const cfg = await getConfig();
    if (!cfg.clientId) return 'error';
    if (!(await getToken())) return 'auth';
    if (globalThis.navigator && navigator.onLine === false) return 'offline';
    try {
      let calendars = cfg.calendars;
      if (reloadCalendars || !calendars.length) calendars = await fetchCalendars(cfg.calendars);
      const account = calendars.find((c) => c.primary)?.id || cfg.account || '';
      const t = today();
      const from = addDays(t, -SYNC_PAST_DAYS);
      const to = addDays(t, SYNC_FUTURE_DAYS);
      const lists = await Promise.all(calendars.filter((c) => c.on).map((c) => fetchEvents(c.id, from, to)));
      const list = lists.flat().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      await kv.set('gcal:events', { from, to, syncedAt: Date.now(), list });
      await saveConfig({ calendars, account, lastSync: Date.now(), lastError: null, needsLogin: false });
      return 'ok';
    } catch (err) {
      if (err instanceof AuthError) return 'auth';
      if (err instanceof TypeError) return 'offline';   // fetch ohne Netz
      await saveConfig({ lastError: String(err.message || err) });
      return 'error';
    }
  })().finally(() => { running = null; });
  return running;
}

export const isFresh = (cfg) => !!cfg.lastSync && Date.now() - cfg.lastSync < FRESH_MS;

/** Darf automatisch (ohne Tippen) eine stille Anmeldung versucht werden? */
export async function mayAutoLogin(cfg) {
  if (!cfg.clientId || !cfg.lastSync || cfg.needsLogin || navigator.onLine === false) return false;
  const last = await kv.get('tmp:gcal:autoAt', 0);
  return Date.now() - last > AUTO_LOGIN_PAUSE_MS;
}

// ---------- Termine lesen ----------
const sortKey = (e) => (e.allDay ? e.start + 'T00:00' : toKey(new Date(e.start)) + 'T' + timeOf(new Date(e.start))) + (e.allDay ? '0' : '1');
const pad = (n) => String(n).padStart(2, '0');
const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export async function loadEvents() {
  const store = await kv.get('gcal:events', null);
  const cfg = await kv.get('gcal', {});
  const cals = new Map((cfg.calendars || []).map((c) => [c.id, c]));
  const list = (store?.list || []).filter((e) => cals.get(e.cal)?.on !== false);
  return { list, from: store?.from || null, to: store?.to || null, syncedAt: store?.syncedAt || null, calendars: cals };
}

/** Termine eines Tages, mit Anzeige-Infos (Uhrzeit, mehrtägig). */
export function eventsOn(store, date) {
  if (!store?.list?.length) return [];
  const dayStart = fromKey(date).getTime();
  const dayEnd = fromKey(addDays(date, 1)).getTime();
  const out = [];
  for (const e of store.list) {
    if (e.allDay) {
      if (e.start <= date && date < (e.end > e.start ? e.end : addDays(e.start, 1))) {
        const multi = e.end > addDays(e.start, 1);
        out.push({ ...e, time: multi ? 'mehrtägig' : 'ganztägig', order: '00:00', color: store.calendars.get(e.cal)?.color });
      }
      continue;
    }
    const s = new Date(e.start).getTime();
    const en = Math.max(new Date(e.end).getTime(), s + 1);
    if (s >= dayEnd || en <= dayStart) continue;
    const startsToday = s >= dayStart;
    const endsToday = en <= dayEnd;
    let time;
    if (startsToday && endsToday) time = `${timeOf(new Date(s))}–${timeOf(new Date(en))}`;
    else if (startsToday) time = `ab ${timeOf(new Date(s))}`;
    else if (endsToday) time = `bis ${timeOf(new Date(en))}`;
    else time = 'ganztägig';
    out.push({ ...e, time, order: startsToday ? timeOf(new Date(s)) : '00:00', color: store.calendars.get(e.cal)?.color });
  }
  return out.sort((a, b) => a.order.localeCompare(b.order) || a.title.localeCompare(b.title, 'de'));
}

/** Kurzform für Listen/Erinnerungen: „9:00 Zahnarzt“ bzw. „Urlaub (ganztägig)“. */
export function shortLine(e) {
  if (/^\d\d:\d\d/.test(e.time)) return `${e.time.slice(0, 5).replace(/^0/, '')} ${e.title}`;
  if (e.time.startsWith('ab ')) return `${e.time.slice(3).replace(/^0/, '')} ${e.title}`;
  return `${e.title} (${e.time})`;
}
