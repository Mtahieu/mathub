// Filme mit Wikipedia/Wikidata abgleichen – läuft auf dem Gerät, sobald ein Film hinzugefügt wird.
//
// Treffer finden (findCandidates), auch wenn der Titel nicht 1:1 passt:
//   • Wikidata-Suche (de + en, inkl. Alternativtitel), deutsche und englische Wikipedia-Volltextsuche
//     (mit Tippfehler-Korrektur über den Suchvorschlag von Wikipedia)
//   • nur echte Filme (Wikidata „ist ein“ Film/Animationsfilm/Fernsehfilm … bzw. Beschreibung „Film“)
//   • Rangfolge: exakter Titel (de/en/Alternativtitel) > Titelanfang > Suchrang; Jahreszahl im Titel zählt mit
// lookupFilm(): genau ein exakter Treffer → sicher; sonst Kandidaten zur Auswahl durch die Person.
// infoFor(): Jahr (P577), Laufzeit (P2047), Regie (P57), Besetzung (P161), Genre (P136), Land (P495),
//   deutscher Titel/Beschreibung aus der deutschen Wikipedia (sonst englisch), Poster-Artikel (enwiki).
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

// ---------- Kandidaten finden ----------
const FILM_TYPES = new Set(['Q11424', 'Q24869', 'Q202866', 'Q506240', 'Q229390', 'Q20650540', 'Q17517379', 'Q93204', 'Q24862', 'Q1257444', 'Q20667187', 'Q52207399']);
const NOT_FILM = /serie|series|franchise|filmreihe|reihe|trilogie|trilogy|roman|novel|buch|book|album|song|videospiel|video game|charakter|character|fictional|figur/i;

export const normalize = (t) => String(t || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\((?:[^)]*film[^)]*|\d{4})\)/g, '')
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const stripArticle = (t) => t.replace(/^(the|der|die|das|a|an|ein|eine) /, '');

/** „Dune 2021“ / „Dune (2021)“ → {title:'Dune', year:2021} */
export function splitYear(q) {
  const m = String(q).trim().match(/^(.*?)[\s(]+((?:19|20)\d{2})\)?$/);
  return m && m[1].trim() ? { title: m[1].trim(), year: Number(m[2]) } : { title: String(q).trim(), year: null };
}

async function qidsFromWiki(base, query) {
  const r = await get(base, {
    action: 'query', list: 'search', srsearch: query, srlimit: '1', srinfo: 'suggestion',
    generator: 'search', gsrsearch: query, gsrlimit: '8', gsrnamespace: '0', prop: 'pageprops', ppprop: 'wikibase_item',
  });
  let pages = r.query?.pages || [];
  const suggestion = r.query?.searchinfo?.suggestion;
  if (!pages.length && suggestion) {   // Tippfehler → Vorschlag von Wikipedia
    const r2 = await get(base, { action: 'query', generator: 'search', gsrsearch: suggestion, gsrlimit: '8', gsrnamespace: '0', prop: 'pageprops', ppprop: 'wikibase_item' });
    pages = r2.query?.pages || [];
  }
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((p) => p.pageprops?.wikibase_item).filter(Boolean);
}

async function qidsFromWikidata(query, language) {
  const r = await get(WD, { action: 'wbsearchentities', search: query, language, uselang: language, type: 'item', limit: '10' });
  return (r.search || []).map((x) => x.id);
}

/**
 * Filme zu einer Eingabe finden. Ergebnis: [{qid, title, deTitle, enTitle, origTitle, year, description, dewiki, enwiki, exact, score}]
 * Wirft bei Netzfehlern.
 */
export async function findCandidates(input) {
  const { title, year: wantYear } = splitYear(input);
  const settle = (p) => p.catch(() => []);
  const lists = await Promise.all([
    settle(qidsFromWikidata(title, 'de')), settle(qidsFromWikidata(title, 'en')),
    settle(qidsFromWiki(DE, `${title} Film`)), settle(qidsFromWiki(EN, `${title} film`)),
  ]);
  const rank = new Map();
  lists.forEach((list) => list.forEach((q, i) => rank.set(q, Math.min(rank.get(q) ?? 99, i))));
  const qids = [...rank.keys()].slice(0, 40);
  if (!qids.length) return [];
  const wd = await get(WD, { action: 'wbgetentities', ids: qids.join('|'), props: 'claims|labels|descriptions|aliases|sitelinks', languages: 'de|en', sitefilter: 'dewiki|enwiki' });
  const want = normalize(title);
  const out = [];
  for (const q of qids) {
    const e = wd.entities?.[q];
    if (!e || e.missing !== undefined) continue;
    const types = (e.claims?.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id);
    const desc = e.descriptions?.de?.value || e.descriptions?.en?.value || '';
    const isFilm = types.some((t) => FILM_TYPES.has(t)) || (/\bfilm\b|spielfilm|animationsfilm|movie/i.test(desc) && !NOT_FILM.test(desc));
    if (!isFilm || (types.length && !types.some((t) => FILM_TYPES.has(t)) && NOT_FILM.test(desc))) continue;
    const dewiki = e.sitelinks?.dewiki?.title || null;
    const enwiki = e.sitelinks?.enwiki?.title || null;
    const names = [e.labels?.de?.value, e.labels?.en?.value, dewiki, enwiki,
      ...(e.aliases?.de || []).map((a) => a.value), ...(e.aliases?.en || []).map((a) => a.value)].filter(Boolean);
    const normNames = names.map(normalize);
    const exact = normNames.some((n) => n === want || stripArticle(n) === stripArticle(want));
    const starts = !exact && normNames.some((n) => n.startsWith(want) || want.startsWith(n));
    const y = year(e.claims);
    let score = (exact ? 100 : starts ? 30 : 0) + Math.max(0, 12 - (rank.get(q) ?? 12));
    if (wantYear && y) score += y === wantYear ? 60 : -40;
    if (dewiki) score += 4;
    if (enwiki) score += 4;
    out.push({
      qid: q,
      title: cleanTitle(dewiki) || e.labels?.de?.value || e.labels?.en?.value || cleanTitle(enwiki) || q,
      deTitle: cleanTitle(dewiki) || e.labels?.de?.value || null,
      enTitle: cleanTitle(enwiki) || e.labels?.en?.value || null,
      year: y, description: desc, dewiki, enwiki, exact, score,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}

const cleanTitle = (t) => (t ? t.replace(/\s*\((?:[^)]*Film[^)]*|[^)]*film[^)]*|\d{4})\)\s*$/, '').trim() : null);

/**
 * Ergebnis: {status:'sure', candidate} – genau ein exakter Treffer (bei Jahresangabe: im richtigen Jahr)
 *           {status:'choose', candidates} – Person soll wählen · {status:'none', candidates:[]}
 */
export async function lookupFilm(input) {
  const cands = await findCandidates(input);
  if (!cands.length) return { status: 'none', candidates: [] };
  const { year: wantYear } = splitYear(input);
  const exact = cands.filter((c) => c.exact && (!wantYear || c.year === wantYear));
  if (exact.length === 1) return { status: 'sure', candidate: exact[0], candidates: cands };
  return { status: 'choose', candidates: cands };
}

/** Kleine Poster zu Kandidaten (für die Auswahl), gebündelt über die englische Wikipedia. */
export async function candidateThumbs(cands) {
  const titles = cands.map((c) => c.enwiki).filter(Boolean);
  if (!titles.length) return {};
  const r = await get(EN, { action: 'query', titles: titles.join('|'), prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '160', pilicense: 'any', redirects: '1' });
  const out = {};
  const map = new Map(titles.map((t) => [t, t]));
  for (const n of r.query?.normalized || []) for (const [k, v] of map) if (v === n.from) map.set(k, n.to);
  for (const n of r.query?.redirects || []) for (const [k, v] of map) if (v === n.from) map.set(k, n.to);
  const pages = new Map((r.query?.pages || []).map((p) => [p.title, p]));
  for (const [orig, fin] of map) { const pg = pages.get(fin); if (pg?.thumbnail?.source) out[orig] = pg.thumbnail.source; }
  return out;
}

/** Alle Infos zu einem gewählten Kandidaten. */
export async function infoFor(c) {
  const out = { wiki: c.enwiki || null, wikidata: c.qid, deTitle: c.deTitle || null, origTitle: c.enTitle && c.enTitle !== c.deTitle ? c.enTitle : null };
  const wd = await get(WD, { action: 'wbgetentities', ids: c.qid, props: 'claims' });
  const cl = wd.entities?.[c.qid]?.claims;
  out.year = year(cl) || c.year || null;
  out.runtime = runtime(cl);
  const dirIds = claimIds(cl, 'P57').slice(0, 2);
  const castIds = claimIds(cl, 'P161').slice(0, 6);
  const genreIds = claimIds(cl, 'P136').slice(0, 10);
  const countryIds = claimIds(cl, 'P495').slice(0, 3);
  const ids = [...new Set([...dirIds, ...castIds, ...genreIds, ...countryIds])];
  if (ids.length) {
    const lb = await get(WD, { action: 'wbgetentities', ids: ids.slice(0, 50).join('|'), props: 'labels', languages: 'de|en' });
    const L = (id) => label(lb.entities?.[id]);
    out.director = dirIds.map(L).filter(Boolean).join(', ') || null;
    out.cast = castIds.map(L).filter(Boolean).join(', ') || null;
    out.country = countryIds.map(L).filter(Boolean).join(', ') || null;
    out.genres = mapGenres(genreIds.flatMap((id) => [lb.entities?.[id]?.labels?.de?.value, lb.entities?.[id]?.labels?.en?.value]).filter(Boolean));
  }
  if (!out.genres?.length) out.genres = mapGenres([c.description || '']);
  const extract = async (base, t) => {
    const r = await get(base, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '6', titles: t, redirects: '1' });
    return r.query?.pages?.[0]?.extract?.replace(/\s+/g, ' ').trim() || null;
  };
  if (c.dewiki) { const ex = await extract(DE, c.dewiki).catch(() => null); if (ex) { out.desc = ex; out.descLang = 'de'; } }
  if (!out.desc && c.enwiki) { const ex = await extract(EN, c.enwiki).catch(() => null); if (ex) { out.desc = ex; out.descLang = 'en'; } }
  for (const k of Object.keys(out)) if (out[k] == null || out[k] === '' || (Array.isArray(out[k]) && !out[k].length)) delete out[k];
  return out;
}

/** Felder, die aus Wikipedia kommen dürfen – beim automatischen Abgleich nur, wenn sie noch leer sind. */
export const WIKI_FIELDS = ['wiki', 'wikidata', 'deTitle', 'origTitle', 'year', 'runtime', 'director', 'cast', 'country', 'genres', 'desc', 'descLang'];

/**
 * Abgleich auf einen Film anwenden.
 * overwrite=false: nur leere Felder füllen (automatisch nach dem Hinzufügen).
 * overwrite=true: Wikipedia-Felder ersetzen (Knopf „Mit Wikipedia abgleichen“); Notiz, Gesehen, Sterne bleiben.
 */
export function applyLookup(film, info, { overwrite = false } = {}) {
  const out = { ...film, wikiCheckedAt: Date.now() };
  delete out.wikiNeedsChoice;
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
