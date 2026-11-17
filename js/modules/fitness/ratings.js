// Bewertungen von Übungen (1–5 Sterne). Die App merkt sich die aktuelle Meinung und den Verlauf.
// items kind 'rating': {id:'rating:<key>', key, stars, history:[{date, stars}]}
// key = catalogId (Katalogübung) oder exercise.id (eigene Übung) – so teilen sich Katalog und Plan eine Bewertung.

import { items } from '../../core/db.js';
import { today } from '../../core/dates.js';

export const ratingKey = (ex) => ex?.catalogId || ex?.id;

export async function loadRatings() {
  const list = await items.all('rating');
  return new Map(list.map((r) => [r.key, r]));
}

export async function rate(key, stars, date = today()) {
  if (!key) return null;
  const id = 'rating:' + key;
  const existing = await items.get(id);
  if (!stars) {
    if (existing) await items.delete(id);
    return null;
  }
  const history = (existing?.history || []).filter((h) => h.date !== date);
  history.push({ date, stars });
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  return items.put({ ...(existing || {}), id, kind: 'rating', key, stars, history: history.slice(-100) });
}

export function avgStars(rec) {
  if (!rec?.history?.length) return rec?.stars ?? null;
  return rec.history.reduce((a, h) => a + h.stars, 0) / rec.history.length;
}

export const isFavorite = (rec) => (rec?.stars ?? 0) >= 4;
export const isDisliked = (rec) => rec?.stars != null && rec.stars <= 2;
