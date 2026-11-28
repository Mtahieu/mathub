// Echte Fotos für Rezepte – wie bei den Filmen über Wikipedia, auf dem Gerät geladen (nicht im Repo).
// Jedes Rezept zeigt ein frei lizenziertes Foto (Wikimedia Commons) des Gerichts aus dem passenden
// Wikipedia-Artikel – also ein Symbolfoto des Gerichts, nicht exakt dieses Rezept.
// Gemerkt in kv 'kochen:fotos' {<titel>: {url, page, at}}; Bilddateien speichert der Service Worker.
// Ohne Netz/Treffer bleibt das illustrierte Bild.

import { kv } from '../../core/db.js';

/** Rezept-id → Artikel der englischen Wikipedia („de:“ = deutsche Wikipedia). */
export const PHOTO_TITLES = {
  'overnight-oats-protein': 'Overnight oats',
  'skyr-bowl': 'Skyr',
  'tofu-ruehrei': 'Tofu scramble',
  'ruehrei-brot': 'Scrambled eggs',
  'pb-porridge': 'Porridge',
  'quark-apfel': 'Quark (dairy product)',
  'protein-pancakes': 'Pancake',
  'smoothie-bowl': 'Smoothie',
  'avocado-toast': 'Avocado toast',
  'chia-pudding': 'Chia pudding',
  'linsen-dal': 'Dal',
  'chili-sin-carne': 'Vegetarian chili',
  'chili-con-carne': 'Chili con carne',
  'tofu-brokkoli': 'Fried tofu',
  'haehnchen-pfanne': 'Stir frying',
  'linsen-bolognese': 'Bolognese sauce',
  'pasta-putenhack': 'Pasta',
  'kichererbsen-curry': 'Chana masala',
  'lachs-ofenkartoffeln': 'Salmon as food',
  'ofengemuese-tempeh': 'Tempeh',
  'buddha-bowl': 'Buddha bowl',
  'thunfisch-salat': 'Tuna salad',
  'griech-couscous': 'Couscous',
  'seitan-gyros': 'Gyros',
  'haehnchen-wrap': 'Wrap (food)',
  'linsensuppe': 'Lentil soup',
  'shakshuka': 'Shakshouka',
  'gnocchi-spinat': 'Gnocchi',
  'erdnuss-tofu-nudeln': 'Rice noodles',
  'garnelen-pasta': 'Shrimp scampi',
  'burrito-bowl': 'Burrito',
  'ofen-suesskartoffel': 'Sweet potato',
  'kuerbissuppe': 'Pumpkin soup',
  'edamame-nudelsalat': 'Pasta salad',
  'pilzrisotto': 'Risotto',
  'haehnchen-bulgur': 'Bulgur',
  'raeuchertofu-kartoffeln': 'Bratkartoffeln',
  'gefuellte-paprika': 'Stuffed peppers',
  'kartoffel-quark': 'de:Pellkartoffel',
  'miso-nudelsuppe': 'Miso soup',
  'tempeh-bowl': 'Teriyaki',
  'aubergine-curry': 'Baingan bharta',
  'blumenkohl-bowl': 'Cauliflower',
  'af-suesskartoffel-tofu': 'Sweet potato fries',
  'af-falafel-bowl': 'Falafel',
  'af-haehnchen-kartoffeln': 'Roast chicken',
  'af-lachs-brokkoli': 'Salmon as food',
  'af-blumenkohl-wings': 'Buffalo wing',
  'af-kichererbsen-snack': 'Chickpea',
  'protein-shake': 'Milkshake',
  'hummus-sticks': 'Hummus',
  'schoko-quark': 'Chocolate pudding',
  'energy-balls': 'Energy ball',
  'edamame-snack': 'Edamame',
  'apfel-erdnuss': 'Peanut butter',
  'sojajoghurt-nuss': 'Yogurt',
  'huettenkaese-snack': 'Cottage cheese',
};

const API = { en: 'https://en.wikipedia.org/w/api.php', de: 'https://de.wikipedia.org/w/api.php' };
const KEY = 'kochen:fotos';
const RETRY_MISS_MS = 7 * 24 * 3600 * 1000;

let memo = null;
let prefetching = null;

async function cache() {
  if (!memo) memo = await kv.get(KEY, {});
  return memo;
}

const split = (t) => (t.startsWith('de:') ? ['de', t.slice(3)] : ['en', t]);

function fresh(hit) {
  return hit && (hit.url || Date.now() - hit.at < RETRY_MISS_MS);
}

/** Alle fehlenden Fotos gebündelt nachschlagen (max. 50 Titel pro Anfrage). */
export function prefetchPhotos() {
  if (prefetching) return prefetching;
  prefetching = (async () => {
    if (globalThis.navigator && navigator.onLine === false) return;
    const c = await cache();
    const todo = [...new Set(Object.values(PHOTO_TITLES))].filter((t) => !fresh(c[t]));
    if (!todo.length) return;
    const byLang = { en: [], de: [] };
    for (const t of todo) { const [lang, title] = split(t); byLang[lang].push(title); }
    for (const lang of ['en', 'de']) {
      const titles = byLang[lang];
      for (let i = 0; i < titles.length; i += 45) {
        const chunk = titles.slice(i, i + 45);
        try {
          const p = new URLSearchParams({
            action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
            prop: 'pageimages|info', inprop: 'url', piprop: 'thumbnail', pithumbsize: '640', pilicense: 'free',
            titles: chunk.join('|'),
          });
          const res = await fetch(`${API[lang]}?${p}`);
          if (!res.ok) continue;
          const q = (await res.json()).query || {};
          // angefragter Titel → endgültiger Titel (Schreibweise, Weiterleitungen)
          const final = new Map(chunk.map((t) => [t, t]));
          for (const n of q.normalized || []) for (const [k, v] of final) if (v === n.from) final.set(k, n.to);
          for (const r of q.redirects || []) for (const [k, v] of final) if (v === r.from) final.set(k, r.to);
          const pages = new Map((q.pages || []).map((pg) => [pg.title, pg]));
          for (const t of chunk) {
            const pg = pages.get(final.get(t));
            const key = lang === 'de' ? 'de:' + t : t;
            c[key] = { url: pg?.thumbnail?.source || null, page: pg?.fullurl || null, at: Date.now() };
          }
        } catch { /* offline – nächstes Mal */ }
      }
    }
    await kv.set(KEY, c);
  })().finally(() => { prefetching = null; });
  return prefetching;
}

/** Foto zu einem Rezept: {url, page} oder null. */
export async function photoFor(recipeId) {
  const t = PHOTO_TITLES[recipeId];
  if (!t) return null;
  let hit = (await cache())[t];
  if (!fresh(hit)) { await prefetchPhotos(); hit = (await cache())[t]; }
  return hit?.url ? hit : null;
}
