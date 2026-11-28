// Teilen per WhatsApp – ohne Konto, ohne Server, ohne Registrierung.
//
// Absender: Nach jeder Änderung an Filmen oder Rezepten (gesehen, bewertet, gegessen, „Heute Abend“, neue Filme …)
// erscheint unten das Banner „Jetzt teilen“. Ein Tipp öffnet WhatsApp direkt (auf Wunsch gleich im Chat der
// hinterlegten Nummer) mit einer fertigen Nachricht samt Link. Der Link enthält die Änderungen komprimiert.
// Empfänger: tippt den Link in WhatsApp an → Mathub öffnet sich und übernimmt alles automatisch.
//
// Inhalt: vollständige Datensätze (Filme inkl. Lösch-Markierungen, Rezept-Bewertungen, gegessene Rezepte,
// geteilte Werte wie „Heute Abend“). Neue Felder sind automatisch dabei. Zusammenführen: pro Datensatz
// gewinnt der neuere (updatedAt). Standard: nur Änderungen seit dem letzten Teilen; „Alles senden“ für Neue.
//
// kv 'teilen'  {phone, lastSharedAt, pending}  – pending = Anzahl ungeteilter Änderungen

import { registerModule } from '../../core/registry.js';
import { items, kv } from '../../core/db.js';
import { emit, on } from '../../core/events.js';
import { getSettingsSync, updateSettings } from '../../core/settings.js';
import { h, icon, card, pageHeader, field, textInput, toast } from '../../core/ui.js';
import { allFilms, getSharedRecord, setShared, seedOnce, me, SHARED_KV, EXTRA_SYNC_KINDS } from './filme-store.js';

const APP = 'mathub';
const PAYLOAD_VERSION = 1;

// ---------- Konfiguration ----------
export async function shareConfig() {
  return { phone: '', lastSharedAt: 0, pending: 0, ...(await kv.get('teilen', {})) };
}
async function saveShareConfig(patch) {
  const c = { ...(await shareConfig()), ...patch };
  await kv.set('teilen', c);
  emit('teilen:changed', c);
  return c;
}

export const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');

// ---------- Kodieren ----------
const toB64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function encode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') {
    const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return 'z' + toB64url(z);
  }
  return 'j' + toB64url(raw);
}

async function decode(code) {
  const kind = code[0]; const bytes = fromB64url(code.slice(1));
  let raw = bytes;
  if (kind === 'z') raw = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  else if (kind !== 'j') throw new Error('Unbekanntes Format');
  return JSON.parse(new TextDecoder().decode(raw));
}

// ---------- Paket bauen ----------
const ts = (r) => Number(r?.updatedAt) || 0;

async function buildPayload({ since = 0 } = {}) {
  await seedOnce();
  const newer = (r) => ts(r) > since;
  const films = (await allFilms({ withDeleted: true })).filter(newer);
  const extra = {};
  for (const kind of EXTRA_SYNC_KINDS) {
    const list = (await items.all(kind)).filter(newer);
    if (list.length) extra[kind] = list;
  }
  const shared = {};
  for (const k of SHARED_KV) { const r = await getSharedRecord(k); if (r && newer(r)) shared[k] = r; }
  return { a: APP, v: PAYLOAD_VERSION, from: me(), at: Date.now(), films, items: extra, shared };
}

function summarize(p) {
  const parts = [];
  const f = p.films.length; const r = p.items.rating?.length || 0; const g = p.items.gegessen?.length || 0;
  if (f) parts.push(`${f} ${f === 1 ? 'Film' : 'Filme'}`);
  if (r) parts.push(`${r} ${r === 1 ? 'Bewertung' : 'Bewertungen'}`);
  if (g) parts.push(`${g}× gegessen`);
  if (p.shared['filme:heute']) parts.push('Film für heute Abend');
  return parts.join(', ');
}

/** Nachricht + WhatsApp-Adresse bauen (null, wenn es nichts zu teilen gibt). */
export async function buildShareMessage({ full = false } = {}) {
  const cfg = await shareConfig();
  const payload = await buildPayload({ since: full ? 0 : cfg.lastSharedAt });
  const count = payload.films.length + Object.values(payload.items).reduce((a, l) => a + l.length, 0) + Object.keys(payload.shared).length;
  if (!count) return null;
  const link = `${appUrl()}#/teilen?d=${await encode(payload)}`;
  const name = me();
  const msg = `🍿🍲 Mathub${name ? ` von ${name}` : ''}: ${summarize(payload)}.\nZum Übernehmen antippen:\n${link}`;
  const phone = String(cfg.phone || '').replace(/[^\d]/g, '');
  const url = `whatsapp://send?${phone ? `phone=${phone}&` : ''}text=${encodeURIComponent(msg)}`;
  return { msg, url, link, at: payload.at, count };
}

/** WhatsApp mit fertiger Nachricht öffnen. full=true: alles senden (z. B. für jemand Neues). */
export async function shareNow({ full = false } = {}) {
  const built = await buildShareMessage({ full });
  if (!built) { toast('Nichts Neues zu teilen'); return false; }
  const { msg, url } = built;
  await saveShareConfig({ lastSharedAt: built.at, pending: 0 });
  location.href = url;
  // Kein WhatsApp? Dann den Teilen-Dialog des Handys anbieten.
  setTimeout(() => {
    if (document.visibilityState === 'visible' && navigator.share) navigator.share({ text: msg }).catch(() => {});
  }, 1800);
  return true;
}

// ---------- Übernehmen ----------
const normTitle = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();

/** Pro id gewinnt der neuere Datensatz. */
function newerWins(local, incoming) {
  return !local || ts(incoming) > ts(local);
}

/** Gleiche Filme mit verschiedener id (Katalogfilm oder gleicher Titel) zu einem zusammenfassen. */
async function dedupeFilms() {
  const alive = await allFilms();
  const groups = new Map();
  for (const f of alive) {
    const key = f.catalogId ? 'c:' + f.catalogId : 't:' + normTitle(f.title);
    (groups.get(key) || groups.set(key, []).get(key)).push(f);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => ts(b) - ts(a) || (a.id < b.id ? -1 : 1));
    const [keep, ...dups] = list;
    const watched = list.find((x) => x.watched);
    if (watched && !keep.watched) await items.putRaw({ ...keep, watched: true, watchedAt: watched.watchedAt, updatedAt: Date.now() }, { source: 'import' });
    for (const d of dups) await items.putRaw({ id: d.id, kind: 'film', catalogId: d.catalogId, title: d.title, deleted: true, createdAt: d.createdAt, updatedAt: Date.now() }, { source: 'import' });
  }
}

export async function importPayload(p) {
  if (p?.a !== APP || !Array.isArray(p.films)) throw new Error('Das ist kein Mathub-Link.');
  await seedOnce();
  let changed = 0;
  const apply = async (rec, kind) => {
    if (!rec?.id) return;
    const local = await items.get(rec.id);
    if (newerWins(local, rec)) { await items.putRaw({ ...rec, kind }, { source: 'import' }); changed++; }
  };
  for (const f of p.films) await apply(f, 'film');
  for (const kind of EXTRA_SYNC_KINDS) for (const r of p.items?.[kind] || []) await apply(r, kind);
  for (const [k, rec] of Object.entries(p.shared || {})) {
    if (!SHARED_KV.includes(k)) continue;
    const local = await getSharedRecord(k);
    if (!local || ts(rec) > ts(local)) { await setShared(k, null, { source: 'import', record: rec }); changed++; }
  }
  await dedupeFilms();
  emit('teilen:import', { changed, from: p.from });
  return { changed, from: p.from || 'jemandem' };
}

async function takeOver(code) {
  try {
    const r = await importPayload(await decode(code));
    setTimeout(() => toast(r.changed ? `Übernommen von ${r.from}: ${r.changed} ${r.changed === 1 ? 'Änderung' : 'Änderungen'}` : `Von ${r.from} – schon alles aktuell`, { duration: 4000 }), 400);
  } catch (err) {
    setTimeout(() => toast('Link konnte nicht übernommen werden: ' + (err.message || err), { duration: 5000 }), 400);
  }
}

/** Beim Start: Mathub wurde über einen geteilten Link geöffnet. */
async function launch() {
  const m = location.hash.match(/^#\/teilen\?d=([\w-]+)/);
  if (m) {
    history.replaceState(null, '', location.pathname + location.search + '#/filme');
    await takeOver(m[1]);
  }
  startBanner();
}

// ---------- Banner „Jetzt teilen“ ----------
let bannerEl = null;

async function updateBanner() {
  const cfg = await shareConfig();
  document.body.classList.toggle('share-open', !!cfg.pending);
  if (!cfg.pending) { bannerEl?.classList.remove('show'); return; }
  if (!bannerEl) {
    bannerEl = h('div', { class: 'share-banner', role: 'status' });
    document.getElementById('overlay-root')?.append(bannerEl);
  }
  bannerEl.replaceChildren(
    h('span', { class: 'share-banner-text' }, `${cfg.pending} ${cfg.pending === 1 ? 'Änderung' : 'Änderungen'} noch nicht geteilt`),
    h('button', { class: 'btn btn-primary small', onclick: () => shareNow() }, '💬 Jetzt teilen'),
    h('button', { class: 'icon-btn small', 'aria-label': 'Später', onclick: () => { bannerEl.classList.remove('show'); document.body.classList.remove('share-open'); } }, icon('x', 18)));
  requestAnimationFrame(() => bannerEl.classList.add('show'));
}

let started = false;
function startBanner() {
  if (started || typeof document === 'undefined') return;
  started = true;
  on('data:changed', async (e) => {
    const relevant = (e?.store === 'items' && (e.kind === 'film' || EXTRA_SYNC_KINDS.includes(e.kind)))
      || (e?.store === 'kv' && SHARED_KV.includes(e.type));
    if (!relevant || ['import', 'seed'].includes(e.source)) return;
    const cfg = await shareConfig();
    await saveShareConfig({ pending: (cfg.pending || 0) + 1 });
    updateBanner();
  });
  setTimeout(updateBanner, 600);
}

// ---------- Seite: Teilen-Einstellungen ----------
async function render(el, ctx) {
  // Link angetippt, während Mathub schon offen war
  if (ctx.query.d) {
    await takeOver(ctx.query.d);
    ctx.navigate('/filme', {}, { replace: true });
    return;
  }
  const cfg = await shareConfig();
  const s = getSettingsSync();
  el.append(pageHeader('Teilen', { eyebrow: 'Filme & Rezepte', actions: h('a', { class: 'icon-btn', href: '#/filme', 'aria-label': 'Zurück' }, icon('x')) }));
  const name = textInput({ value: s.profile.name, placeholder: 'z. B. Mathieu', maxlength: 40 });
  const phone = textInput({ value: cfg.phone, placeholder: 'z. B. 49170 1234567' });
  phone.setAttribute('inputmode', 'tel');
  el.append(card('So geht’s', { iconName: 'share' },
    h('ol', { class: 'steps small' },
      h('li', null, 'Du änderst etwas – z. B. Film gesehen, Rezept bewertet oder gegessen.'),
      h('li', null, 'Unten erscheint „Jetzt teilen“ → WhatsApp öffnet sich mit einer fertigen Nachricht.'),
      h('li', null, 'Die andere Person tippt in WhatsApp auf den Link – Mathub übernimmt alles automatisch.')),
    h('p', { class: 'small muted' }, 'Kein Konto, keine Anmeldung. Geteilt werden Filme, Gesehen-Haken, Bewertungen, „Heute Abend“ sowie gegessene und bewertete Rezepte.')));
  el.append(card('Einstellungen', { iconName: 'settings' },
    field('Dein Name (steht bei deinen Änderungen)', name),
    field('WhatsApp-Nummer der anderen Person (optional)', phone, 'Mit Ländervorwahl, ohne + und 0 – dann öffnet sich direkt euer Chat. Leer = WhatsApp fragt, an wen.'),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ profile: { name: name.value.trim() } });
        await saveShareConfig({ phone: phone.value.trim() });
        toast('Gespeichert');
        ctx.refresh();
      },
    }, 'Speichern')));
  el.append(card('Teilen', { iconName: 'film' },
    h('p', { class: 'small muted' }, cfg.pending ? `${cfg.pending} Änderungen seit dem letzten Teilen.` : 'Alles geteilt.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', onclick: () => shareNow() }, '💬 Änderungen teilen'),
      h('button', { class: 'btn', onclick: () => shareNow({ full: true }) }, 'Alles senden')),
    h('p', { class: 'small muted' }, '„Alles senden“ ist für jemanden, der neu dazukommt oder etwas verpasst hat.')));
}

registerModule({
  id: 'teilen',
  area: 'hub',
  title: 'Teilen',
  order: 96,
  routes: [{ path: '/teilen', render }],
  launch,
});
