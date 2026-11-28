// Gemeinsame Filmliste über eine JSON-Datei in Google Drive.
//
// Jedes Gerät meldet sich mit dem eigenen Google-Konto an (OAuth „Token“-Ablauf per Weiterleitung, kein Server).
// Die Datei gehört dem Ersteller und wird in Drive geteilt (Ordner/geteilte Ablage). Inhalt:
//   {app:'mathub-filme', schema, hinweis, updatedAt, updatedBy, films:[<vollständige Film-Datensätze>],
//    shared:{<kv-Schlüssel>: {value, updatedAt, updatedBy}}}
// Abgleich: pro Film gewinnt der Datensatz mit dem neueren updatedAt (Löschungen als {deleted:true}).
// Unbekannte Felder werden unverändert übernommen – neue Film-Attribute späterer Versionen gehen nicht verloren.
//
// kv 'filme:sync'         {clientId, fileId, fileName, account, me, version, lastSync, lastError, needsLogin, pending}
// kv 'filme:sync:dirty'   lokale Änderungen noch nicht hochgeladen
// kv 'tmp:filme:token'    Zugriffs-Token (ca. 1 h, nicht im Backup)
// kv 'tmp:filme:state'    Schutz gegen fremde Weiterleitungen

import { items, kv } from '../../core/db.js';
import { emit, on } from '../../core/events.js';
import { allFilms, getSharedRecord, setShared, setMe, seedOnce, SHARED_KV } from './filme-store.js';

export const SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FILE_APP = 'mathub-filme';
const FILE_SCHEMA = 1;
const POLL_MS = 30 * 1000;
const AUTO_LOGIN_PAUSE_MS = 5 * 60 * 1000;

// ---------- Konfiguration ----------
export async function getSyncConfig() {
  return { clientId: '', fileId: '', fileName: '', account: '', me: '', version: null, lastSync: null, lastError: null, ...(await kv.get('filme:sync', {})) };
}
export async function saveSyncConfig(patch) {
  const cfg = { ...(await getSyncConfig()), ...patch };
  await kv.set('filme:sync', cfg);
  setMe(cfg.me);
  emit('filme:sync', { status: 'config' });
  return cfg;
}
export const isLinked = (cfg) => !!(cfg.clientId && cfg.fileId);

export async function getToken() {
  const t = await kv.get('tmp:filme:token', null);
  return t && t.expiresAt > Date.now() ? t.accessToken : null;
}

export function redirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

// ---------- Einladung ----------
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function inviteLink(cfg) {
  const code = b64url(JSON.stringify({ c: cfg.clientId, f: cfg.fileId, n: cfg.fileName || '' }));
  return `${redirectUri()}#/filme?v=teilen&e=${code}`;
}
export function parseInvite(code) {
  try {
    const o = JSON.parse(unb64url(code));
    if (o?.c && o?.f) return { clientId: o.c, fileId: o.f, fileName: o.n || '' };
  } catch { /* ungültig */ }
  return null;
}

/** Drive-Link oder reine ID → {id, type:'file'|'folder'} */
export function parseDriveLink(s) {
  const v = String(s || '').trim();
  let m = v.match(/\/folders\/([\w-]{10,})/);
  if (m) return { id: m[1], type: 'folder' };
  m = v.match(/\/(?:file\/d|document\/d|d)\/([\w-]{10,})/) || v.match(/[?&]id=([\w-]{10,})/);
  if (m) return { id: m[1], type: 'file' };
  if (/^[\w-]{10,}$/.test(v)) return { id: v, type: 'unknown' };
  return null;
}

// ---------- Anmeldung ----------
function randomState() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function login({ silent = false, returnHash = '#/filme?v=teilen' } = {}) {
  const cfg = await getSyncConfig();
  if (!cfg.clientId) throw new Error('Client-ID fehlt');
  const state = randomState();
  await kv.set('tmp:filme:state', { state, returnHash, silent });
  if (silent) await kv.set('tmp:filme:autoAt', Date.now());
  const p = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE,
    include_granted_scopes: 'true', state,
  });
  if (silent) p.set('prompt', 'none');
  if (cfg.account) p.set('login_hint', cfg.account);
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p);
}

/** Beim Start (vor dem Router): Rückkehr von Google auswerten. */
export async function launch() {
  const cfg = await getSyncConfig();
  setMe(cfg.me);
  const frag = location.hash.replace(/^#/, '');
  if (/(^|&)(access_token|error)=/.test(frag) && /(^|&)state=/.test(frag)) {
    const p = new URLSearchParams(frag);
    const saved = await kv.get('tmp:filme:state', null);
    if (saved && p.get('state') === saved.state) {
      await kv.set('tmp:filme:state', null);
      const back = saved.returnHash?.startsWith('#/') ? saved.returnHash : '#/filme';
      history.replaceState(null, '', location.pathname + location.search + back);
      if (p.get('error')) {
        const err = p.get('error');
        const msg = ['interaction_required', 'login_required', 'consent_required', 'account_selection_required'].includes(err)
          ? 'Bitte bei Google anmelden.' : err === 'access_denied' ? 'Zugriff wurde nicht erlaubt.' : `Google meldet: ${err}`;
        await saveSyncConfig({ lastError: msg, needsLogin: true });
      } else {
        const ttl = Number(p.get('expires_in') || 3600);
        await kv.set('tmp:filme:token', { accessToken: p.get('access_token'), expiresAt: Date.now() + (ttl - 60) * 1000 });
        await saveSyncConfig({ lastError: null, needsLogin: false });
      }
    }
  }
  startScheduler();
}

export async function mayAutoLogin(cfg) {
  if (!isLinked(cfg) || cfg.needsLogin || navigator.onLine === false) return false;
  return Date.now() - (await kv.get('tmp:filme:autoAt', 0)) > AUTO_LOGIN_PAUSE_MS;
}

export async function unlink() {
  const token = await getToken();
  if (token) {
    fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=' + encodeURIComponent(token),
    }).catch(() => {});
  }
  const cfg = await getSyncConfig();
  await kv.set('tmp:filme:token', null);
  await kv.set('filme:sync:dirty', false);
  await kv.set('filme:sync', { clientId: cfg.clientId });
  setMe('');
  emit('filme:sync', { status: 'unlinked' });
}

// ---------- Drive ----------
export class AuthError extends Error {}

async function drive(url, { method = 'GET', query = {}, body, headers = {} } = {}) {
  const token = await getToken();
  if (!token) throw new AuthError('Nicht angemeldet');
  const q = new URLSearchParams({ supportsAllDrives: 'true', ...query });
  const res = await fetch(`${url}?${q}`, { method, body, headers: { Authorization: 'Bearer ' + token, ...headers } });
  if (res.status === 401) {
    await kv.set('tmp:filme:token', null);
    throw new AuthError('Anmeldung abgelaufen');
  }
  if (!res.ok) {
    let msg = `Fehler ${res.status}`;
    try { msg = (await res.json()).error?.message || msg; } catch { /* egal */ }
    if (res.status === 404) msg = 'Datei nicht gefunden – ist sie mit deinem Google-Konto geteilt?';
    if (res.status === 403 && /has not been used|disabled/i.test(msg)) msg = 'Die Google Drive API ist im Cloud-Projekt noch nicht aktiviert.';
    throw new Error(msg);
  }
  return res;
}

async function whoami() {
  const r = await (await drive(`${DRIVE}/about`, { query: { fields: 'user(displayName,emailAddress)' } })).json();
  return { me: r.user?.displayName || r.user?.emailAddress || '', account: r.user?.emailAddress || '' };
}

async function fileMeta(fileId) {
  return (await drive(`${DRIVE}/files/${fileId}`, { query: { fields: 'id,name,version,mimeType,trashed' } })).json();
}

async function download(fileId) {
  const text = await (await drive(`${DRIVE}/files/${fileId}`, { query: { alt: 'media' } })).text();
  if (!text.trim()) return emptyDoc();
  let doc;
  try { doc = JSON.parse(text); } catch { throw new Error('Die Datei ist keine Mathub-Filmliste (kein gültiges JSON).'); }
  if (doc?.app !== FILE_APP) throw new Error('Die Datei ist keine Mathub-Filmliste.');
  return { ...doc, films: Array.isArray(doc.films) ? doc.films : [], shared: doc.shared || {} };
}

async function upload(fileId, doc) {
  const r = await drive(`${UPLOAD}/files/${fileId}`, {
    method: 'PATCH', query: { uploadType: 'media', fields: 'id,version' },
    body: JSON.stringify(doc, null, 1), headers: { 'Content-Type': 'application/json' },
  });
  return r.json();
}

/** Neue Listendatei anlegen (optional in einem Ordner/einer geteilten Ablage). */
export async function createFile(name, folderId) {
  const meta = { name, mimeType: 'application/json', description: 'Gemeinsame Filmliste von Mathub – bitte nur über die App ändern.' };
  if (folderId) meta.parents = [folderId];
  const boundary = 'mathub' + Math.random().toString(36).slice(2);
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`
    + `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(emptyDoc())}\r\n--${boundary}--`;
  const r = await drive(`${UPLOAD}/files`, {
    method: 'POST', query: { uploadType: 'multipart', fields: 'id,name,version' }, body,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
  });
  return r.json();
}

const emptyDoc = () => ({ app: FILE_APP, schema: FILE_SCHEMA, hinweis: 'Wird von Mathub verwaltet – bitte nur über die App ändern.', films: [], shared: {} });

// ---------- Zusammenführen ----------
const ts = (r) => Number(r?.updatedAt) || 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const normTitle = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();

/** Pro id gewinnt der neuere Datensatz; doppelte Katalogfilme (verschiedene ids) werden zu einem. */
export function mergeFilms(local, remote, now = Date.now()) {
  const byId = new Map();
  for (const r of remote) if (r?.id) byId.set(r.id, r);
  for (const l of local) {
    const r = byId.get(l.id);
    if (!r || ts(l) > ts(r)) byId.set(l.id, l);
  }
  const groups = new Map();
  for (const rec of byId.values()) {
    if (rec.deleted || !rec.catalogId) continue;
    (groups.get(rec.catalogId) || groups.set(rec.catalogId, []).get(rec.catalogId)).push(rec);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => ts(b) - ts(a) || (a.id < b.id ? -1 : 1));
    for (const dup of list.slice(1)) {
      byId.set(dup.id, { id: dup.id, kind: 'film', catalogId: dup.catalogId, title: dup.title, deleted: true, createdAt: dup.createdAt, updatedAt: now });
    }
  }
  return [...byId.values()];
}

export function mergeShared(localMap, remoteMap) {
  const out = { ...remoteMap };
  for (const [k, l] of Object.entries(localMap)) if (l && (!out[k] || ts(l) > ts(out[k]))) out[k] = l;
  return out;
}

/**
 * Beim Beitreten: lokale Filme, die es in der gemeinsamen Liste schon gibt (gleicher Katalogfilm oder Titel,
 * auch gelöschte), werden verworfen statt verdoppelt. Gesehen-Haken werden übernommen.
 */
export function joinFilms(local, remote) {
  const keep = [];
  const updates = [];
  for (const l of local) {
    if (l.deleted) continue;
    const match = remote.find((r) => (l.catalogId && r.catalogId === l.catalogId) || normTitle(r.title) === normTitle(l.title));
    if (!match) { keep.push(l); continue; }
    if (l.watched && !match.watched && !match.deleted) updates.push({ ...match, watched: true, watchedAt: l.watchedAt || match.watchedAt, stars: match.stars ?? l.stars, updatedAt: Date.now() });
  }
  return { keep, drop: local.filter((l) => !keep.includes(l)), updates };
}

// ---------- Abgleich ----------
let running = null;
let lastVersion = null;

async function localShared() {
  const out = {};
  for (const k of SHARED_KV) { const r = await getSharedRecord(k); if (r) out[k] = r; }
  return out;
}

/**
 * Ergebnis: 'ok' | 'off' | 'auth' | 'offline' | 'error'
 * join=true beim ersten Verknüpfen eines Geräts mit einer bestehenden Liste.
 */
export function syncNow({ join = false, force = false } = {}) {
  if (running) return running;
  running = (async () => {
    const cfg = await getSyncConfig();
    if (!isLinked(cfg)) return 'off';
    if (!(await getToken())) return 'auth';
    if (navigator.onLine === false) return 'offline';
    try {
      emit('filme:sync', { status: 'running' });
      const dirty = await kv.get('filme:sync:dirty', false);
      const meta = await fileMeta(cfg.fileId);
      if (meta.trashed) throw new Error('Die gemeinsame Datei liegt im Papierkorb.');
      const remoteChanged = meta.version !== (lastVersion ?? cfg.version);
      if (!remoteChanged && !dirty && !force && !join) {
        await saveSyncConfig({ lastSync: Date.now(), lastError: null });
        return 'ok';
      }
      const remote = await download(cfg.fileId);
      await seedOnce();   // Startliste muss lokal da sein, bevor abgeglichen wird
      let local = await allFilms({ withDeleted: true });

      if (join) {
        const j = joinFilms(local, remote.films);
        for (const d of j.drop) await items.delete(d.id);
        for (const u of j.updates) await items.putRaw(u, { source: 'sync' });
        local = [...j.keep, ...j.updates];
      }

      const merged = mergeFilms(local, remote.films);
      const localById = new Map(local.map((r) => [r.id, r]));
      let changedLocal = 0;
      for (const rec of merged) {
        if (!same(localById.get(rec.id), rec)) { await items.putRaw(rec, { source: 'sync' }); changedLocal++; }
      }
      const sharedLocal = await localShared();
      const shared = mergeShared(sharedLocal, remote.shared || {});
      for (const k of SHARED_KV) {
        if (shared[k] && !same(shared[k], sharedLocal[k])) { await setShared(k, null, { source: 'sync', record: shared[k] }); changedLocal++; }
      }

      const remoteById = new Map(remote.films.map((r) => [r.id, r]));
      const needUpload = merged.length !== remote.films.length
        || merged.some((r) => !same(remoteById.get(r.id), r))
        || !same(shared, remote.shared || {})
        || remote.schema !== FILE_SCHEMA;
      let version = meta.version;
      if (needUpload) {
        const doc = {
          ...remote, app: FILE_APP, schema: Math.max(FILE_SCHEMA, remote.schema || 0), hinweis: emptyDoc().hinweis,
          updatedAt: Date.now(), updatedBy: cfg.me || '', films: merged.sort((a, b) => String(a.id).localeCompare(String(b.id))), shared,
        };
        version = (await upload(cfg.fileId, doc)).version ?? version;
      }
      lastVersion = version;
      await kv.set('filme:sync:dirty', false);
      await saveSyncConfig({ version, lastSync: Date.now(), lastError: null, needsLogin: false, fileName: meta.name || cfg.fileName });
      emit('filme:sync', { status: 'done', changedLocal, uploaded: needUpload });
      return 'ok';
    } catch (err) {
      if (err instanceof AuthError) { emit('filme:sync', { status: 'auth' }); return 'auth'; }
      if (err instanceof TypeError) { emit('filme:sync', { status: 'offline' }); return 'offline'; }
      await saveSyncConfig({ lastError: String(err.message || err) });
      emit('filme:sync', { status: 'error' });
      return 'error';
    }
  })().finally(() => { running = null; });
  return running;
}

/** Nach der Anmeldung: Datei anlegen/beitreten (Aktion wurde vor der Weiterleitung gemerkt). */
export async function finishPending() {
  const cfg = await getSyncConfig();
  if (!cfg.pending || !(await getToken())) return null;
  try {
    const who = await whoami();
    await saveSyncConfig({ ...who });
    if (cfg.pending.action === 'create') {
      const f = await createFile(cfg.pending.name || 'Mathub-Filme.json', cfg.pending.folderId || undefined);
      await saveSyncConfig({ fileId: f.id, fileName: f.name, version: null, pending: null });
      await kv.set('filme:sync:dirty', true);
      return { action: 'create', result: await syncNow({ force: true }) };
    }
    if (cfg.pending.action === 'join') {
      await saveSyncConfig({ fileId: cfg.pending.fileId, fileName: cfg.pending.fileName || '', version: null, pending: null });
      const r = await syncNow({ join: true });
      if (r !== 'ok') await saveSyncConfig({ fileId: '', pending: cfg.pending });   // nochmal versuchen können
      return { action: 'join', result: r };
    }
  } catch (err) {
    if (err instanceof AuthError) return { action: cfg.pending.action, result: 'auth' };
    await saveSyncConfig({ lastError: String(err.message || err) });
    return { action: cfg.pending.action, result: 'error' };
  }
  return null;
}

// ---------- Automatik ----------
let timer = null;
let debounce = null;
let started = false;

function startScheduler() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const tick = async () => {
    if (document.visibilityState !== 'visible') return;
    const cfg = await getSyncConfig();
    if (isLinked(cfg) && await getToken()) syncNow();
  };
  timer = setInterval(tick, POLL_MS);
  document.addEventListener('visibilitychange', tick);
  addEventListener('online', tick);
  on('data:changed', async (e) => {
    const film = e?.store === 'items' && e.kind === 'film';
    const sharedKv = e?.store === 'kv' && SHARED_KV.includes(e.type);
    if ((!film && !sharedKv) || e.source === 'sync' || e.source === 'seed') return;
    const cfg = await getSyncConfig();
    if (!isLinked(cfg)) return;
    await kv.set('filme:sync:dirty', true);
    clearTimeout(debounce);
    debounce = setTimeout(() => syncNow(), 1500);
  });
  setTimeout(tick, 1000);
}
