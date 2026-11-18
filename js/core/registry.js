// Modul-Registry: Jede Funktion der App ist ein Modul, das sich hier anmeldet.
// Siehe docs/ARCHITEKTUR.md für alle Felder eines Moduls.

import { entries, items } from './db.js';
import { getSettingsSync } from './settings.js';

const modules = [];
const areas = [];

/** Bereiche gruppieren Module im Hub (z. B. Fitness, später weitere). */
export function registerArea(def) {
  if (!areas.some((a) => a.id === def.id)) areas.push(def);
  areas.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
export const getAreas = () => areas;
export const getArea = (id) => areas.find((a) => a.id === id);

export function registerModule(def) {
  if (!def.id) throw new Error('Modul braucht eine id');
  if (modules.some((m) => m.id === def.id)) throw new Error('Modul doppelt registriert: ' + def.id);
  modules.push(def);
  modules.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export const getModules = () => modules;
export const getModule = (id) => modules.find((m) => m.id === id);
export const getRoutes = () => modules.flatMap((m) => (m.routes || []).map((r) => ({ ...r, module: m })));
export const getTabs = () => modules.filter((m) => m.nav?.tab).sort((a, b) => a.nav.tab - b.nav.tab);
export const getMoreItems = () => modules.filter((m) => m.nav?.more).sort((a, b) => a.nav.more - b.nav.more);

/**
 * Lädt alle Einträge eines Zeitraums einmalig und stellt sie gruppiert bereit.
 * Wird an goals(), summarizeDay(), todayCard() und charts übergeben.
 */
export async function loadDays(from, to) {
  const [list, allItems, extList] = await Promise.all([
    entries.range(from, to),
    items.all(),
    Promise.all(modules.filter((m) => m.loadData).map(async (m) => {
      try { return [m.id, await m.loadData(from, to)]; } catch (err) { console.error(err); return [m.id, null]; }
    })),
  ]);
  const byKind = new Map();
  for (const it of allItems) (byKind.get(it.kind) || byKind.set(it.kind, []).get(it.kind)).push(it);
  const byDay = new Map();
  for (const e of list) {
    let d = byDay.get(e.date);
    if (!d) { d = {}; byDay.set(e.date, d); }
    (d[e.type] ||= []).push(e);
  }
  return {
    from, to, byDay,
    itemsOf: (kind) => byKind.get(kind) || [],
    ext: Object.fromEntries(extList),   // Zusatzdaten der Module (loadData), z. B. ext.termine
    settings: getSettingsSync(),
    get: (date, type) => byDay.get(date)?.[type] || [],
    first: (date, type) => byDay.get(date)?.[type]?.[0] || null,
  };
}

/**
 * Läuft beim Start vor dem Router (z. B. Rückkehr von einer Anmeldung mit Daten im URL-Fragment).
 * Ein Modul kann mit launch() → true signalisieren, dass es die URL bereits angepasst hat.
 */
export async function runLaunchHooks() {
  for (const m of modules) {
    if (!m.launch) continue;
    try { await m.launch(); } catch (err) { console.error(err); }
  }
}

/** Sammelt die Tagesziele aller Module: [{id, module, label, detail, done, progress, route}] */
export function goalsForDay(date, data) {
  return modules.flatMap((m) => (m.goals ? (m.goals(date, data) || []).map((g) => ({ module: m.id, ...g })) : []));
}

export function dayScore(date, data) {
  const goals = goalsForDay(date, data);
  if (!goals.length) return { goals, done: 0, total: 0, ratio: null };
  const done = goals.filter((g) => g.done).length;
  return { goals, done, total: goals.length, ratio: done / goals.length };
}

/** Kurze Textzeilen pro Modul für einen Tag (Kalender, Rückblick). */
export function summarizeDay(date, data) {
  return modules.flatMap((m) => (m.summarizeDay ? (m.summarizeDay(date, data) || []).map((text) => ({ module: m, text })) : []));
}
