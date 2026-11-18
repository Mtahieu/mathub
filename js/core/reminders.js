// Text für Erinnerungen – wird im Service Worker beim Eintreffen eines (leeren) Push-Signals erzeugt.
// Alles passiert lokal: Das Signal von GitHub enthält keine Daten, der Inhalt kommt aus deiner Datenbank.

import { openDB, kv } from './db.js';
import { loadSettings, getSettingsSync } from './settings.js';
import { dayScore, getModules } from './registry.js';
import { computeStreaks } from './streaks.js';
import { today } from './dates.js';
import '../modules/index.js';

export const slotForHour = (hour) => (hour < 12 ? 'morgen' : hour < 17 ? 'mittag' : 'abend');

const list = (goals, max = 4) => {
  const names = goals.map((g) => g.label);
  return names.length > max ? names.slice(0, max).join(', ') + ` +${names.length - max}` : names.join(', ');
};

/** @returns {{title, body, url, tag}} */
export async function buildReminder(slot = slotForHour(new Date().getHours())) {
  await openDB();
  await loadSettings();
  const s = getSettingsSync();
  const name = s.profile.name ? `, ${s.profile.name}` : '';
  const st = await computeStreaks();
  const t = today();
  const sc = dayScore(t, st.data);
  const open = sc.goals.filter((g) => !g.done);
  const streak = st.current;
  const url = './#/heute';

  if (!sc.total) {
    const notes = await moduleNotes(slot, t);
    if (notes.length) return { title: `Hallo${name}!`, body: notes.join('\n'), url, tag: 'mathub-' + slot };
    return { title: `Hallo${name}!`, body: 'Lege in Mathub deine Ziele fest, dann erinnere ich dich gezielt.', url, tag: 'mathub-' + slot };
  }

  if (slot === 'morgen') {
    const line = open.length ? `Heute steht an: ${list(open)}.` : 'Heute ist schon alles erledigt.';
    const st2 = streak ? ` Serie: ${streak} ${streak === 1 ? 'Tag' : 'Tage'} – weiter so!` : '';
    const notes = await moduleNotes(slot, t);
    return { title: `Guten Morgen${name} ☀️`, body: [line + st2, ...notes].join('\n'), url, tag: 'mathub-morgen' };
  }

  if (!open.length) {
    return {
      title: 'Alles geschafft 💪',
      body: `Alle ${sc.total} Tagesziele erfüllt.${streak ? ` Serie: ${streak} ${streak === 1 ? 'Tag' : 'Tage'}.` : ''}`,
      url, tag: 'mathub-' + slot,
    };
  }

  const need = Math.max(0, Math.ceil(st.threshold * sc.total - 1e-9) - sc.done);
  const detail = open.slice(0, 4).map((g) => (g.detail ? `${g.label} (${g.detail})` : g.label)).join(' · ');
  const streakLine = need > 0 && streak > 0
    ? `Für deine ${streak}-Tage-Serie fehlen noch ${need} ${need === 1 ? 'Ziel' : 'Ziele'}.`
    : need === 0 ? 'Die Serie ist für heute schon gesichert.' : '';
  return {
    title: `Noch ${open.length} ${open.length === 1 ? 'Ziel' : 'Ziele'} offen`,
    body: [detail, streakLine].filter(Boolean).join('\n'),
    url, tag: 'mathub-' + slot,
  };
}

/** Zusatzzeilen der Module (reminderNote(slot, date) → string|null), z. B. Essensplan. */
async function moduleNotes(slot, date) {
  const out = [];
  for (const m of getModules()) {
    if (!m.reminderNote) continue;
    try { const n = await m.reminderNote(slot, date); if (n) out.push(n); } catch { /* ignorieren */ }
  }
  return out;
}

export async function lastReminderInfo() {
  return kv.get('push:last', null);
}
