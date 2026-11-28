// Text für Erinnerungen – wird im Service Worker beim Eintreffen eines (leeren) Push-Signals erzeugt.
// Alles passiert lokal: Das Signal von GitHub enthält keine Daten, der Inhalt kommt aus deiner Datenbank.
// Inhalt: Zeilen der Module (reminderNote: Essen des Tages, Film für heute Abend); sonst ein Spruch.

import { openDB } from './db.js';
import { loadSettings, getSettingsSync } from './settings.js';
import { getModules } from './registry.js';
import { today } from './dates.js';
import { QUOTES } from '../modules/hub/home-quotes.js';
import '../modules/index.js';

export const slotForHour = (hour) => (hour < 12 ? 'morgen' : hour < 17 ? 'mittag' : 'abend');

/** @returns {{title, body, url, tag}} */
export async function buildReminder(slot = slotForHour(new Date().getHours())) {
  await openDB();
  await loadSettings();
  const s = getSettingsSync();
  const name = s.profile.name ? `, ${s.profile.name}` : '';
  const notes = await moduleNotes(slot, today());
  const title = slot === 'morgen' ? `Guten Morgen${name} ☀️` : slot === 'abend' ? `Guten Abend${name} 🍿` : `Hallo${name}!`;
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const body = notes.length ? notes.join('\n') : `“${q.text}”${q.src ? ` – ${q.src}` : ''}`;
  return { title, body, url: './#/heute', tag: 'mathub-' + slot };
}

/** Zusatzzeilen der Module (reminderNote(slot, date) → string|null). */
async function moduleNotes(slot, date) {
  const out = [];
  for (const m of getModules()) {
    if (!m.reminderNote) continue;
    try { const n = await m.reminderNote(slot, date); if (n) out.push(n); } catch { /* ignorieren */ }
  }
  return out;
}
