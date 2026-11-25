// Lokale Datenbank (IndexedDB). Alle Daten bleiben auf dem Gerät.
//
// Stores:
//   entries  – alles, was einem Tag zugeordnet ist: {id, type, date:'YYYY-MM-DD', data:{…}, createdAt, updatedAt}
//              Neue Funktionen brauchen meist nur einen neuen `type` – keine Schema-Änderung.
//   items    – Stammdaten/Konfiguration: {id, kind, …felder, createdAt, updatedAt} (z. B. kind:'supplement')
//   kv       – Schlüssel/Wert (Einstellungen, Metadaten): {key, value} – Schlüssel mit 'tmp:' landen nicht im Backup
//
// Schema-Änderungen (neue Stores/Indizes): DB_VERSION erhöhen + Block in upgradeSchema().
// Datenumbauten (Felder umbenennen o. ä.): DATA_VERSION erhöhen + Eintrag in MIGRATIONS.

import { emit } from './events.js';

const DB_NAME = 'mathub';
export const DB_VERSION = 1;
export const DATA_VERSION = 4;

let dbPromise = null;

function upgradeSchema(db, oldVersion) {
  if (oldVersion < 1) {
    const en = db.createObjectStore('entries', { keyPath: 'id' });
    en.createIndex('type', 'type');
    en.createIndex('date', 'date');
    en.createIndex('type_date', ['type', 'date']);
    const it = db.createObjectStore('items', { keyPath: 'id' });
    it.createIndex('kind', 'kind');
    db.createObjectStore('kv', { keyPath: 'key' });
  }
  // if (oldVersion < 2) { … }
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB wird von diesem Browser nicht unterstützt.'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => upgradeSchema(req.result, ev.oldVersion);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); if (globalThis.document) location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('Datenbank blockiert – bitte andere Tabs der App schließen.');
  });
  return dbPromise;
}

const wrap = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

async function withStore(names, mode, fn) {
  const db = await openDB();
  const tx = db.transaction(names, mode);
  const done = new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Transaktion abgebrochen'));
  });
  const stores = Array.isArray(names) ? names.map((n) => tx.objectStore(n)) : tx.objectStore(names);
  const result = await fn(stores);
  await done;
  return result;
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ---------- entries ----------
export const entries = {
  async put(entry) {
    if (!entry.type || !entry.date) throw new Error('Eintrag braucht type und date');
    const now = Date.now();
    const rec = { ...entry, id: entry.id || uid(), createdAt: entry.createdAt || now, updatedAt: now };
    await withStore('entries', 'readwrite', (s) => wrap(s.put(rec)));
    emit('data:changed', { store: 'entries', type: rec.type, date: rec.date });
    return rec;
  },
  get: (id) => withStore('entries', 'readonly', (s) => wrap(s.get(id))),
  async delete(id) {
    const e = await entries.get(id);
    await withStore('entries', 'readwrite', (s) => wrap(s.delete(id)));
    emit('data:changed', { store: 'entries', type: e?.type, date: e?.date });
  },
  all: () => withStore('entries', 'readonly', (s) => wrap(s.getAll())),
  byType: (type) => withStore('entries', 'readonly', (s) => wrap(s.index('type').getAll(type))),
  byTypeDate: (type, date) => withStore('entries', 'readonly', (s) => wrap(s.index('type_date').getAll([type, date]))),
  range: (from, to) => withStore('entries', 'readonly', (s) => wrap(s.index('date').getAll(IDBKeyRange.bound(from, to)))),
  rangeByType: (type, from, to) =>
    withStore('entries', 'readonly', (s) => wrap(s.index('type_date').getAll(IDBKeyRange.bound([type, from], [type, to])))),
  /** Für Typen mit genau einem Eintrag pro Tag (z. B. body, sleep). */
  async daily(type, date) {
    return (await entries.byTypeDate(type, date))[0] || null;
  },
  async saveDaily(type, date, data) {
    const existing = await entries.daily(type, date);
    return entries.put({ ...(existing || {}), type, date, data });
  },
  firstDate: () =>
    withStore('entries', 'readonly', (s) => new Promise((res, rej) => {
      const r = s.index('date').openCursor();
      r.onsuccess = () => res(r.result ? r.result.key : null);
      r.onerror = () => rej(r.error);
    })),
};

// ---------- items ----------
export const items = {
  all: (kind) => withStore('items', 'readonly', (s) => wrap(kind ? s.index('kind').getAll(kind) : s.getAll())),
  get: (id) => withStore('items', 'readonly', (s) => wrap(s.get(id))),
  async put(item) {
    if (!item.kind) throw new Error('Item braucht kind');
    const now = Date.now();
    const rec = { ...item, id: item.id || uid(), createdAt: item.createdAt || now, updatedAt: now };
    await withStore('items', 'readwrite', (s) => wrap(s.put(rec)));
    emit('data:changed', { store: 'items', kind: rec.kind });
    return rec;
  },
  async delete(id) {
    await withStore('items', 'readwrite', (s) => wrap(s.delete(id)));
    emit('data:changed', { store: 'items' });
  },
};

// ---------- kv ----------
export const kv = {
  async get(key, fallback = null) {
    const rec = await withStore('kv', 'readonly', (s) => wrap(s.get(key)));
    return rec ? rec.value : fallback;
  },
  set: (key, value) => withStore('kv', 'readwrite', (s) => wrap(s.put({ key, value }))),
};

// ---------- Migrationen ----------
// Beispiel: { to: 3, async run() { const all = await entries.byType('body'); … } }
const MIGRATIONS = [
  {
    // 0.3.0: Wassertracking entfernt (alte 'water'-Einträge bleiben unangetastet), Wiegen nur noch optional.
    to: 2,
    async run() {
      const s = await kv.get('settings', null);
      if (!s) return;
      const targets = { ...(s.targets || {}) };
      delete targets.waterMl;
      const prefs = { ...(s.prefs || {}), weighDaily: false };
      delete prefs.waterSteps;
      await kv.set('settings', { ...s, targets, prefs });
    },
  },
  {
    // 0.10.1: Filme-Startliste – „Sinners“ raus, „Watchmen“ rein (nur wenn die Startliste schon angelegt war).
    to: 3,
    async run() {
      if (!(await kv.get('filme:seeded', false))) return;
      const films = await items.all('film');
      const removed = films.filter((f) => f.catalogId === 'sinners');
      for (const f of removed) await items.delete(f.id);
      const tonight = await kv.get('filme:heute', null);
      if (tonight && removed.some((f) => f.id === tonight.filmId)) await kv.set('filme:heute', null);
      if (!films.some((f) => f.catalogId === 'watchmen' || /^\s*watchmen\s*$/i.test(f.title || ''))) {
        await items.put({
          kind: 'film', catalogId: 'watchmen', title: 'Watchmen', year: 2009, runtime: 162,
          moods: ['spannung', 'nachdenken'], intensity: 3, emoji: '🕰️', watched: false,
        });
      }
    },
  },
  {
    // 0.11.0: „Puss in Boots: The Last Wish“ in die Filmliste (nur wenn die Startliste schon angelegt war).
    to: 4,
    async run() {
      if (!(await kv.get('filme:seeded', false))) return;
      const films = await items.all('film');
      if (films.some((f) => f.catalogId === 'puss-in-boots-last-wish' || /puss in boots|gestiefelte kater/i.test(f.title || ''))) return;
      await items.put({
        kind: 'film', catalogId: 'puss-in-boots-last-wish', title: 'Puss in Boots: The Last Wish', year: 2022, runtime: 102,
        genres: ['animation', 'abenteuer', 'komoedie', 'fantasy', 'familie'], moods: ['lachen', 'spannung'], intensity: 1, emoji: '🐈', watched: false,
      });
    },
  },
];

export async function runMigrations() {
  let v = await kv.get('dataVersion', 0);
  if (v === 0) {
    await kv.set('dataVersion', DATA_VERSION);
    return;
  }
  for (const m of MIGRATIONS) {
    if (m.to > v) {
      await m.run();
      v = m.to;
      await kv.set('dataVersion', v);
    }
  }
}

// ---------- Backup ----------
export async function exportAll() {
  const [e, i, k] = await withStore(['entries', 'items', 'kv'], 'readonly', ([se, si, sk]) =>
    Promise.all([wrap(se.getAll()), wrap(si.getAll()), wrap(sk.getAll())]));
  return {
    app: 'mathub',
    schema: DB_VERSION,
    dataVersion: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    entries: e,
    items: i,
    kv: k.filter((x) => !String(x.key).startsWith('tmp:')),   // tmp:… = kurzlebig (z. B. Anmelde-Token), nicht ins Backup
  };
}

export async function importAll(backup, { mode = 'merge' } = {}) {
  if (!backup || backup.app !== 'mathub' || !Array.isArray(backup.entries)) {
    throw new Error('Das ist keine gültige Backup-Datei dieser App.');
  }
  await withStore(['entries', 'items', 'kv'], 'readwrite', async ([se, si, sk]) => {
    if (mode === 'replace') await Promise.all([wrap(se.clear()), wrap(si.clear()), wrap(sk.clear())]);
    const ops = [];
    for (const e of backup.entries) ops.push(wrap(se.put(e)));
    for (const i of backup.items || []) ops.push(wrap(si.put(i)));
    for (const k of backup.kv || []) {
      if (mode === 'merge' && k.key === 'installedAt') continue;
      ops.push(wrap(sk.put(k)));
    }
    if (!(backup.kv || []).some((k) => k.key === 'dataVersion')) ops.push(wrap(sk.put({ key: 'dataVersion', value: backup.dataVersion || 1 })));
    await Promise.all(ops);
  });
  await runMigrations();
  emit('data:changed', { store: '*' });
}

export async function clearAll() {
  await withStore(['entries', 'items', 'kv'], 'readwrite', ([se, si, sk]) =>
    Promise.all([wrap(se.clear()), wrap(si.clear()), wrap(sk.clear())]));
  emit('data:changed', { store: '*' });
}
