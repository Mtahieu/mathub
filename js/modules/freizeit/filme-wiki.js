// Filme mit Wikipedia/Wikidata abgleichen – läuft auf dem Gerät, sobald ein Film hinzugefügt wird.
//
// 1. Englische Wikipedia: Suche „<Titel> film“ → Artikel, der laut Kurzbeschreibung ein Film ist
// 2. Wikidata: Jahr (P577), Laufzeit (P2047), Regie (P57), Besetzung (P161), Genre (P136), Land (P495),
//    deutscher Artikel (dewiki)
// 3. Deutsche Wikipedia: Einleitung als Beschreibung (sonst die englische)
// Alle APIs erlauben Browser-Anfragen (origin=*). Ergebnis wird am Film gespeichert und damit auch geteilt.

import { GENRES } from './filme-data.js';

const EN = 'https://en.wikipedia.org/w/api.php';
const DE = 'https://de.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';

async function get(base, params) {
  const p = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${base}?${p}`);
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

/** Wikidata-Genre-Bezeichnungen (de/en) → Mathub-Kategorien. */
const GENRE_RULES = [
  [/animat|zeichentrick/i, 'animation'],
  [/superheld|superhero/i, 'superhelden'],
  [/horror|slasher|splatter/i, 'horror'],
  [/thriller/i, 'thriller'],
  [/science.?fiction|sci-?fi|dystop/i, 'scifi'],
  [/fantasy/i, 'fantasy'],
  [/kom[öo]die|comedy/i, 'komoedie'],
  [/satire|satiri|schwarze kom|black comedy/i, 'satire'],
  [/liebes|romanti|romance/i, 'romantik'],
  [/krimi|crime|gangster|heist|detektiv|neo-noir|film noir/i, 'krimi'],
  [/abenteuer|adventure/i, 'abenteuer'],
  [/action|martial|kriegsfilm|war film/i, 'action'],
  [/familie|family|kinderfilm|children/i, 'familie'],
  [/drama|biograf|biograph/i, 'drama'],
];

export function mapGenres(labels) {
  const out = [];
  for (const l of labels) for (const [re, g] of GENRE_RULES) if (re.test(l) && !out.includes(g)) out.push(g);
  return out.filter((g) => GENRES[g]);
}

/** Stimmung & Intensität grob aus den Kategorien ableiten (lässt sich in der App ändern). */
export function moodsFromGenres(genres) {
  const m = new Set();
  if (genres.some((g) => ['komoedie', 'satire', 'familie'].includes(g))) m.add('lachen');
  if (genres.includes('horror')) m.add('gruseln');
  if (genres.some((g) => ['thriller', 'action', 'krimi', 'abenteuer', 'superhelden'].includes(g))) m.add('spannung');
  if (genres.some((g) => ['drama', 'satire', 'scifi'].includes(g))) m.add('nachdenken');
  if (genres.includes('fantasy') && genres.includes('satire')) m.add('skurril');
  const tense = genres.some((g) => ['thriller', 'action', 'krimi', 'drama', 'superhelden'].includes(g));
  const intensity = genres.includes('horror') ? 3
    : genres.some((g) => ['familie', 'animation'].includes(g)) || (genres.includes('komoedie') && !tense) ? 1 : 2;
  return { moods: [...m], intensity };
}

const claimIds = (claims, p) => (claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

function year(claims) {
  const times = (claims?.P577 || []).map((c) => c.mainsnak?.datavalue?.value?.time).filter(Boolean);
  const ys = times.map((t) => Number(t.slice(1, 5))).filter(Boolean);
  return ys.length ? Math.min(...ys) : null;
}

function runtime(claims) {
  for (const c of claims?.P2047 || []) {
    const v = c.mainsnak?.datavalue?.value;
    if (!v) continue;
    const n = Math.abs(Number(v.amount));
    if (!n) continue;
    if (/Q7727$/.test(v.unit || '')) return Math.round(n);          // Minute
    if (/Q25235$/.test(v.unit || '')) return Math.round(n * 60);     // Stunde
    if (/Q11574$/.test(v.unit || '')) return Math.round(n / 60);     // Sekunde
  }
  return null;
}

const label = (e) => e?.labels?.de?.value || e?.labels?.en?.value || null;

/** Passenden Artikel finden: bevorzugt einer, der laut Kurzbeschreibung ein Film ist. */
async function findArticle(title) {
  const r = await get(EN, {
    action: 'query', generator: 'search', gsrsearch: `${title} film`, gsrlimit: '5', gsrnamespace: '0',
    prop: 'pageprops|description', ppprop: 'wikibase_item',
  });
  const pages = (r.query?.pages || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const isFilm = (p) => /\bfilm\b|animated|movie/i.test(p.description || '');
  const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
  const t = norm(title);
  return pages.find((p) => isFilm(p) && norm(p.title).startsWith(t))
    || pages.find(isFilm)
    || null;
}

/**
 * Infos zu einem Filmtitel. Ergebnis (alles optional):
 * {wiki, deTitle, year, runtime, director, cast, country, genres, desc, descLang}
 * null, wenn nichts Passendes gefunden wurde. Wirft bei Netzfehlern.
 */
export async function lookupFilm(title) {
  const page = await findArticle(title);
  if (!page) return null;
  const out = { wiki: page.title };
  const qid = page.pageprops?.wikibase_item;
  let dewiki = null;
  if (qid) {
    const wd = await get(WD, { action: 'wbgetentities', ids: qid, props: 'claims|sitelinks', sitefilter: 'dewiki|enwiki' });
    const ent = wd.entities?.[qid];
    const c = ent?.claims;
    dewiki = ent?.sitelinks?.dewiki?.title || null;
    out.year = year(c);
    out.runtime = runtime(c);
    const dirIds = claimIds(c, 'P57').slice(0, 2);
    const castIds = claimIds(c, 'P161').slice(0, 5);
    const genreIds = claimIds(c, 'P136').slice(0, 10);
    const countryIds = claimIds(c, 'P495').slice(0, 3);
    const ids = [...new Set([...dirIds, ...castIds, ...genreIds, ...countryIds])];
    if (ids.length) {
      const lb = await get(WD, { action: 'wbgetentities', ids: ids.join('|'), props: 'labels', languages: 'de|en' });
      const L = (id) => label(lb.entities?.[id]);
      out.director = dirIds.map(L).filter(Boolean).join(', ') || null;
      out.cast = castIds.map(L).filter(Boolean).join(', ') || null;
      out.country = countryIds.map(L).filter(Boolean).join(', ') || null;
      const gl = genreIds.flatMap((id) => [lb.entities?.[id]?.labels?.de?.value, lb.entities?.[id]?.labels?.en?.value]).filter(Boolean);
      out.genres = mapGenres(gl);
    }
  }
  if (!out.genres?.length) out.genres = mapGenres([page.description || '']);
  if (dewiki) {
    out.deTitle = dewiki.replace(/\s*\((Film|\d{4}er? Film|\d{4})[^)]*\)\s*$/i, '');
    const de = await get(DE, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '4', titles: dewiki, redirects: '1' });
    const ex = de.query?.pages?.[0]?.extract?.trim();
    if (ex) { out.desc = ex; out.descLang = 'de'; }
  }
  if (!out.desc) {
    const en = await get(EN, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '4', titles: page.title, redirects: '1' });
    const ex = en.query?.pages?.[0]?.extract?.trim();
    if (ex) { out.desc = ex; out.descLang = 'en'; }
  }
  for (const k of Object.keys(out)) if (out[k] == null || out[k] === '') delete out[k];
  return out;
}

/** Felder, die aus Wikipedia kommen dürfen – beim automatischen Abgleich nur, wenn sie noch leer sind. */
export const WIKI_FIELDS = ['wiki', 'deTitle', 'year', 'runtime', 'director', 'cast', 'country', 'genres', 'desc', 'descLang'];

/**
 * Abgleich auf einen Film anwenden.
 * overwrite=false: nur leere Felder füllen (automatisch nach dem Hinzufügen).
 * overwrite=true: Wikipedia-Felder ersetzen (Knopf „Mit Wikipedia abgleichen“); Notiz, Gesehen, Sterne bleiben.
 */
export function applyLookup(film, info, { overwrite = false } = {}) {
  const out = { ...film, wikiCheckedAt: Date.now() };
  if (!info) return { ...out, wikiMiss: true };
  delete out.wikiMiss;
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  for (const k of WIKI_FIELDS) if (info[k] != null && (overwrite || empty(out[k]))) out[k] = info[k];
  if (empty(film.moods) || overwrite) {
    const d = moodsFromGenres(out.genres || []);
    if (empty(film.moods)) out.moods = d.moods;
    if (!film.intensityManual) out.intensity = d.intensity;
  }
  return out;
}
