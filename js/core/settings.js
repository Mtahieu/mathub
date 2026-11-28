// Einstellungen: Defaults + gespeicherte Werte (kv 'settings'), synchron lesbar nach loadSettings().

import { kv } from './db.js';
import { emit } from './events.js';
import { applyDesign, DEFAULT_DESIGN } from './theme.js';

export const DEFAULT_SETTINGS = {
  profile: { name: '', heightCm: null, birthYear: null, sex: '', activity: 1.55, weightKg: null },
  targets: { weightGoal: null, kcal: null, protein: null, sleepH: 8 },
  prefs: {
    theme: 'dark',              // 'dark' | 'light' | 'system'
    design: { ...DEFAULT_DESIGN }, // Farbschema, eigene Akzentfarbe, Form, Schrift (siehe core/theme.js)
    weighDaily: false,          // Wiegen als Tagesziel (optional, standardmäßig aus)
    measureFields: ['chest', 'waist', 'hips', 'arm', 'thigh'],
    streakThreshold: 80,        // % der Tagesziele, damit ein Tag für die Serie zählt
    kcalTolerance: 10,          // (bis 0.4 genutzt)
    food: {                     // Ernährung: Wochenplan & Einkaufsliste
      officeDays: [1, 2, 3],    // Bürotage (0 = Mo) → mittags Kantine
      servings: 1,              // Personen für die Einkaufsliste
      diet: 'alle',             // alle | pesc | vegetarisch | vegan
      maxTime: 30,              // max. Kochzeit unter der Woche (Min.)
      leftovers: true,          // Reste vom Vorabend fürs Remote-Mittagessen
      autoSnacks: true,         // Snacks bis zum Kalorienziel auffüllen
      preferFav: true,          // gut bewertete Rezepte bevorzugen
      canteenKcal: 850,         // Schätzung Salatbowl + Dessert
      canteenProtein: 28,
      fasting: true,            // Intervallfasten: kein Frühstück im Plan
      equipment: ['herd', 'ofen', 'airfryer'],
      preferAirfryer: true,
      outDays: [],              // Wochentage (0 = Mo), an denen abends regelmäßig auswärts gegessen wird
      outKcal: 1000,            // Schätzung Restaurant-Mahlzeit
      outProtein: 35,
    },
  },
  backup: { lastAt: null, remindDays: 14 },
};

let cache = null;

function merge(base, over) {
  if (over === undefined) return base;
  if (Array.isArray(base) || Array.isArray(over)) return over;
  if (base && typeof base === 'object' && over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }
  return over;
}

export async function loadSettings() {
  cache = merge(DEFAULT_SETTINGS, await kv.get('settings', {}));
  return cache;
}

export function getSettingsSync() {
  return cache || DEFAULT_SETTINGS;
}

export async function updateSettings(patch) {
  cache = merge(getSettingsSync(), patch);
  await kv.set('settings', cache);
  applyTheme();
  emit('settings:changed', cache);
  return cache;
}

export function applyTheme() {
  const t = getSettingsSync().prefs.theme;
  const resolved = t === 'system'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : t;
  document.documentElement.dataset.theme = resolved;
  const vars = applyDesign(getSettingsSync().prefs.design, resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = vars['--bg'];
}
