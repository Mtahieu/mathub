// Titelbilder für Filme – werden auf dem Gerät von Wikipedia geladen, nicht im Repo gespeichert.
//
// Katalogfilme: Bild des hinterlegten englischen Wikipedia-Artikels (wiki).
// Eigene Filme: Wikipedia-Suche nach „<Titel> film“, erster Treffer.
// Ergebnis (Bild-URL + Artikel) wird in kv 'filme:poster' gemerkt; die Bilddatei selbst speichert der
// Service Worker (Cache 'posters-v1'), damit sie offline sichtbar bleibt. Ohne Netz/Treffer: Emoji-Kachel.

import { kv } from '../../core/db.js';

const API = 'https://en.wikipedia.org/w/api.php';
const RETRY_MISS_MS = 7 * 24 * 3600 * 1000;   // „kein Bild gefunden“ nach einer Woche erneut versuchen
const KEY = 'filme:poster';

let memo = null;
const pending = new Map();

async function cache() {
  if (!memo) memo = await kv.get(KEY, {});
  return memo;
}

async function remember(k, value) {
  const c = await cache();
  c[k] = { ...value, at: Date.now() };
  await kv.set(KEY, c);
}

export const posterKey = (f) => (f.wiki ? 'wiki:' + f.wiki : 'search:' + String(f.title || '').trim().toLowerCase());

/** Bereits bekanntes Ergebnis ohne Netz (oder undefined, wenn noch nie gesucht). */
export async function knownPoster(f) {
  const hit = (await cache())[posterKey(f)];
  if (!hit) return undefined;
  if (!hit.url && Date.now() - hit.at > RETRY_MISS_MS) return undefined;
  return hit;
}

async function query(params) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
    prop: 'pageimages|info', inprop: 'url', piprop: 'thumbnail', pithumbsize: '500', pilicense: 'any',
    ...params,
  });
  const res = await fetch(`${API}?${p}`);
  if (!res.ok) throw new Error('Wikipedia ' + res.status);
  const pages = (await res.json()).query?.pages || [];
  const page = pages.filter((x) => !x.missing).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
  return page ? { url: page.thumbnail?.source || null, page: page.fullurl || null, pageTitle: page.title } : { url: null, page: null };
}

/**
 * Titelbild suchen: {url, page, pageTitle} oder null.
 * Fehler (offline) werden nicht gemerkt – beim nächsten Öffnen wird es erneut versucht.
 */
export function findPoster(f) {
  const k = posterKey(f);
  if (pending.has(k)) return pending.get(k);
  const run = (async () => {
    const known = await knownPoster(f);
    if (known !== undefined) return known.url ? known : null;
    if (globalThis.navigator && navigator.onLine === false) return null;
    try {
      let r = f.wiki ? await query({ titles: f.wiki }) : { url: null };
      if (!r.url && f.title) {
        r = await query({ generator: 'search', gsrsearch: `${f.title} film`, gsrlimit: '1', gsrnamespace: '0' });
      }
      await remember(k, r);
      return r.url ? r : null;
    } catch {
      return null;
    }
  })().finally(() => pending.delete(k));
  pending.set(k, run);
  return run;
}

/** Für „Bild neu suchen“ nach dem Umbenennen eines eigenen Films. */
export async function forgetPoster(f) {
  const c = await cache();
  delete c[posterKey(f)];
  await kv.set(KEY, c);
}
