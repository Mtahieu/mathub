// Bewertungen (1–5 Sterne) für Rezepte. Die App merkt sich die aktuelle Meinung und den Verlauf.
// items kind 'rating': {id:'rating:<key>', key, stars, history:[{date, stars, by?}], updatedBy?, deleted?}
// key = Rezept-Schlüssel (früher auch Übungen; alte Bewertungen bleiben gespeichert).
// Wird mit der gemeinsamen Liste geteilt; Entfernen = Markierung {deleted:true}.

import { items } from '../../core/db.js';
import { today } from '../../core/dates.js';
import { me } from '../freizeit/filme-store.js';

export const ratingKey = (ex) => ex?.catalogId || ex?.id;

export async function loadRatings() {
  const list = (await items.all('rating')).filter((r) => !r.deleted);
  return new Map(list.map((r) => [r.key, r]));
}

export async function rate(key, stars, date = today()) {
  if (!key) return null;
  const id = 'rating:' + key;
  const existing = await items.get(id);
  const by = me();
  if (!stars) {
    if (existing && !existing.deleted) await items.put({ id, kind: 'rating', key, deleted: true, history: existing.history || [], createdAt: existing.createdAt, ...(by ? { updatedBy: by } : {}) });
    return null;
  }
  const history = (existing?.history || []).filter((h) => h.date !== date);
  history.push({ date, stars, ...(by ? { by } : {}) });
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  const rec = { ...(existing || {}), id, kind: 'rating', key, stars, history: history.slice(-100) };
  delete rec.deleted;
  if (by) rec.updatedBy = by;
  return items.put(rec);
}

export function avgStars(rec) {
  if (!rec?.history?.length) return rec?.stars ?? null;
  return rec.history.reduce((a, h) => a + h.stars, 0) / rec.history.length;
}

export const isFavorite = (rec) => (rec?.stars ?? 0) >= 4;
export const isDisliked = (rec) => rec?.stars != null && rec.stars <= 2;
