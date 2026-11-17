// Einstellungen: Defaults + gespeicherte Werte (kv 'settings'), synchron lesbar nach loadSettings().

import { kv } from './db.js';
import { emit } from './events.js';

export const DEFAULT_SETTINGS = {
  profile: { name: '', heightCm: null, birthYear: null, sex: '', activity: 1.55 },
  targets: { weightGoal: null, kcal: null, protein: null, waterMl: 2500, sleepH: 8 },
  prefs: {
    theme: 'dark',              // 'dark' | 'light' | 'system'
    weighDaily: true,           // tägliches Wiegen als Tagesziel
    measureFields: ['chest', 'waist', 'hips', 'arm', 'thigh'],
    streakThreshold: 80,        // % der Tagesziele, damit ein Tag für die Serie zählt
    kcalTolerance: 10,          // ± % um das Kalorienziel
    waterSteps: [250, 500],
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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#f4f5f8' : '#0e1014';
}
