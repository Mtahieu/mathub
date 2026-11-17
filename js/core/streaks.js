// Serien (Streaks): Ein Tag zählt, wenn mindestens prefs.streakThreshold % der Tagesziele erfüllt sind.
// Tage ohne Ziele sind neutral. Ist heute noch nicht geschafft, zählt die Serie bis gestern.

import { kv, entries } from './db.js';
import { loadDays, dayScore } from './registry.js';
import { today, dayRange, keyFromTs } from './dates.js';
import { getSettingsSync } from './settings.js';

export async function startDate() {
  const inst = await kv.get('installedAt');
  const first = await entries.firstDate();
  const instKey = inst ? keyFromTs(inst) : today();
  return first && first < instKey ? first : instKey;
}

export const threshold = () => (getSettingsSync().prefs.streakThreshold ?? 80) / 100;
export const isSuccess = (r, thr = threshold()) => r.ratio != null && r.ratio >= thr - 1e-9;

export async function computeStreaks() {
  const t = today();
  const from = await startDate();
  const data = await loadDays(from, t);
  const thr = threshold();
  const days = dayRange(from, t).map((date) => ({ date, ...dayScore(date, data) }));

  let best = 0, run = 0;
  for (const r of days) {
    if (r.ratio == null) continue;
    if (isSuccess(r, thr)) { run++; best = Math.max(best, run); } else run = 0;
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const r = days[i];
    if (r.ratio == null) continue;
    if (isSuccess(r, thr)) current++;
    else if (i === days.length - 1) continue; // heute noch offen
    else break;
  }
  return { current, best, days, data, from, to: t, threshold: thr };
}
