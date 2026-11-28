// Echte Fotos für Rezepte – auf dem Gerät von Wikimedia Commons geladen (frei lizenziert, nicht im Repo).
//
// Pro Rezept ein englischer Suchbegriff für das angerichtete Gericht (SEARCH). Die App sucht auf Commons
// zuerst unter den ausgezeichneten „Quality images“ (hohe Auflösung, gute Bildqualität), dann allgemein;
// nur Fotos (JPEG), mindestens 800 px breit, eher Querformat. Reicht das nicht, kommt das Titelbild des
// Wikipedia-Artikels (FALLBACK_ARTICLE), sonst bleibt die Illustration.
// Pro Rezept wird nur EINMAL gesucht; das Ergebnis wird gemerkt (kv 'kochen:fotos2').
// Gefällt ein Foto nicht, wird es ausgeblendet (kv 'kochen:fotoAus') und die Icon-Illustration gezeigt –
// ohne neue Abfrage bei Wikimedia.

import { kv } from '../../core/db.js';

export const SEARCH = {
  'overnight-oats-protein': 'overnight oats',
  'tofu-ruehrei': 'tofu scramble',
  'pb-porridge': 'porridge banana',
  'smoothie-bowl': 'smoothie bowl',
  'avocado-toast': 'avocado toast',
  'chia-pudding': 'chia pudding',
  'linsen-dal': 'dal lentils bowl',
  'chili-sin-carne': 'vegetarian chili',
  'tofu-brokkoli': 'tofu broccoli',
  'linsen-bolognese': 'spaghetti bolognese',
  'kichererbsen-curry': 'chana masala',
  'ofengemuese-tempeh': 'roasted vegetables tray',
  'buddha-bowl': 'buddha bowl',
  'seitan-gyros': 'gyros pita wrap',
  'linsensuppe': 'red lentil soup',
  'gnocchi-spinat': 'gnocchi spinach',
  'erdnuss-tofu-nudeln': 'peanut noodles',
  'burrito-bowl': 'burrito bowl',
  'kuerbissuppe': 'pumpkin soup',
  'edamame-nudelsalat': 'noodle salad',
  'pilzrisotto': 'mushroom risotto',
  'raeuchertofu-kartoffeln': 'Bratkartoffeln',
  'gefuellte-paprika': 'stuffed peppers',
  'miso-nudelsuppe': 'miso soup noodles',
  'tempeh-bowl': 'tempeh rice bowl',
  'aubergine-curry': 'eggplant curry',
  'blumenkohl-bowl': 'roasted cauliflower',
  'af-suesskartoffel-tofu': 'sweet potato fries',
  'af-falafel-bowl': 'falafel plate',
  'af-blumenkohl-wings': 'cauliflower wings',
  'af-kichererbsen-snack': 'roasted chickpeas',
  'protein-shake': 'chocolate banana smoothie',
  'hummus-sticks': 'hummus vegetable sticks',
  'energy-balls': 'energy balls dates',
  'edamame-snack': 'edamame',
  'apfel-erdnuss': 'apple slices peanut butter',
  'sojajoghurt-nuss': 'yogurt banana walnuts',
};

/** Rückfall: Titelbild dieses Wikipedia-Artikels (englisch). */
const FALLBACK_ARTICLE = {
  'overnight-oats-protein': 'Overnight oats', 'tofu-ruehrei': 'Tofu scramble', 'pb-porridge': 'Porridge',
  'smoothie-bowl': 'Smoothie', 'avocado-toast': 'Avocado toast', 'chia-pudding': 'Chia pudding', 'linsen-dal': 'Dal',
  'chili-sin-carne': 'Vegetarian chili', 'tofu-brokkoli': 'Fried tofu', 'linsen-bolognese': 'Bolognese sauce',
  'kichererbsen-curry': 'Chana masala', 'ofengemuese-tempeh': 'Tempeh', 'buddha-bowl': 'Buddha bowl', 'seitan-gyros': 'Gyros',
  'linsensuppe': 'Lentil soup', 'gnocchi-spinat': 'Gnocchi', 'erdnuss-tofu-nudeln': 'Rice noodles', 'burrito-bowl': 'Burrito',
  'kuerbissuppe': 'Pumpkin soup', 'edamame-nudelsalat': 'Pasta salad', 'pilzrisotto': 'Risotto', 'raeuchertofu-kartoffeln': 'Bratkartoffeln',
  'gefuellte-paprika': 'Stuffed peppers', 'miso-nudelsuppe': 'Miso soup', 'tempeh-bowl': 'Teriyaki', 'aubergine-curry': 'Baingan bharta',
  'blumenkohl-bowl': 'Cauliflower', 'af-suesskartoffel-tofu': 'Sweet potato fries', 'af-falafel-bowl': 'Falafel',
  'af-blumenkohl-wings': 'Buffalo wing', 'af-kichererbsen-snack': 'Chickpea', 'protein-shake': 'Smoothie', 'hummus-sticks': 'Hummus',
  'energy-balls': 'Energy ball', 'edamame-snack': 'Edamame', 'apfel-erdnuss': 'Peanut butter', 'sojajoghurt-nuss': 'Yogurt',
};

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKI = 'https://en.wikipedia.org/w/api.php';
const KEY = 'kochen:fotos2';
const RETRY_MISS_MS = 7 * 24 * 3600 * 1000;
const MAX_CANDS = 1;
const HIDE_KEY = 'kochen:fotoAus';
let hidden = null;
const BAD_NAME = /\b(map|logo|diagram|chart|label|package|packaging|menu|sign|poster|icon|drawing|illustration|stamp|advert|book|screenshot)\b/i;

let memo = null;
const pending = new Map();
let active = 0;
const queue = [];

async function cache() {
  if (!memo) memo = await kv.get(KEY, {});
  return memo;
}
async function persist() { await kv.set(KEY, await cache()); }

/** Höchstens 3 Abfragen gleichzeitig – Wikimedia freundlich behandeln. */
function throttled(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try { resolve(await fn()); } catch (e) { reject(e); } finally { active--; queue.shift()?.(); }
    };
    if (active < 3) run(); else queue.push(run);
  });
}

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function commonsSearch(query, limit) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '720',
    iiextmetadatafilter: 'Artist|LicenseShortName',
  });
  const res = await fetch(`${COMMONS}?${p}`);
  if (!res.ok) throw new Error('Commons ' + res.status);
  const pages = (await res.json()).query?.pages || [];
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((pg) => ({ title: pg.title, ii: pg.imageinfo?.[0] }))
    .filter(({ title, ii }) => ii && ii.mime === 'image/jpeg' && ii.width >= 800
      && ii.width / ii.height >= 0.95 && ii.width / ii.height <= 2.2 && !BAD_NAME.test(title))
    .map(({ ii }) => ({
      url: ii.thumburl || ii.url,
      page: ii.descriptionurl || null,
      artist: stripHtml(ii.extmetadata?.Artist?.value).slice(0, 60) || null,
      license: stripHtml(ii.extmetadata?.LicenseShortName?.value) || null,
    }));
}

async function articleImage(title) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
    prop: 'pageimages|info', inprop: 'url', piprop: 'thumbnail', pithumbsize: '720', pilicense: 'free', titles: title,
  });
  const res = await fetch(`${WIKI}?${p}`);
  if (!res.ok) return null;
  const pg = (await res.json()).query?.pages?.[0];
  return pg?.thumbnail?.source ? { url: pg.thumbnail.source, page: pg.fullurl || null, artist: null, license: null } : null;
}

async function lookup(recipeId) {
  const term = SEARCH[recipeId];
  let cands = [];
  if (term) {
    cands = await commonsSearch(`${term} incategory:"Quality images"`, 12);
    if (cands.length < MAX_CANDS) {
      const more = await commonsSearch(`${term} food`, 15);
      for (const c of more) if (!cands.some((x) => x.url === c.url)) cands.push(c);
    }
  }
  if (!cands.length && FALLBACK_ARTICLE[recipeId]) {
    const a = await articleImage(FALLBACK_ARTICLE[recipeId]);
    if (a) cands.push(a);
  }
  return cands.slice(0, MAX_CANDS);
}

async function hiddenSet() {
  if (!hidden) hidden = new Set(await kv.get(HIDE_KEY, []));
  return hidden;
}
export async function isPhotoHidden(recipeId) { return (await hiddenSet()).has(recipeId); }

/** Foto ausblenden (Icon-Illustration statt Foto) bzw. wieder zeigen – nur auf diesem Gerät. */
export async function setPhotoHidden(recipeId, hide) {
  const s = await hiddenSet();
  if (hide) s.add(recipeId); else s.delete(recipeId);
  await kv.set(HIDE_KEY, [...s]);
}

/** Foto zu einem Rezept: {url, page, artist, license} oder null (auch wenn ausgeblendet). */
export async function photoFor(recipeId) {
  if (await isPhotoHidden(recipeId)) return null;
  return loadPhoto(recipeId);
}

function loadPhoto(recipeId) {
  if (!SEARCH[recipeId] && !FALLBACK_ARTICLE[recipeId]) return Promise.resolve(null);
  if (pending.has(recipeId)) return pending.get(recipeId);
  const run = (async () => {
    const c = await cache();
    let hit = c[recipeId];
    const stale = !hit || (!hit.cands?.length && Date.now() - hit.at > RETRY_MISS_MS);
    if (stale && !(globalThis.navigator && navigator.onLine === false)) {
      try {
        const cands = await throttled(() => lookup(recipeId));
        hit = { cands, pick: 0, at: Date.now() };
        c[recipeId] = hit;
        await persist();
      } catch { /* offline – später erneut */ }
    }
    return hit?.cands?.[0] || null;
  })().finally(() => pending.delete(recipeId));
  pending.set(recipeId, run);
  return run;
}

export function creditText(ph) {
  if (!ph) return '';
  return [ph.artist, ph.license].filter(Boolean).join(' · ');
}
