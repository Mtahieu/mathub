// Gegessene Rezepte – wird (wie Bewertungen) mit der gemeinsamen Liste geteilt.
// items kind 'gegessen': {id:'gegessen:<datum>:<rezeptId>', recipeId, date, slot?, updatedBy?, deleted?}
// Entfernen = Markierung {deleted:true}, damit es auch auf anderen Geräten verschwindet.

import { items } from '../../core/db.js';
import { me } from '../freizeit/filme-store.js';

const idOf = (recipeId, date) => `gegessen:${date}:${recipeId}`;

export async function allEaten() {
  return (await items.all('gegessen')).filter((e) => !e.deleted);
}

export async function markEaten(recipeId, date, slot) {
  const by = me();
  return items.put({ id: idOf(recipeId, date), kind: 'gegessen', recipeId, date, slot: slot || null, ...(by ? { updatedBy: by } : {}) });
}

export async function unmarkEaten(recipeId, date) {
  const it = await items.get(idOf(recipeId, date));
  if (!it || it.deleted) return;
  const by = me();
  await items.put({ id: it.id, kind: 'gegessen', recipeId, date, deleted: true, createdAt: it.createdAt, ...(by ? { updatedBy: by } : {}) });
}

/** {byRecipe: Map(recipeId → [Einträge, neueste zuerst]), byDate: Map(datum → Set(recipeId))} */
export async function eatenIndex() {
  const byRecipe = new Map();
  const byDate = new Map();
  for (const e of (await allEaten()).sort((a, b) => (a.date < b.date ? 1 : -1))) {
    (byRecipe.get(e.recipeId) || byRecipe.set(e.recipeId, []).get(e.recipeId)).push(e);
    (byDate.get(e.date) || byDate.set(e.date, new Set()).get(e.date)).add(e.recipeId);
  }
  return { byRecipe, byDate };
}
