// Kochen: Rezeptvorschläge, Wochenplan (mit Kantine an Bürotagen) und Einkaufsliste – ohne manuelles Tracking.
// Kalorien und Protein sind Schätzwerte aus der Zutatendatenbank (food-data.js).
//
// entries type 'mealplan' (1 pro Woche, date = Montag):
//   data {days:{'0'..'6': {fruehstueck, mittag, abend: Slot|null, snack: Slot[]}}, checked:{zutat:true}, extras:[{r, n}], generatedAt}
//   Slot = {r: rezeptId | 'kantine' | 'auswaerts', rest?: true (Reste vom Vorabend), locked?: true}
//   shopDays: [0–6] Tage, für die eingekauft wird (fehlt = ab heute bzw. ganze Woche)
// Einstellungen: settings.prefs.food (siehe DEFAULT_SETTINGS)
// Ältere Einträge 'food' und items 'food-fav' (bis 0.4) bleiben in der DB, werden aber nicht mehr genutzt.

import { registerModule } from '../../core/registry.js';
import { on } from '../../core/events.js';
import { parseHash } from '../../core/router.js';
import { entries, kv } from '../../core/db.js';
import { getSettingsSync, updateSettings } from '../../core/settings.js';
import {
  h, icon, card, pageHeader, segmented, openSheet, toast, field, intInput, readNum, textInput,
  fmt, fmtInt, withUnit, starRating, emptyState, sectionTitle,
} from '../../core/ui.js';
import { today, addDays, startOfWeek, weekday, formatDate, WEEKDAYS_SHORT, WEEKDAYS_LONG, dayRange, isKey } from '../../core/dates.js';
import { barChart, bucketize } from '../../core/charts.js';
import {
  RECIPES, INGREDIENTS, CATEGORIES, CANTEEN, EATING_OUT, DIETS, MEALS, CUISINES, TAGS, EQUIPMENT, dietFits, recipeById, isVeganRecipe,
  formatAmount, equipmentOk,
} from './food-data.js';
import { loadRatings, rate, isFavorite, isDisliked } from './ratings.js';
import { recipeSvg, hasIngredientLook } from './rezept-bild.js';
import { markEaten, unmarkEaten, eatenIndex } from './rezept-log.js';

const SLOTS = ['fruehstueck', 'mittag', 'abend'];
const rKey = (r) => 'rezept:' + (r.id || r);

// ---------- Einstellungen ----------
function prefs() {
  const s = getSettingsSync();
  return { ...s.prefs.food };
}
function targets() {
  const t = getSettingsSync().targets;
  return { kcal: t.kcal || 2500, protein: t.protein || 140, set: !!t.kcal };
}
const isOffice = (date, p = prefs()) => p.officeDays.includes(weekday(date));
const dayKind = (date, p = prefs()) => (weekday(date) >= 5 ? 'Wochenende' : isOffice(date, p) ? 'Büro' : 'Remote');

// ---------- Wochenplan: Daten ----------
const weekOf = (date) => startOfWeek(date);

async function getPlan(weekStart) {
  return (await entries.daily('mealplan', weekStart))?.data || null;
}
async function savePlan(weekStart, data) {
  await entries.saveDaily('mealplan', weekStart, data);
}

function slotNut(slot) {
  if (!slot) return null;
  if (slot.r === 'kantine') { const p = prefs(); return { kcal: p.canteenKcal, p: p.canteenProtein }; }
  if (slot.r === 'auswaerts') { const p = prefs(); return { kcal: p.outKcal, p: p.outProtein }; }
  const r = recipeById(slot.r);
  return r ? { kcal: r.nut.kcal, p: r.nut.p } : null;
}

export function dayTotals(day) {
  const t = { kcal: 0, p: 0 };
  if (!day) return t;
  for (const s of [...SLOTS.map((k) => day[k]), ...(day.snack || [])]) {
    const n = slotNut(s);
    if (n) { t.kcal += n.kcal; t.p += n.p; }
  }
  return t;
}

// ---------- Wochenplan: Generator ----------
function pickWeighted(list, weightFn) {
  const ws = list.map(weightFn);
  const sum = ws.reduce((a, b) => a + b, 0);
  if (!list.length || sum <= 0) return list[0] || null;
  let x = Math.random() * sum;
  for (let i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; }
  return list.at(-1);
}

function candidates(slot, p, ratings, maxTime) {
  const base = RECIPES.filter((r) => r.meals.includes(slot) && dietFits(r.diet, p.diet) && equipmentOk(r, p.equipment)
    && !isDisliked(ratings.get(rKey(r))));
  const timed = base.filter((r) => r.time <= maxTime);
  return timed.length ? timed : base;
}

function weightFor(r, ratings, used, p, extra = 1) {
  const rec = ratings.get(rKey(r));
  let w = 1 + (r.nut.p / Math.max(r.nut.kcal, 1)) * 10; // Protein-Dichte bevorzugen (Muskelaufbau)
  if (p.preferFav && rec) w *= rec.stars >= 4 ? 3 : rec.stars === 3 ? 1.3 : 1;
  if (p.preferAirfryer && p.equipment.includes('airfryer') && r.allTags.includes('airfryer')) w *= 1.6;
  const n = used.get(r.id) || 0;
  w *= n ? 0.05 / n : 1;
  return w * extra;
}

function generateWeek(weekStart, p, ratings, existing) {
  const t = targets();
  const used = new Map();
  const use = (id) => used.set(id, (used.get(id) || 0) + 1);
  const snackUsed = new Map();
  const days = {};
  // fixierte Mahlzeiten zuerst als "benutzt" zählen
  for (let d = 0; d < 7; d++) for (const k of SLOTS) {
    const s = existing?.days?.[d]?.[k];
    if (s?.locked && s.r !== 'kantine') use(s.r);
  }
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    const old = existing?.days?.[d] || {};
    const day = { snack: [] };
    const weekend = d >= 5;
    const maxTime = weekend ? Math.max(p.maxTime, 45) : p.maxTime;
    const keep = (k) => (old[k]?.locked ? old[k] : null);

    // Frühstück (entfällt bei Intervallfasten)
    day.fruehstueck = keep('fruehstueck') || (p.fasting ? null : (() => {
      const prev = days[d - 1]?.fruehstueck?.r;
      const r = pickWeighted(candidates('fruehstueck', p, ratings, weekend ? 30 : Math.min(p.maxTime, 15)),
        (x) => weightFor(x, ratings, new Map(), p, x.id === prev ? 0.1 : 1));
      return r ? { r: r.id } : null;
    })());

    // Mittag: Kantine an Bürotagen, sonst Reste vom Vorabend oder schnelles Rezept
    if (keep('mittag')) day.mittag = keep('mittag');
    else if (!weekend && isOffice(date, p)) day.mittag = { r: 'kantine' };
    else {
      const prevDinner = recipeById(days[d - 1]?.abend?.r);
      if (p.leftovers && prevDinner?.tags.includes('mealprep') && !days[d - 1]?.abend?.rest && days[d - 1]?.abend?.r !== 'auswaerts') {
        day.mittag = { r: prevDinner.id, rest: true };
      } else {
        const r = pickWeighted(candidates('mittag', p, ratings, weekend ? maxTime : Math.min(maxTime, 30)), (x) => weightFor(x, ratings, used, p));
        if (r) { day.mittag = { r: r.id }; use(r.id); }
      }
    }

    // Abend: wenn morgen Remote/Wochenende ist, Meal-Prep bevorzugen (Reste fürs Mittagessen)
    day.abend = keep('abend') || (p.outDays.includes(d) ? { r: 'auswaerts', locked: true } : null) || (() => {
      const tomorrow = addDays(date, 1);
      const nextHome = d < 6 && !(weekday(tomorrow) < 5 && isOffice(tomorrow, p));
      const r = pickWeighted(candidates('abend', p, ratings, maxTime),
        (x) => weightFor(x, ratings, used, p, p.leftovers && nextHome && x.tags.includes('mealprep') ? 3 : 1));
      if (r) use(r.id);
      return r ? { r: r.id } : null;
    })();

    // Snacks auffüllen bis nahe am Kalorienziel
    if (old.snack?.some((s) => s.locked)) day.snack = old.snack.filter((s) => s.locked);
    if (p.autoSnacks) {
      for (let i = day.snack.length; i < (p.fasting ? 3 : 2); i++) {
        const gap = t.kcal - dayTotals(day).kcal;
        if (gap < 220) break;
        const snacks = candidates('snack', p, ratings, 30).filter((x) => !day.snack.some((s) => s.r === x.id));
        const ranked = snacks.sort((a, b) => Math.abs(a.nut.kcal - gap) - Math.abs(b.nut.kcal - gap)).slice(0, 7);
        const r = pickWeighted(ranked, (x) => weightFor(x, ratings, new Map(), p) / (1 + 2 * (snackUsed.get(x.id) || 0)));
        if (!r) break;
        snackUsed.set(r.id, (snackUsed.get(r.id) || 0) + 1);
        day.snack.push({ r: r.id });
      }
    }
    days[d] = day;
  }
  return { days, checked: existing?.checked || {}, extras: existing?.extras || [], generatedAt: Date.now() };
}

// ---------- Einkaufsliste ----------
function buildShopping(plan, p, shopDays) {
  const portions = new Map(); // rezeptId -> Portionen
  const add = (id, n = 1) => portions.set(id, (portions.get(id) || 0) + n);
  let out = 0;
  for (let d = 0; d < 7; d++) {
    const day = plan.days?.[d];
    if (!day || !shopDays.includes(d)) continue;
    for (const s of [...SLOTS.map((k) => day[k]), ...(day.snack || [])]) {
      if (!s || s.r === 'kantine') continue;
      if (s.r === 'auswaerts') { out++; continue; }
      add(s.r);
    }
  }
  for (const e of plan.extras || []) add(e.r, e.n || 1);
  const amounts = new Map();
  const usedIn = new Map();
  const spices = new Set();
  for (const [id, n] of portions) {
    const r = recipeById(id);
    if (!r) continue;
    for (const [zid, g] of r.ing) {
      if (zid === 'gewuerze') continue;
      amounts.set(zid, (amounts.get(zid) || 0) + g * n * p.servings);
      if (!usedIn.has(zid)) usedIn.set(zid, new Set());
      usedIn.get(zid).add(r.name);
    }
    (r.spice || '').split(/,|\(|\)/).map((x) => x.trim()).filter((x) => x && !/^\d|^optional|^1 /.test(x)).forEach((x) => spices.add(x));
  }
  const groups = CATEGORIES.map((c) => ({ ...c, items: [] }));
  const pantry = [];
  for (const [zid, g] of amounts) {
    const z = INGREDIENTS[zid];
    const item = { id: zid, name: z.buyAs || z.name, emoji: z.emoji, amount: formatAmount(zid, g), recipes: [...usedIn.get(zid)] };
    if (z.pantry) pantry.push(item);
    else groups.find((c) => c.id === z.cat).items.push(item);
  }
  for (const gr of groups) gr.items.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return { groups: groups.filter((g) => g.items.length), pantry, spices: [...spices].sort((a, b) => a.localeCompare(b, 'de')), portions, out };
}

function shoppingText(list, plan, weekStart) {
  const lines = [`Einkaufsliste – Woche ab ${formatDate(weekStart)}`, ''];
  for (const g of list.groups) {
    const open = g.items.filter((i) => !plan.checked?.[i.id]);
    if (!open.length) continue;
    lines.push(`${g.label}:`);
    for (const i of open) lines.push(`☐ ${i.amount} ${i.name}`);
    lines.push('');
  }
  if (list.pantry.length) lines.push('Vorrat prüfen: ' + list.pantry.map((i) => i.name).join(', '));
  if (list.spices.length) lines.push('Gewürze: ' + list.spices.join(', '));
  return lines.join('\n').trim();
}

// ---------- Bild ----------
/** Rezeptbild: aus den Zutaten gezeichnet (rezept-bild.js); Kantine/Auswärts als Emoji-Kachel. */
export function recipeImage(r, { size = 'md' } = {}) {
  if (!hasIngredientLook(r)) return illustratedImage(r, size);
  return h('div', { class: `rimg rimg-${size} rimg-drawn`, role: 'img', 'aria-label': r.name }, recipeSvg(r));
}

function illustratedImage(r, size) {
  const main = r.emoji;
  const seen = new Set([main]);
  const sides = r.sides || [...r.ing]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => INGREDIENTS[id])
    .filter((z) => z && !z.pantry && z.id !== 'gewuerze' && !seen.has(z.emoji) && seen.add(z.emoji))
    .slice(0, 3)
    .map((z) => z.emoji);
  return h('div', { class: `rimg rimg-${size}`, style: { '--h': r.hue ?? 30 }, role: 'img', 'aria-label': r.name },
    h('span', { class: 'rimg-main' }, main),
    sides.map((e, i) => h('span', { class: `rimg-side s${i}` }, e)));
}

// ---------- Rezept-Detail ----------
function nutRow(n) {
  return h('div', { class: 'nut-row' },
    h('div', null, h('strong', null, fmtInt(n.kcal)), h('span', null, 'kcal')),
    h('div', null, h('strong', null, n.p + ' g'), h('span', null, 'Protein')),
    h('div', null, h('strong', null, n.c + ' g'), h('span', null, 'Kohlenh.')),
    h('div', null, h('strong', null, n.f + ' g'), h('span', null, 'Fett')));
}

async function openRecipe(r, after) {
  const ratings = await loadRatings();
  const rec = ratings.get(rKey(r));
  let portions = prefs().servings || 1;
  const ingBox = h('ul', { class: 'ing-list' });
  const renderIng = () => ingBox.replaceChildren(...r.ing.filter(([id]) => id !== 'gewuerze').map(([id, g, note]) => {
    const z = INGREDIENTS[id];
    return h('li', null, h('span', { class: 'ing-emoji' }, z.emoji),
      h('span', { class: 'ing-amt' }, portions === 1 ? formatAmount(id, g, note) : formatAmount(id, g * portions)),
      h('span', null, z.name));
  }));
  renderIng();
  const pLabel = h('strong', null, '');
  const setP = (n) => { portions = Math.max(1, Math.min(8, n)); pLabel.textContent = `${portions} ${portions === 1 ? 'Portion' : 'Portionen'}`; renderIng(); };
  setP(portions);

  const bigImg = recipeImage(r, { size: 'lg' });

  // Gegessen (wird mit der gemeinsamen Liste geteilt)
  const eatenBox = h('div', { class: 'eaten-box' });
  const renderEaten = async () => {
    const log = (await eatenIndex()).byRecipe.get(r.id) || [];
    const ate = log.some((e) => e.date === today());
    eatenBox.replaceChildren(
      h('div', { class: 'small' }, log.length
        ? [h('strong', null, `${log.length}× gegessen`), ` · zuletzt ${formatDate(log[0].date)}${log[0].updatedBy ? ' (' + log[0].updatedBy + ')' : ''}`]
        : h('span', { class: 'muted' }, 'Noch nicht als gegessen markiert.')),
      h('button', {
        type: 'button', class: 'btn small' + (ate ? '' : ' btn-primary'),
        onclick: async () => {
          if (ate) await unmarkEaten(r.id, today()); else await markEaten(r.id, today());
          toast(ate ? 'Haken entfernt' : 'Als heute gegessen markiert');
          renderEaten();
          after?.();
        },
      }, ate ? '✓ Heute gegessen' : 'Heute gegessen'));
  };
  renderEaten();

  const sheet = openSheet({
    title: r.name,
    body: [
      bigImg,
      eatenBox,
      h('div', { class: 'chips' },
        h('span', { class: 'tag', dataset: { diet: r.diet } }, DIETS[r.diet]),
        h('span', { class: 'tag' }, `⏱ ${r.time} Min.`),
        h('span', { class: 'tag' }, CUISINES[r.cuisine]),
        r.meals.map((m) => h('span', { class: 'tag' }, MEALS[m])),
        r.allTags.map((t) => h('span', { class: 'tag' }, TAGS[t]))),
      nutRow(r.nut),
      h('p', { class: 'muted small' }, `Schätzwerte pro Portion · ${r.eq.length ? 'Geräte: ' + r.eq.map((e) => EQUIPMENT[e]).join(' + ') : 'ohne Kochen'}`),
      r.af ? h('div', { class: 'banner small af-tip' }, h('span', { class: 'li-emoji' }, '🍟'), h('span', null, h('strong', null, 'Mit Heißluftfritteuse: '), r.af)) : null,
      h('div', { class: 'stepper' },
        h('button', { class: 'icon-btn', 'aria-label': 'Weniger', onclick: () => setP(portions - 1) }, icon('minus')),
        pLabel,
        h('button', { class: 'icon-btn', 'aria-label': 'Mehr', onclick: () => setP(portions + 1) }, icon('plus'))),
      ingBox,
      r.spice ? h('p', { class: 'small muted' }, h('strong', null, 'Gewürze: '), r.spice) : null,
      h('ol', { class: 'steps' }, r.steps.map((st) => h('li', null, st))),
      field('Bewertung', starRating(rec?.stars, async (v) => { await rate(rKey(r), v); toast(v ? 'Bewertung gespeichert' : 'Bewertung entfernt'); after?.(); }),
        `Gut bewertete Rezepte kommen im Wochenplan häufiger vor, 1–2 Sterne gar nicht mehr.${rec?.updatedBy ? ` Zuletzt bewertet von ${rec.updatedBy}.` : ''}`),
    ],
    footer: [
      h('button', {
        class: 'btn',
        onclick: async () => {
          const wk = weekOf(today());
          const plan = (await getPlan(wk)) || { days: {}, checked: {}, extras: [] };
          plan.extras = [...(plan.extras || []), { r: r.id, n: portions }];
          await savePlan(wk, plan);
          toast('Zur Einkaufsliste hinzugefügt');
          after?.();
        },
      }, icon('list', 18), 'Einkauf'),
      h('button', { class: 'btn btn-primary', onclick: () => { sheet.close(); openAddToPlan(r, after); } }, icon('calendar', 18), 'In Wochenplan'),
    ],
  });
}

function openAddToPlan(r, after) {
  let week = weekOf(today());
  let day = Math.min(weekday(today()), 6);
  let slot = r.meals.includes('abend') ? 'abend' : r.meals[0];
  const body = h('div', { class: 'stack' });
  const render = () => body.replaceChildren(
    field('Woche', segmented([{ value: weekOf(today()), label: 'Diese Woche' }, { value: addDays(weekOf(today()), 7), label: 'Nächste Woche' }], week, (v) => { week = v; render(); })),
    field('Tag', h('div', { class: 'chips' }, WEEKDAYS_SHORT.map((d, i) => h('button', { type: 'button', class: 'chip' + (i === day ? ' active' : ''), onclick: () => { day = i; render(); } }, d)))),
    field('Mahlzeit', h('div', { class: 'chips' }, Object.entries(MEALS).map(([k, l]) => h('button', { type: 'button', class: 'chip' + (k === slot ? ' active' : ''), onclick: () => { slot = k; render(); } }, l)))),
  );
  render();
  const sheet = openSheet({
    title: 'In den Wochenplan',
    body: [h('p', { class: 'small' }, r.name), body],
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const plan = (await getPlan(week)) || { days: {}, checked: {}, extras: [] };
          plan.days[day] = plan.days[day] || { snack: [] };
          if (slot === 'snack') plan.days[day].snack = [...(plan.days[day].snack || []), { r: r.id, locked: true }];
          else plan.days[day][slot] = { r: r.id, locked: true };
          await savePlan(week, plan);
          sheet.close();
          toast(`${WEEKDAYS_LONG[day]}: ${MEALS[slot]} gesetzt (fixiert)`);
          after?.();
        },
      }, 'Übernehmen'),
    ],
  });
}

// ---------- Rezepte durchsuchen ----------
const DEFAULT_FILTER = {
  q: '', meal: 'alle', diet: 'alle', equip: 'alle', time: 0, kcal: 'alle', protein: 0, cuisines: [], tags: [], fav: false, hideDisliked: true, sort: 'empfohlen',
};
let filter = null;
async function getFilter() {
  if (!filter) filter = { ...DEFAULT_FILTER, ...(await kv.get('food:filter', {})) };
  return filter;
}
const saveFilter = () => kv.set('food:filter', filter);
const activeFilterCount = (f) => ['meal', 'kcal', 'equip'].filter((k) => f[k] !== 'alle').length
  + (f.time ? 1 : 0) + (f.protein ? 1 : 0) + f.cuisines.length + f.tags.length + (f.fav ? 1 : 0) + (f.q ? 1 : 0);

function applyFilter(f, ratings) {
  const q = f.q.trim().toLowerCase();
  const kcalOk = (k) => f.kcal === 'alle' || (f.kcal === 'lt400' ? k < 400 : f.kcal === '400-600' ? k >= 400 && k <= 600 : f.kcal === '600-800' ? k > 600 && k <= 800 : k > 800);
  let list = RECIPES.filter((r) => {
    const rec = ratings.get(rKey(r));
    if (f.meal !== 'alle' && !r.meals.includes(f.meal)) return false;
    if (f.time && r.time > f.time) return false;
    if (f.equip === 'airfryer' && !r.allTags.includes('airfryer')) return false;
    if (f.equip === 'herd' && !(r.eq.length && r.eq.every((e) => e === 'herd'))) return false;
    if (f.equip === 'ofen' && !r.eq.includes('ofen')) return false;
    if (f.equip === 'keins' && r.eq.length) return false;
    if (!kcalOk(r.nut.kcal)) return false;
    if (f.protein && r.nut.p < f.protein) return false;
    if (f.cuisines.length && !f.cuisines.includes(r.cuisine)) return false;
    if (f.tags.length && !f.tags.every((t) => r.allTags.includes(t))) return false;
    if (f.fav && !isFavorite(rec)) return false;
    if (f.hideDisliked && isDisliked(rec)) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.ing.some(([id]) => INGREDIENTS[id]?.name.toLowerCase().includes(q)))) return false;
    return true;
  });
  const stars = (r) => ratings.get(rKey(r))?.stars ?? 3;
  const sorters = {
    empfohlen: (a, b) => stars(b) - stars(a) || b.nut.p / b.nut.kcal - a.nut.p / a.nut.kcal,
    protein: (a, b) => b.nut.p - a.nut.p,
    dichte: (a, b) => b.nut.p / b.nut.kcal - a.nut.p / a.nut.kcal,
    kcalAuf: (a, b) => a.nut.kcal - b.nut.kcal,
    kcalAb: (a, b) => b.nut.kcal - a.nut.kcal,
    zeit: (a, b) => a.time - b.time,
    name: (a, b) => a.name.localeCompare(b.name, 'de'),
  };
  return list.sort(sorters[f.sort] || sorters.empfohlen);
}

function recipeTile(r, rec, onClick, eatenCount = 0) {
  return h('button', { class: 'rtile', onclick: onClick },
    recipeImage(r),
    h('div', { class: 'rtile-body' },
      h('div', { class: 'rtile-title' }, r.name),
      h('div', { class: 'rtile-meta' }, `${fmtInt(r.nut.kcal)} kcal · ${r.nut.p} g P · ${r.time}′`),
      h('div', { class: 'rtile-tags' },
        eatenCount ? h('span', { class: 'mini vegan' }, `✓ ${eatenCount}× gegessen`) : null,
        rec ? h('span', { class: 'mini star' }, '★'.repeat(rec.stars)) : null)));
}

async function renderRecipes(el, ctx) {
  const f = await getFilter();
  const ratings = await loadRatings();
  const eaten = await eatenIndex();
  const after = () => ctx.refresh();
  const set = async (patch) => { Object.assign(filter, patch); await saveFilter(); ctx.refresh(); };
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const chip = (label, active, onclick) => h('button', { type: 'button', class: 'chip' + (active ? ' active' : ''), onclick }, label);

  const search = textInput({ value: f.q, placeholder: 'Suche: Rezept oder Zutat (z. B. Tofu, Linsen)' });
  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filter.q = search.value; saveFilter(); renderList(); }, 250); });
  el.append(h('div', { class: 'search' }, icon('search', 18), search));

  el.append(h('div', { class: 'chips scroll' },
    chip('Alle', f.meal === 'alle', () => set({ meal: 'alle' })),
    Object.entries(MEALS).map(([k, l]) => chip(l, f.meal === k, () => set({ meal: k })))));
  el.append(h('div', { class: 'chips scroll' },
    chip('★ Favoriten', f.fav, () => set({ fav: !f.fav })),
    chip('💪 ≥ 30 g Protein', f.protein === 30, () => set({ protein: f.protein === 30 ? 0 : 30 })),
    chip('🍟 Heißluftfritteuse', f.equip === 'airfryer', () => set({ equip: f.equip === 'airfryer' ? 'alle' : 'airfryer' })),
    chip('⏱ ≤ 20 Min.', f.time === 20, () => set({ time: f.time === 20 ? 0 : 20 }))));

  const n = activeFilterCount(f);
  const more = h('details', { class: 'filter-panel', open: ctx.query.filter === '1' },
    h('summary', null, icon('settings', 18), `Alle Filter${n ? ` (${n} aktiv)` : ''}`),
    field('Zubereitungszeit', h('div', { class: 'chips' }, [[0, 'egal'], [10, '≤ 10'], [20, '≤ 20'], [30, '≤ 30'], [45, '≤ 45']].map(([v, l]) => chip(l + (v ? ' Min.' : ''), f.time === v, () => set({ time: v }))))),
    field('Küchengerät', h('div', { class: 'chips' }, [['alle', 'egal'], ['airfryer', 'Heißluftfritteuse'], ['herd', 'Nur Herd'], ['ofen', 'Backofen'], ['keins', 'Ohne Kochen']].map(([v, l]) => chip(l, f.equip === v, () => set({ equip: v }))))),
    field('Kalorien pro Portion', h('div', { class: 'chips' }, [['alle', 'egal'], ['lt400', '< 400'], ['400-600', '400–600'], ['600-800', '600–800'], ['gt800', '> 800']].map(([v, l]) => chip(l, f.kcal === v, () => set({ kcal: v }))))),
    field('Protein mindestens', h('div', { class: 'chips' }, [[0, 'egal'], [20, '20 g'], [30, '30 g'], [40, '40 g']].map(([v, l]) => chip(l, f.protein === v, () => set({ protein: v }))))),
    field('Küche', h('div', { class: 'chips' }, Object.entries(CUISINES).map(([k, l]) => chip(l, f.cuisines.includes(k), () => set({ cuisines: toggleIn(f.cuisines, k) }))))),
    field('Eigenschaften', h('div', { class: 'chips' }, Object.entries(TAGS).map(([k, l]) => chip(l, f.tags.includes(k), () => set({ tags: toggleIn(f.tags, k) }))))),
    field('Sortierung', h('div', { class: 'chips' }, [['empfohlen', 'Empfohlen'], ['protein', 'Meiste Protein'], ['dichte', 'Protein pro kcal'], ['kcalAuf', 'Wenigste kcal'], ['kcalAb', 'Meiste kcal'], ['zeit', 'Schnellste'], ['name', 'A–Z']].map(([v, l]) => chip(l, f.sort === v, () => set({ sort: v }))))),
    h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: f.hideDisliked, onchange: (e) => set({ hideDisliked: e.target.checked }) }), h('span', null, 'Schlecht bewertete ausblenden')),
    n ? h('button', { class: 'btn btn-ghost small', onclick: () => { filter = { ...DEFAULT_FILTER }; saveFilter(); ctx.refresh(); } }, 'Alle Filter zurücksetzen') : null);
  more.addEventListener('toggle', () => { ctx.query.filter = more.open ? '1' : undefined; });
  el.append(more);

  const listBox = h('div');
  function renderList() {
    const list = applyFilter(filter, ratings);
    listBox.replaceChildren(
      h('div', { class: 'section-title' }, `${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'}`),
      list.length
        ? h('div', { class: 'rgrid' }, list.map((r) => recipeTile(r, ratings.get(rKey(r)), () => openRecipe(r, after), eaten.byRecipe.get(r.id)?.length || 0)))
        : card(null, {}, h('p', { class: 'muted' }, 'Keine Rezepte für diese Filter.')));
  }
  renderList();
  el.append(listBox);
}

// ---------- Wochenplan-Ansicht ----------
function openPlanSettings(after) {
  const p = prefs();
  const st = { ...p, officeDays: [...p.officeDays], equipment: [...p.equipment], outDays: [...p.outDays] };
  const box = h('div', { class: 'stack' });
  const kcalIn = intInput({ value: st.canteenKcal });
  const protIn = intInput({ value: st.canteenProtein });
  const outKcalIn = intInput({ value: st.outKcal });
  const outProtIn = intInput({ value: st.outProtein });
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort());
  const cb = (label, key) => h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: st[key], onchange: (e) => { st[key] = e.target.checked; } }), h('span', null, label));
  const render = () => box.replaceChildren(
    field('Bürotage (Kantine mittags)', h('div', { class: 'chips' }, WEEKDAYS_SHORT.slice(0, 5).map((d, i) => h('button', {
      type: 'button', class: 'chip' + (st.officeDays.includes(i) ? ' active' : ''),
      onclick: () => { st.officeDays = st.officeDays.includes(i) ? st.officeDays.filter((x) => x !== i) : [...st.officeDays, i].sort(); render(); },
    }, d))), `${st.officeDays.length}× Büro, ${5 - st.officeDays.length}× Remote`),
    cb('Intervallfasten – kein Frühstück einplanen', 'fasting'),
    field('Küchengeräte zuhause', h('div', { class: 'chips' }, Object.entries(EQUIPMENT).map(([k, l]) => h('button', {
      type: 'button', class: 'chip' + (st.equipment.includes(k) ? ' active' : ''), onclick: () => { st.equipment = toggle(st.equipment, k); render(); },
    }, l))), 'Rezepte, die andere Geräte brauchen, kommen nicht in den Plan.'),
    cb('Heißluftfritteuse bevorzugen', 'preferAirfryer'),
    field('Abends regelmäßig auswärts', h('div', { class: 'chips' }, WEEKDAYS_SHORT.map((d, i) => h('button', {
      type: 'button', class: 'chip' + (st.outDays.includes(i) ? ' active' : ''), onclick: () => { st.outDays = toggle(st.outDays, i); render(); },
    }, d))), 'Wird beim Planen automatisch eingetragen. Spontan geht es pro Mahlzeit im Plan.'),
    field('Max. Kochzeit unter der Woche', segmented([15, 20, 30, 45, 60].map((v) => ({ value: v, label: `${v}′` })), st.maxTime, (v) => { st.maxTime = v; })),
    field('Personen (für die Einkaufsliste)', segmented([1, 2, 3, 4].map((v) => ({ value: v, label: String(v) })), st.servings, (v) => { st.servings = v; })),
    cb('Reste vom Vorabend fürs Remote-Mittagessen', 'leftovers'),
    cb('Snacks automatisch bis zum Kalorienziel auffüllen', 'autoSnacks'),
    cb('Gut bewertete Rezepte bevorzugen', 'preferFav'),
    field('Kantine (Schätzung pro Tag)', h('div', { class: 'grid-2' }, withUnit(kcalIn, 'kcal'), withUnit(protIn, 'g P')), CANTEEN.note),
    field('Auswärts essen (Schätzung pro Mahlzeit)', h('div', { class: 'grid-2' }, withUnit(outKcalIn, 'kcal'), withUnit(outProtIn, 'g P'))),
  );
  render();
  const sheet = openSheet({
    title: 'Plan-Einstellungen',
    body: box,
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          await updateSettings({ prefs: { food: {
            ...st, canteenKcal: readNum(kcalIn) || 850, canteenProtein: readNum(protIn) || 28,
            outKcal: readNum(outKcalIn) || 1000, outProtein: readNum(outProtIn) || 35,
          } } });
          sheet.close(); toast('Gespeichert – beim nächsten Generieren berücksichtigt'); after();
        },
      }, 'Speichern'),
    ],
  });
}

function slotLabel(k) { return k === 'snack' ? 'Snack' : MEALS[k]; }

function slotRow(slotKey, s, onClick, eaten = false) {
  if (!s && slotKey === 'fruehstueck' && prefs().fasting) return null;
  if (s?.r === 'auswaerts') {
    return h('button', { class: 'meal-row out', onclick: onClick },
      recipeImage({ ...EATING_OUT, ing: [] }, { size: 'xs' }),
      h('span', { class: 'meal-main' }, h('span', { class: 'meal-slot' }, slotLabel(slotKey)), h('span', { class: 'meal-name' }, 'Auswärts essen')),
      h('span', { class: 'meal-kcal' }, `≈${fmtInt(prefs().outKcal)}`));
  }
  if (!s) return h('button', { class: 'meal-row empty', onclick: onClick }, h('span', { class: 'meal-slot' }, slotLabel(slotKey)), h('span', { class: 'muted' }, '+ wählen'));
  if (s.r === 'kantine') {
    const p = prefs();
    return h('button', { class: 'meal-row', onclick: onClick },
      recipeImage({ ...CANTEEN, ing: [] }, { size: 'xs' }),
      h('span', { class: 'meal-main' }, h('span', { class: 'meal-slot' }, slotLabel(slotKey)), h('span', { class: 'meal-name' }, 'Kantine: Salatbowl + Dessert')),
      h('span', { class: 'meal-kcal' }, `≈${fmtInt(p.canteenKcal)}`));
  }
  const r = recipeById(s.r);
  if (!r) return null;
  return h('button', { class: 'meal-row' + (eaten ? ' eaten' : ''), onclick: onClick },
    recipeImage(r, { size: 'xs' }),
    h('span', { class: 'meal-main' },
      h('span', { class: 'meal-slot' }, slotLabel(slotKey), s.rest ? ' · Reste' : '', s.locked ? ' · 📌' : '', eaten ? ' · ✓ gegessen' : ''),
      h('span', { class: 'meal-name' }, r.name)),
    h('span', { class: 'meal-kcal' }, fmtInt(r.nut.kcal)));
}

async function openSlot(weekStart, plan, d, slotKey, idx, after) {
  const day = plan.days[d] = plan.days[d] || { snack: [] };
  const get = () => (slotKey === 'snack' ? day.snack[idx] : day[slotKey]);
  const setSlot = (v) => { if (slotKey === 'snack') { if (v) day.snack[idx] = v; else day.snack.splice(idx, 1); } else day[slotKey] = v; };
  const s = get();
  const r = s && s.r !== 'kantine' ? recipeById(s.r) : null;
  const p = prefs();
  const ratings = await loadRatings();
  const save = async (msg) => { await savePlan(weekStart, plan); sheet.close(); if (msg) toast(msg); after(); };
  const reroll = async () => {
    const pool = candidates(slotKey, p, ratings, 60).filter((x) => x.id !== s?.r);
    const pick = pickWeighted(pool, (x) => weightFor(x, ratings, new Map(), p));
    if (pick) { setSlot({ r: pick.id }); await save(`Neu: ${pick.name}`); }
  };
  const choose = () => {
    sheet.close();
    const pool = RECIPES.filter((x) => x.meals.includes(slotKey) && dietFits(x.diet, p.diet))
      .sort((a, b) => (ratings.get(rKey(b))?.stars ?? 3) - (ratings.get(rKey(a))?.stars ?? 3) || b.nut.p - a.nut.p);
    const pick = openSheet({
      title: `${slotLabel(slotKey)} wählen`,
      body: h('div', { class: 'list' },
        slotKey === 'mittag' ? h('button', { class: 'list-item', onclick: async () => { setSlot({ r: 'kantine', locked: true }); await savePlan(weekStart, plan); pick.close(); after(); } },
          h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, '🥗 Kantine'), h('span', { class: 'list-sub' }, `≈ ${p.canteenKcal} kcal`))) : null,
        pool.map((x) => h('button', {
          class: 'list-item',
          onclick: async () => { setSlot({ r: x.id, locked: true }); await savePlan(weekStart, plan); pick.close(); toast(`${x.name} gesetzt`); after(); },
        }, recipeImage(x, { size: 'xs' }), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, x.name), h('span', { class: 'list-sub' }, `${fmtInt(x.nut.kcal)} kcal · ${x.nut.p} g P · ${x.time} Min.`))))),
    });
  };
  const date = addDays(weekStart, d);
  const eatenToday = r ? (await eatenIndex()).byDate.get(date)?.has(r.id) : false;
  const toggleEaten = async () => {
    if (eatenToday) await unmarkEaten(r.id, date); else await markEaten(r.id, date, slotKey);
    sheet.close();
    toast(eatenToday ? 'Haken entfernt' : `${r.name}: gegessen ✓`);
    after();
  };
  const sheet = openSheet({
    title: `${WEEKDAYS_LONG[d]} · ${slotLabel(slotKey)}`,
    body: [
      r ? [recipeImage(r, { size: 'md' }), h('div', { class: 'list-title' }, r.name), h('div', { class: 'muted small' }, `${fmtInt(r.nut.kcal)} kcal · ${r.nut.p} g Protein · ${r.time} Min.${s.rest ? ' · Reste vom Vorabend' : ''}`)]
        : s?.r === 'kantine' ? h('p', null, `Kantine: Salatbowl + Dessert (≈ ${p.canteenKcal} kcal, ${p.canteenProtein} g Protein)`)
          : s?.r === 'auswaerts' ? h('p', null, `Auswärts essen (≈ ${fmtInt(p.outKcal)} kcal, ${p.outProtein} g Protein geschätzt). „Anderen Vorschlag“ plant wieder selbst gekocht.`)
            : h('p', { class: 'muted' }, 'Noch nichts geplant.'),
      h('div', { class: 'list' },
        r && date <= today() ? h('button', { class: 'list-item', onclick: toggleEaten }, icon('check'), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, eatenToday ? 'Gegessen-Haken entfernen' : 'Gegessen ✓'), h('span', { class: 'list-sub' }, 'Wird mit der gemeinsamen Liste geteilt'))) : null,
        r ? h('button', { class: 'list-item', onclick: () => { sheet.close(); openRecipe(r, after); } }, icon('list'), h('span', { class: 'list-main' }, 'Rezept ansehen'), icon('chevR', 18)) : null,
        h('button', { class: 'list-item', onclick: reroll }, icon('refresh'), h('span', { class: 'list-main' }, 'Anderen Vorschlag'), icon('chevR', 18)),
        h('button', { class: 'list-item', onclick: choose }, icon('dot'), h('span', { class: 'list-main' }, 'Aus allen Rezepten wählen'), icon('chevR', 18)),
        slotKey !== 'fruehstueck' && s?.r !== 'auswaerts' ? h('button', { class: 'list-item', onclick: async () => { setSlot({ r: 'auswaerts', locked: true }); await save('Als auswärts markiert – nicht auf der Einkaufsliste'); } },
          h('span', { class: 'li-emoji' }, '🍽️'), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, 'Auswärts essen'), h('span', { class: 'list-sub' }, `≈ ${fmtInt(p.outKcal)} kcal geschätzt, kommt nicht auf die Einkaufsliste`))) : null,
        s && s.r !== 'auswaerts' ? h('button', { class: 'list-item', onclick: async () => { setSlot({ ...s, locked: !s.locked }); await save(s.locked ? 'Gelöst' : 'Fixiert – bleibt beim Neu-Generieren'); } },
          icon('shield'), h('span', { class: 'list-main' }, s.locked ? 'Fixierung lösen' : 'Fixieren (bleibt beim Neu-Generieren)')) : null,
        s ? h('button', { class: 'list-item', onclick: async () => { setSlot(null); await save('Entfernt'); } }, icon('trash'), h('span', { class: 'list-main' }, 'Entfernen')) : null),
    ],
  });
}

/** Seit 0.14 nur vegan: nicht-vegane Rezepte in dieser und künftigen Wochen durch vegane ersetzen. */
async function veganizePlan(wk, plan) {
  if (!plan?.days || wk < weekOf(today())) return 0;
  const p = prefs();
  const ratings = await loadRatings();
  const map = new Map();
  let n = 0;
  const fix = (slot, slotKey) => {
    if (!slot?.r || slot.r === 'kantine' || slot.r === 'auswaerts' || isVeganRecipe(slot.r)) return slot;
    if (!map.has(slot.r)) {
      const taken = new Set(map.values());
      const pool = candidates(slotKey, p, ratings, 60);
      const pick = pickWeighted(pool.filter((x) => !taken.has(x.id)).length ? pool.filter((x) => !taken.has(x.id)) : pool, (x) => weightFor(x, ratings, new Map(), p));
      map.set(slot.r, pick?.id || null);
    }
    n++;
    return map.get(slot.r) ? { ...slot, r: map.get(slot.r) } : null;
  };
  for (const day of Object.values(plan.days)) {
    if (!day) continue;
    for (const k of SLOTS) day[k] = fix(day[k], k);
    day.snack = (day.snack || []).map((x) => fix(x, 'snack')).filter(Boolean);
  }
  const before = (plan.extras || []).length;
  plan.extras = (plan.extras || []).filter((e) => isVeganRecipe(e.r));
  n += before - plan.extras.length;
  if (n) await savePlan(wk, plan);
  return n;
}

async function renderPlan(el, ctx) {
  const wk = isKey(ctx.query.w) ? startOfWeek(ctx.query.w) : weekOf(today());
  const p = prefs();
  const t = targets();
  const after = () => ctx.refresh();
  let plan = await getPlan(wk);
  const replaced = await veganizePlan(wk, plan);
  if (replaced) toast(`${replaced} nicht-vegane ${replaced === 1 ? 'Mahlzeit' : 'Mahlzeiten'} durch vegane ersetzt`);
  const eatenIdx = await eatenIndex();
  const eatenOn = (date, slot) => !!(slot?.r && eatenIdx.byDate.get(date)?.has(slot.r));
  const go = (w) => ctx.navigate('/kochen', { v: 'plan', w: w === weekOf(today()) ? undefined : w }, { replace: true });
  const generate = async () => {
    const ratings = await loadRatings();
    plan = generateWeek(wk, p, ratings, plan);
    await savePlan(wk, plan);
    toast('Wochenplan erstellt');
    after();
  };

  el.append(h('div', { class: 'week-nav' },
    h('button', { class: 'icon-btn', 'aria-label': 'Vorige Woche', onclick: () => go(addDays(wk, -7)) }, icon('chevL')),
    h('div', { class: 'center' }, h('strong', null, wk === weekOf(today()) ? 'Diese Woche' : wk === addDays(weekOf(today()), 7) ? 'Nächste Woche' : `Woche ab ${formatDate(wk, 'short')}`),
      h('div', { class: 'small muted' }, `${formatDate(wk, 'short')} – ${formatDate(addDays(wk, 6), 'short')}`)),
    h('button', { class: 'icon-btn', 'aria-label': 'Nächste Woche', onclick: () => go(addDays(wk, 7)) }, icon('chevR'))));

  if (!t.set) {
    el.append(h('a', { class: 'banner', href: '#/einstellungen?s=ziele' }, icon('info'),
      h('div', { style: { flex: 1 } }, h('strong', null, 'Kalorienziel festlegen'), h('div', { class: 'small muted' }, `Ich plane vorerst mit ${fmtInt(t.kcal)} kcal. Den Richtwert für dich berechnet die App in den Einstellungen.`)), icon('chevR', 18)));
  }

  el.append(h('div', { class: 'btn-row' },
    h('button', { class: 'btn btn-primary', onclick: generate }, icon('refresh', 18), plan ? 'Neu vorschlagen' : 'Woche planen'),
    h('button', { class: 'btn', onclick: () => openPlanSettings(after) }, icon('settings', 18), 'Einstellungen')));

  if (!plan) {
    el.append(card(null, {}, emptyState(`Ich erstelle dir einen Wochenplan mit Frühstück, Mittag und Abendessen. An deinen Bürotagen (${p.officeDays.map((i) => WEEKDAYS_SHORT[i]).join(', ')}) ist mittags die Kantine eingeplant, an Remote-Tagen gibt es schnelle Rezepte oder Reste vom Vorabend.`)));
    return;
  }

  const days = dayRange(wk, addDays(wk, 6));
  const totals = days.map((_, d) => dayTotals(plan.days?.[d]));
  const avg = { kcal: totals.reduce((a, x) => a + x.kcal, 0) / 7, p: totals.reduce((a, x) => a + x.p, 0) / 7 };
  el.append(h('div', { class: 'stat-grid' },
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, fmtInt(avg.kcal)), h('span', { class: 'stat-label' }, `Ø kcal/Tag (Ziel ${fmtInt(t.kcal)})`)),
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, fmtInt(avg.p) + ' g'), h('span', { class: 'stat-label' }, `Ø Protein (Ziel ${t.protein} g)`)),
    h('a', { class: 'stat link-stat', href: '#/kochen?v=einkauf' + (ctx.query.w ? '&w=' + ctx.query.w : '') }, h('span', { class: 'stat-val' }, icon('list', 20)), h('span', { class: 'stat-label' }, 'Einkaufsliste'))));

  days.forEach((date, d) => {
    const day = plan.days?.[d] || { snack: [] };
    const tot = totals[d];
    const ratio = tot.kcal / t.kcal;
    const open = (k, i) => () => openSlot(wk, plan, d, k, i, after);
    el.append(h('section', { class: 'card day-card' + (date === today() ? ' is-today' : '') },
      h('div', { class: 'card-head' },
        h('h2', null, `${WEEKDAYS_LONG[d]}, ${formatDate(date, 'short')}`),
        h('div', { class: 'card-actions' },
          h('button', {
            class: 'out-toggle' + (day.abend?.r === 'auswaerts' ? ' on' : ''), title: 'Abends auswärts',
            onclick: async () => {
              plan.days[d] = day;
              day.abend = day.abend?.r === 'auswaerts' ? null : { r: 'auswaerts', locked: true };
              if (!day.abend) {
                const ratings = await loadRatings();
                const pick = pickWeighted(candidates('abend', p, ratings, p.maxTime), (x) => weightFor(x, ratings, new Map(), p));
                day.abend = pick ? { r: pick.id } : null;
              }
              await savePlan(wk, plan); after();
            },
          }, '🍽️ auswärts'),
          h('span', { class: 'tag', dataset: { kind: dayKind(date, p) } }, dayKind(date, p)))),
      h('div', { class: 'meals' },
        SLOTS.map((k) => slotRow(k, day[k], open(k), eatenOn(date, day[k]))),
        (day.snack || []).map((s, i) => slotRow('snack', s, open('snack', i), eatenOn(date, s))),
        h('button', { class: 'meal-add', onclick: open('snack', (day.snack || []).length) }, '+ Snack')),
      h('div', { class: 'metric' },
        h('div', { class: 'metric-top' }, h('span', { class: 'small muted' }, 'Geschätzt'), h('span', { class: 'num small' }, `${fmtInt(tot.kcal)} / ${fmtInt(t.kcal)} kcal · ${fmtInt(tot.p)} g P`)),
        h('div', { class: 'bar' }, h('div', { class: 'bar-fill' + (ratio > 1.12 ? ' over' : ''), style: { width: Math.min(ratio, 1) * 100 + '%' } })))));
  });
  el.append(h('p', { class: 'muted small center' }, 'Tippe auf eine Mahlzeit, um sie zu tauschen, auszuwählen oder zu fixieren. Alle Werte sind Schätzungen.'));
}

// ---------- Einkaufsliste-Ansicht ----------
async function renderShopping(el, ctx) {
  const wk = isKey(ctx.query.w) ? startOfWeek(ctx.query.w) : weekOf(today());
  const p = prefs();
  const plan = await getPlan(wk);
  await veganizePlan(wk, plan);
  if (!plan) {
    el.append(card(null, {}, emptyState('Erstelle zuerst einen Wochenplan – daraus entsteht die Einkaufsliste.',
      h('a', { class: 'btn btn-primary', href: '#/kochen?v=plan' }, 'Zum Wochenplan'))));
    return;
  }
  const isCur = wk === weekOf(today());
  const shopDays = plan.shopDays || [0, 1, 2, 3, 4, 5, 6].filter((d) => !isCur || d >= weekday(today()));
  const setDays = async (days) => { plan.shopDays = days; await savePlan(wk, plan); ctx.refresh(); };
  const list = buildShopping(plan, p, shopDays);
  const total = list.groups.reduce((a, g) => a + g.items.length, 0);
  const done = list.groups.reduce((a, g) => a + g.items.filter((i) => plan.checked?.[i.id]).length, 0);
  const text = shoppingText(list, plan, wk);
  const toggle = async (id, on) => {
    plan.checked = { ...(plan.checked || {}), [id]: on };
    if (!on) delete plan.checked[id];
    await savePlan(wk, plan);
  };

  el.append(h('div', { class: 'card shop-head' },
    h('div', null, h('strong', null, `Woche ab ${formatDate(wk, 'short')}`),
      h('div', { class: 'small muted' }, `${done}/${total} erledigt · ${p.servings} ${p.servings === 1 ? 'Person' : 'Personen'} · ${[...list.portions.values()].reduce((a, b) => a + b, 0)} Portionen${list.out ? ` · ${list.out}× auswärts` : ''}`)),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn btn-primary small',
        onclick: async () => {
          try {
            if (navigator.share) { await navigator.share({ title: 'Einkaufsliste', text }); return; }
          } catch (err) { if (err.name === 'AbortError') return; }
          try { await navigator.clipboard.writeText(text); toast('Liste kopiert'); } catch { toast('Teilen nicht möglich'); }
        },
      }, icon('share', 16), 'Teilen'),
      done ? h('button', { class: 'btn small', onclick: async () => { plan.checked = {}; await savePlan(wk, plan); ctx.refresh(); } }, 'Haken zurücksetzen') : null)));

  el.append(card('Einkaufen für', { iconName: 'calendar' },
    h('div', { class: 'chips' }, WEEKDAYS_SHORT.map((dn, d) => {
      const dayPlan = plan.days?.[d];
      const home = dayPlan && [...SLOTS.map((k) => dayPlan[k]), ...(dayPlan.snack || [])].some((x) => x && x.r !== 'kantine' && x.r !== 'auswaerts');
      return h('button', {
        type: 'button', class: 'chip' + (shopDays.includes(d) ? ' active' : '') + (home ? '' : ' faint'),
        onclick: () => setDays(shopDays.includes(d) ? shopDays.filter((x) => x !== d) : [...shopDays, d].sort()),
      }, dn);
    })),
    h('div', { class: 'btn-row' },
      isCur ? h('button', { class: 'btn btn-ghost small', onclick: () => setDays([0, 1, 2, 3, 4, 5, 6].filter((d) => d >= weekday(today()))) }, 'Ab heute') : null,
      h('button', { class: 'btn btn-ghost small', onclick: () => setDays([0, 1, 2, 3, 4, 5, 6]) }, 'Ganze Woche'),
      h('button', { class: 'btn btn-ghost small', onclick: () => setDays(isCur ? [weekday(today()), weekday(today()) + 1].filter((d) => d < 7) : [0, 1]) }, 'Nur 2 Tage')),
    h('p', { class: 'muted small' }, 'Wähle die Tage, für die du jetzt einkaufst – z. B. in zwei kleineren Runden. Auswärts-Mahlzeiten und Kantine landen nie auf der Liste.')));

  for (const g of list.groups) {
    el.append(card(g.label, {}, h('div', { class: 'list' }, g.items.map((i) => {
      const cb = h('input', { type: 'checkbox', checked: !!plan.checked?.[i.id] });
      const row = h('label', { class: 'shop-item' + (cb.checked ? ' done' : '') },
        cb, h('span', { class: 'shop-emoji' }, i.emoji),
        h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, i.name), h('span', { class: 'list-sub' }, i.recipes.slice(0, 2).join(', ') + (i.recipes.length > 2 ? ` +${i.recipes.length - 2}` : ''))),
        h('span', { class: 'shop-amt' }, i.amount));
      cb.addEventListener('change', () => { row.classList.toggle('done', cb.checked); toggle(i.id, cb.checked); });
      return row;
    }))));
  }
  if (list.pantry.length || list.spices.length) {
    el.append(card('Vorrat prüfen', { iconName: 'info' },
      list.pantry.length ? h('p', { class: 'small' }, list.pantry.map((i) => `${i.emoji} ${i.name}`).join(' · ')) : null,
      list.spices.length ? h('p', { class: 'small muted' }, h('strong', null, 'Gewürze: '), list.spices.join(', ')) : null));
  }
  if (plan.extras?.length) {
    el.append(sectionTitle('Zusätzlich auf der Liste'), card(null, {}, h('div', { class: 'list' }, plan.extras.map((e, idx) => {
      const r = recipeById(e.r);
      return h('div', { class: 'list-item static' }, r ? recipeImage(r, { size: 'xs' }) : null,
        h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, r?.name || e.r), h('span', { class: 'list-sub' }, `${e.n || 1} Portion(en)`)),
        h('button', { class: 'icon-btn small', 'aria-label': 'Entfernen', onclick: async () => { plan.extras.splice(idx, 1); await savePlan(wk, plan); ctx.refresh(); } }, icon('trash', 18)));
    }))));
  }
  el.append(h('p', { class: 'muted small center' }, 'Mengen sind auf die Rezepte gerechnet; Packungsgrößen rundest du beim Einkaufen.'));
}

// ---------- Seite ----------
// Bewertungen/Gegessen-Haken von anderen (per WhatsApp-Link übernommen) → Seite neu zeichnen
let shownCtx = null;
on('teilen:import', () => {
  if (shownCtx && parseHash().path === shownCtx.path) shownCtx.refresh();
});

async function render(el, ctx) {
  shownCtx = ctx;
  const view = ctx.query.v || 'plan';
  el.append(pageHeader('Kochen'));
  el.append(segmented([{ value: 'plan', label: 'Wochenplan' }, { value: 'rezepte', label: 'Rezepte' }, { value: 'einkauf', label: 'Einkauf' }], view,
    (v) => ctx.navigate('/kochen', { v: v === 'plan' ? undefined : v, w: ctx.query.w }, { replace: true })));
  if (view === 'rezepte') return renderRecipes(el, ctx);
  if (view === 'einkauf') return renderShopping(el, ctx);
  return renderPlan(el, ctx);
}

// ---------- Startseite ----------
async function todayCard(date, data, ctx) {
  const wk = weekOf(date);
  const plan = await getPlan(wk);
  const d = weekday(date);
  const t = targets();
  if (!plan?.days?.[d]) {
    return card('Essen heute', { iconName: 'food' },
      h('p', { class: 'muted small' }, 'Noch kein Wochenplan – lass dir Rezepte für die Woche vorschlagen, inklusive Einkaufsliste.'),
      h('a', { class: 'btn btn-primary', href: '#/kochen' }, 'Woche planen'));
  }
  const day = plan.days[d];
  const tot = dayTotals(day);
  const open = (k, i) => () => openSlot(wk, plan, d, k, i, () => ctx.refresh());
  return card(`Essen heute · ${dayKind(date)}`, {
    iconName: 'food',
    actions: h('a', { class: 'link', href: '#/kochen' }, 'Woche'),
  },
  h('div', { class: 'meals' },
    SLOTS.map((k) => slotRow(k, day[k], open(k))),
    (day.snack || []).map((s, i) => slotRow('snack', s, open('snack', i)))),
  h('div', { class: 'metric' },
    h('div', { class: 'metric-top' }, h('span', { class: 'small muted' }, 'Geschätzt'), h('span', { class: 'num small' }, `${fmtInt(tot.kcal)} / ${fmtInt(t.kcal)} kcal · ${fmtInt(tot.p)} / ${t.protein} g Protein`)),
    h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: Math.min(tot.kcal / t.kcal, 1) * 100 + '%' } }))));
}

/** Zeile für die Morgen-Erinnerung. */
async function reminderNote(slot, date) {
  if (slot !== 'morgen') return null;
  const plan = await getPlan(weekOf(date));
  const day = plan?.days?.[weekday(date)];
  if (!day) return null;
  const name = (s) => (!s ? null : s.r === 'kantine' ? 'Kantine' : recipeById(s.r)?.name);
  const parts = [['Mittag', name(day.mittag)], ['Abend', name(day.abend)]].filter(([, n]) => n).map(([k, n]) => `${k}: ${n}`);
  return parts.length ? `🍽 ${parts.join(' · ')}` : null;
}

// ---------- Diagramme (geschätzt laut Plan) ----------
async function plannedSeries(from, to, pick) {
  const plans = await entries.byType('mealplan');
  const byWeek = new Map(plans.map((e) => [e.date, e.data]));
  return (k) => {
    const day = byWeek.get(startOfWeek(k))?.days?.[weekday(k)];
    if (!day) return null;
    const t = dayTotals(day);
    return t.kcal ? pick(t) : null;
  };
}

const charts = [
  {
    id: 'plan-kcal', title: 'Kalorien laut Wochenplan (geschätzt)',
    async render(el, { from, to }) {
      const get = await plannedSeries(from, to, (t) => t.kcal);
      el.append(barChart(bucketize(from, to, get).points, { target: targets().kcal, hit: (v, t) => Math.abs(v - t) <= t * 0.1, label: 'Kalorien laut Plan' }));
    },
  },
  {
    id: 'plan-protein', title: 'Protein laut Wochenplan (g, geschätzt)',
    async render(el, { from, to }) {
      const get = await plannedSeries(from, to, (t) => t.p);
      el.append(barChart(bucketize(from, to, get).points, { target: targets().protein, label: 'Protein laut Plan' }));
    },
  },
];

registerModule({
  id: 'nutrition',
  area: 'fitness',
  title: 'Kochen',
  description: 'Rezepte, Wochenplan & Einkaufsliste',
  order: 30,
  nav: { tab: 3, label: 'Kochen', icon: 'food' },
  routes: [{ path: '/kochen', render }, { path: '/ernaehrung', render }],
  todayCard, charts, reminderNote,
});

