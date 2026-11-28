// Filme – lokale Datenhaltung. Alle Zugriffe auf Film-Daten laufen hier durch, damit der Abgleich
// mit der gemeinsamen Liste (filme-sync.js) jede Änderung mitbekommt.
//
// items kind 'film': vollständiger Datensatz, wird 1:1 geteilt – neue Felder sind automatisch dabei.
//   Gelöschte Filme bleiben als {deleted: true} stehen, damit die Löschung bei allen ankommt.
// SHARED_KV: weitere geteilte Werte rund um Filme, je {value, updatedAt, updatedBy}.
//   Neuer geteilter Wert → Schlüssel hier eintragen, fertig.

import { items, kv } from '../../core/db.js';
import { emit } from '../../core/events.js';
import { FILM_CATALOG } from './filme-data.js';

export const SHARED_KV = ['filme:heute'];

/**
 * Weitere item-Arten, die mit der gemeinsamen Datei geteilt werden (pro id gewinnt der neuere Datensatz).
 * rating = Rezept-Bewertungen, gegessen = gegessene Rezepte. Neue Art → hier eintragen; die Datensätze
 * brauchen eine feste id, updatedAt (items.put) und beim Löschen {deleted:true} statt items.delete.
 */
export const EXTRA_SYNC_KINDS = ['rating', 'gegessen'];
const SEED_TS = Date.parse('2026-11-17');   // Startliste – älter als jede spätere Änderung

let whoAmI = '';
/** Name, der bei Änderungen mitgespeichert wird (aus dem verknüpften Google-Konto). */
export const setMe = (name) => { whoAmI = name || ''; };
export const me = () => whoAmI;

export const catalogItemId = (catalogId) => 'film:' + catalogId;

export async function seedOnce() {
  if (await kv.get('filme:seeded', false)) return;
  for (const f of FILM_CATALOG) {
    await items.putRaw({
      id: catalogItemId(f.id), kind: 'film', catalogId: f.id, title: f.title, year: f.year, runtime: f.runtime,
      genres: f.genres, moods: f.moods, intensity: f.intensity, emoji: f.emoji, watched: false,
      createdAt: SEED_TS, updatedAt: SEED_TS,
    }, { source: 'seed' });
  }
  await kv.set('filme:seeded', true);
}

/** Alle Film-Datensätze; mit withDeleted auch gelöschte (für den Abgleich). */
export async function allFilms({ withDeleted = false } = {}) {
  const list = await items.all('film');
  return withDeleted ? list : list.filter((f) => !f.deleted);
}

export const getFilm = (id) => items.get(id);

/** Änderung speichern (setzt updatedAt neu und merkt, wer es war). */
export async function saveFilm(rec) {
  const out = { ...rec, kind: 'film' };
  if (whoAmI) out.updatedBy = whoAmI;
  return items.put(out);
}

export async function patchFilm(id, patch) {
  const it = await items.get(id);
  if (!it) return null;
  return saveFilm({ ...it, ...patch });
}

/** Löschen = Markierung, damit andere Geräte die Löschung übernehmen. */
export async function deleteFilm(id) {
  const it = await items.get(id);
  if (!it) return;
  const tombstone = { id: it.id, kind: 'film', catalogId: it.catalogId, title: it.title, deleted: true, createdAt: it.createdAt };
  await saveFilm(tombstone);
  const t = await getShared('filme:heute');
  if (t?.filmId === id) await setShared('filme:heute', null);
}

// ---------- geteilte Werte ----------
export async function getSharedRecord(key) {
  const raw = await kv.get(key, null);
  if (raw && typeof raw === 'object' && 'updatedAt' in raw && 'value' in raw) return raw;
  // ältere Form ohne Zeitstempel (vor 0.12) – als sehr alt behandeln
  return raw == null ? null : { value: raw, updatedAt: 0 };
}

export async function getShared(key) {
  return (await getSharedRecord(key))?.value ?? null;
}

export async function setShared(key, value, { source, record } = {}) {
  const rec = record || { value, updatedAt: Date.now(), ...(whoAmI ? { updatedBy: whoAmI } : {}) };
  await kv.set(key, rec);
  emit('data:changed', { store: 'kv', type: key, source });
}
