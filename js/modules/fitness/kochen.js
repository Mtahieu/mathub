// Kochen: alle (veganen) Rezepte – aufgebaut wie die Filme. Gegessen abhaken, danach bewerten,
// schon gegessene sind eingeklappt. Personenzahl wählbar; Einkaufsliste aus gewählten Rezepten.
//
// Daten: Rezepte in food-data.js · gegessen: rezept-log.js (items 'gegessen') · Bewertungen: ratings.js
//   (items 'rating') – beides wird per WhatsApp geteilt (teilen.js).
// Personen: settings.prefs.food.servings · Einkaufsliste: kv 'kochen:einkauf' {recipes:[{r, n}], checked:{zutat:true}}
// Ältere Daten (Wochenplan 'mealplan' bis 0.16) bleiben in der Datenbank, werden aber nicht mehr genutzt.

import { registerModule } from '../../core/registry.js';
import { on } from '../../core/events.js';
import { parseHash } from '../../core/router.js';
import { kv } from '../../core/db.js';
import { getSettingsSync, updateSettings } from '../../core/settings.js';
import { h, icon, card, pageHeader, segmented, openSheet, toast, field, textInput, fmtInt, starRating, emptyState } from '../../core/ui.js';
import { today, formatDate } from '../../core/dates.js';
import { RECIPES, INGREDIENTS, CATEGORIES, MEALS, CUISINES, TAGS, EQUIPMENT, recipeById, formatAmount } from './food-data.js';
import { loadRatings, rate } from './ratings.js';
import { recipeSvg, hasIngredientLook } from './rezept-bild.js';
import { markEaten, unmarkEaten, eatenIndex } from './rezept-log.js';
import { teaser } from './rezept-texte.js';

const rKey = (r) => 'rezept:' + (r.id || r);
const persons = () => getSettingsSync().prefs.food?.servings || 1;
const setPersons = (n) => updateSettings({ prefs: { food: { ...getSettingsSync().prefs.food, servings: n } } });
const personsLabel = (n) => `${n} ${n === 1 ? 'Person' : 'Personen'}`;

// ---------- Bild ----------
export function recipeImage(r, { size = 'md' } = {}) {
  if (!hasIngredientLook(r)) return h('div', { class: `rimg rimg-${size}`, style: { '--h': r.hue ?? 30 } }, h('span', { class: 'rimg-main' }, r.emoji || '🍽️'));
  return h('div', { class: `rimg rimg-${size} rimg-drawn`, role: 'img', 'aria-label': r.name }, recipeSvg(r));
}

// ---------- Einkaufsliste ----------
async function getCart() { return { recipes: [], checked: {}, ...(await kv.get('kochen:einkauf', {})) }; }
const saveCart = (c) => kv.set('kochen:einkauf', c);

async function addToCart(r, n) {
  const c = await getCart();
  const ex = c.recipes.find((x) => x.r === r.id);
  if (ex) ex.n += n; else c.recipes.push({ r: r.id, n });
  await saveCart(c);
}

function buildShopping(cart) {
  const amounts = new Map(); const usedIn = new Map(); const spices = new Set();
  for (const { r: id, n } of cart.recipes) {
    const r = recipeById(id);
    if (!r) continue;
    for (const [zid, g] of r.ing) {
      if (zid === 'gewuerze') continue;
      amounts.set(zid, (amounts.get(zid) || 0) + g * n);
      (usedIn.get(zid) || usedIn.set(zid, new Set()).get(zid)).add(r.name);
    }
    (r.spice || '').split(/,|\(|\)/).map((x) => x.trim()).filter((x) => x && !/^\d|^optional|^1 /.test(x)).forEach((x) => spices.add(x));
  }
  const groups = CATEGORIES.map((c) => ({ ...c, items: [] }));
  const pantry = [];
  for (const [zid, g] of amounts) {
    const z = INGREDIENTS[zid];
    const item = { id: zid, name: z.buyAs || z.name, emoji: z.emoji, amount: formatAmount(zid, g), recipes: [...usedIn.get(zid)] };
    if (z.pantry) pantry.push(item); else groups.find((c) => c.id === z.cat)?.items.push(item);
  }
  for (const gr of groups) gr.items.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return { groups: groups.filter((g) => g.items.length), pantry, spices: [...spices].sort((a, b) => a.localeCompare(b, 'de')) };
}

function shoppingText(list, cart) {
  const lines = ['Einkaufsliste', ''];
  for (const g of list.groups) {
    const open = g.items.filter((i) => !cart.checked?.[i.id]);
    if (!open.length) continue;
    lines.push(`${g.label}:`, ...open.map((i) => `☐ ${i.amount} ${i.name}`), '');
  }
  if (list.pantry.length) lines.push('Vorrat prüfen: ' + list.pantry.map((i) => i.name).join(', '));
  if (list.spices.length) lines.push('Gewürze: ' + list.spices.join(', '));
  return lines.join('\n').trim();
}

// ---------- Gegessen ----------
async function setEaten(r, eaten, after) {
  if (eaten) {
    await markEaten(r.id, today());
    toast(`„${r.name}“ als gegessen markiert`, { action: 'Rückgängig', onAction: async () => { await unmarkEaten(r.id, today()); after(); } });
  } else {
    await unmarkEaten(r.id, today());
    toast('Haken für heute entfernt');
  }
  after();
}

// ---------- Rezept-Details ----------
function nutRow(n) {
  return h('div', { class: 'nut-row' },
    h('div', null, h('strong', null, fmtInt(n.kcal)), h('span', null, 'kcal')),
    h('div', null, h('strong', null, n.p + ' g'), h('span', null, 'Protein')),
    h('div', null, h('strong', null, n.c + ' g'), h('span', null, 'Kohlenh.')),
    h('div', null, h('strong', null, n.f + ' g'), h('span', null, 'Fett')));
}

async function openRecipe(r, ctx) {
  const after = () => ctx.refresh();
  const ratings = await loadRatings();
  const rec = ratings.get(rKey(r));
  const log = (await eatenIndex()).byRecipe.get(r.id) || [];
  const eatenToday = log.some((e) => e.date === today());
  let n = persons();
  const ingBox = h('ul', { class: 'ing-list' });
  const pLabel = h('strong');
  const renderIng = () => {
    pLabel.textContent = personsLabel(n);
    ingBox.replaceChildren(...r.ing.filter(([id]) => id !== 'gewuerze').map(([id, g, note]) => {
      const z = INGREDIENTS[id];
      return h('li', null, h('span', { class: 'ing-emoji' }, z.emoji),
        h('span', { class: 'ing-amt' }, n === 1 ? formatAmount(id, g, note) : formatAmount(id, g * n)), h('span', null, z.name));
    }));
  };
  renderIng();
  const body = [
    h('div', { class: 'food-hero detail' }, recipeImage(r, { size: 'lg' }),
      h('div', { class: 'food-hero-text' },
        h('div', { class: 'food-hero-meta' }, `⏱ ${r.time} Min. · ${fmtInt(r.nut.kcal)} kcal · ${r.nut.p} g Protein`))),
    teaser(r) ? h('p', { class: 'food-teaser' }, teaser(r)) : null,
    h('div', { class: 'chips' },
      h('span', { class: 'tag' }, `⏱ ${r.time} Min.`),
      h('span', { class: 'tag' }, CUISINES[r.cuisine]),
      r.meals.map((m) => h('span', { class: 'tag' }, MEALS[m])),
      r.allTags.map((t) => h('span', { class: 'tag' }, TAGS[t]))),
    nutRow(r.nut),
    h('p', { class: 'muted small' }, `Schätzwerte pro Person · ${r.eq.length ? 'Geräte: ' + r.eq.map((e) => EQUIPMENT[e]).join(' + ') : 'ohne Kochen'}`),
    r.af ? h('div', { class: 'banner small af-tip' }, h('span', { class: 'li-emoji' }, '🍟'), h('span', null, h('strong', null, 'Mit Heißluftfritteuse: '), r.af)) : null,
    h('div', { class: 'stepper' },
      h('button', { class: 'icon-btn', 'aria-label': 'Weniger Personen', onclick: () => { n = Math.max(1, n - 1); renderIng(); } }, icon('minus')),
      pLabel,
      h('button', { class: 'icon-btn', 'aria-label': 'Mehr Personen', onclick: () => { n = Math.min(12, n + 1); renderIng(); } }, icon('plus'))),
    ingBox,
    r.spice ? h('p', { class: 'small muted' }, h('strong', null, 'Gewürze: '), r.spice) : null,
    h('ol', { class: 'steps' }, r.steps.map((st) => h('li', null, st))),
  ];
  if (log.length) {
    body.push(h('p', { class: 'small muted' }, `${log.length}× gegessen · zuletzt ${formatDate(log[0].date)}${log[0].updatedBy ? ` (${log[0].updatedBy})` : ''}`));
    body.push(field('Deine Bewertung', starRating(rec?.stars, async (v) => {
      await rate(rKey(r), v);
      toast(v ? 'Bewertung gespeichert' : 'Bewertung entfernt');
      after();
    }), rec?.updatedBy ? `Zuletzt bewertet von ${rec.updatedBy}` : null));
  }
  const sheet = openSheet({
    title: r.name,
    body,
    footer: [
      h('button', { class: 'btn', onclick: async () => { await addToCart(r, n); toast(`Für ${personsLabel(n)} auf die Einkaufsliste`); after(); } }, icon('list', 18), ' Einkaufsliste'),
      eatenToday
        ? h('button', { class: 'btn', onclick: async () => { sheet.close(); await setEaten(r, false, after); } }, 'Heute nicht gegessen')
        : h('button', { class: 'btn btn-primary', onclick: async () => { sheet.close(); await setEaten(r, true, after); } }, icon('check', 18), log.length ? ' Wieder gegessen' : ' Gegessen'),
    ],
  });
}

// ---------- Übersicht ----------
const MEAL_CHIPS = [['alle', 'Alle'], ...Object.entries(MEALS)];
const TAG_CHIPS = ['schnell', 'highprotein', 'airfryer', 'ohnekochen', 'mealprep', 'onepot', 'guenstig'].filter((t) => TAGS[t]);
const COZY = /suppe|curry|dal|chili|risotto|bolognese|porridge/;
const SHELVES = [
  { title: 'Schnell & einfach', emoji: '⚡', pick: (r) => r.allTags.includes('schnell') },
  { title: 'Wohlfühlessen', emoji: '🍲', pick: (r) => COZY.test(r.id) },
  { title: 'Proteinbomben', emoji: '💪', pick: (r) => r.allTags.includes('highprotein'), sort: (a, b) => b.nut.p - a.nut.p },
  { title: 'Aus der Heißluftfritteuse', emoji: '🍟', pick: (r) => r.allTags.includes('airfryer') },
  { title: 'Frühstück', emoji: '🥣', pick: (r) => r.meals.includes('fruehstueck') },
  { title: 'Kleine Snacks', emoji: '🥜', pick: (r) => r.meals.includes('snack') },
];

/** Rezept des Tages: passend zur Tageszeit, bevorzugt noch nicht gegessen – jeden Tag ein anderes. */
function dishOfTheDay(eaten) {
  const hr = new Date().getHours();
  const meal = hr < 11 ? 'fruehstueck' : hr < 15 ? 'mittag' : hr < 17 ? 'snack' : 'abend';
  let pool = RECIPES.filter((r) => r.meals.includes(meal));
  const fresh = pool.filter((r) => !eaten.byRecipe.has(r.id));
  if (fresh.length) pool = fresh;
  let x = 0;
  for (const ch of today() + meal) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return { r: pool[x % pool.length], meal };
}

function eatenBadge(r, eaten, ratings) {
  const log = eaten.byRecipe.get(r.id);
  const stars = ratings.get(rKey(r))?.stars;
  if (!log && !stars) return null;
  return h('span', { class: 'ftile-badge' }, log ? `✓ ${log.length}×` : '', stars ? ` ${'★'.repeat(stars)}` : '');
}

function foodTile(r, ctx, eaten, ratings, { wide = false } = {}) {
  const ate = eaten.byRecipe.has(r.id);
  return h('div', { class: 'ftile' + (wide ? ' wide' : '') },
    h('button', { class: 'ftile-btn', type: 'button', onclick: () => openRecipe(r, ctx), 'aria-label': r.name },
      recipeImage(r, { size: 'md' }),
      h('span', { class: 'ftile-shade' }),
      eatenBadge(r, eaten, ratings),
      h('span', { class: 'ftile-text' },
        h('span', { class: 'ftile-title' }, r.name),
        h('span', { class: 'ftile-meta' }, `⏱ ${r.time}′ · ${fmtInt(r.nut.kcal)} kcal`))),
    ate ? null : h('button', {
      class: 'ftile-check', type: 'button', 'aria-label': `${r.name} als gegessen markieren`,
      onclick: (e) => { e.stopPropagation(); setEaten(r, true, () => ctx.refresh()); },
    }, icon('check', 16)));
}

let shownCtx = null;
on('teilen:import', () => { if (shownCtx && parseHash().path === shownCtx.path) shownCtx.refresh(); });

let filter = { q: '', meal: 'alle', tag: null };
let doneOpen = false;   // „Schon gegessen“ aufgeklappt? (bleibt beim Neuzeichnen erhalten)

function openPersons(ctx) {
  const sheet = openSheet({
    title: 'Für wie viele Personen?',
    body: [
      h('p', { class: 'small muted' }, 'Gilt für alle Mengenangaben und die Einkaufsliste – im Rezept kannst du es einzeln anpassen.'),
      segmented([1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) })), persons(), async (v) => { await setPersons(v); sheet.close(); toast(`Mengen für ${personsLabel(v)}`); ctx.refresh(); }),
    ],
  });
}

async function renderRecipes(el, ctx) {
  const ratings = await loadRatings();
  const eaten = await eatenIndex();
  const cart = await getCart();
  const cartCount = cart.recipes.length;

  el.append(pageHeader('Kochen', {
    eyebrow: 'Vegan & lecker',
    actions: [
      h('button', { class: 'icon-btn persons-btn', 'aria-label': 'Personenzahl', onclick: () => openPersons(ctx) }, '👥', h('span', null, persons())),
      h('a', { class: 'icon-btn badge-host', 'aria-label': 'Einkaufsliste', href: '#/kochen?v=einkauf' }, icon('list'), cartCount ? h('span', { class: 'count-badge' }, cartCount) : null),
      h('a', { class: 'icon-btn', 'aria-label': 'Teilen per WhatsApp', href: '#/teilen' }, icon('share')),
    ],
  }));

  const search = textInput({ value: filter.q, placeholder: 'Worauf hast du Lust? (z. B. Curry, Tofu)' });
  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filter.q = search.value; draw(); }, 200); });
  el.append(h('div', { class: 'search' }, icon('search', 18), search));
  const chip = (label, active, onclick) => h('button', { type: 'button', class: 'chip' + (active ? ' active' : ''), onclick }, label);
  el.append(h('div', { class: 'chips scroll' },
    MEAL_CHIPS.map(([k, l]) => chip(l, filter.meal === k, () => { filter.meal = k; ctx.refresh(); })),
    TAG_CHIPS.map((k) => chip(TAGS[k], filter.tag === k, () => { filter.tag = filter.tag === k ? null : k; ctx.refresh(); }))));

  const box = h('div', { class: 'food-page' });
  el.append(box);

  function draw() {
    const q = filter.q.trim().toLowerCase();
    const filtering = q || filter.meal !== 'alle' || filter.tag;
    const shown = RECIPES.filter((r) => (filter.meal === 'alle' || r.meals.includes(filter.meal))
      && (!filter.tag || r.allTags.includes(filter.tag))
      && (!q || r.name.toLowerCase().includes(q) || teaser(r).toLowerCase().includes(q) || r.ing.some(([id]) => INGREDIENTS[id]?.name.toLowerCase().includes(q))));
    const stars = (r) => ratings.get(rKey(r))?.stars ?? 0;
    const open = shown.filter((r) => !eaten.byRecipe.has(r.id)).sort((a, b) => stars(b) - stars(a) || a.name.localeCompare(b.name, 'de'));
    const done = shown.filter((r) => eaten.byRecipe.has(r.id))
      .sort((a, b) => stars(b) - stars(a) || (eaten.byRecipe.get(b.id)[0].date > eaten.byRecipe.get(a.id)[0].date ? 1 : -1));
    const parts = [];

    if (!filtering) {
      const { r: hero, meal } = dishOfTheDay(eaten);
      const label = { fruehstueck: 'zum Frühstück', mittag: 'zum Mittag', snack: 'zwischendurch', abend: 'heute Abend' }[meal];
      parts.push(h('button', { class: 'food-hero', type: 'button', onclick: () => openRecipe(hero, ctx) },
        recipeImage(hero, { size: 'lg' }),
        h('span', { class: 'ftile-shade' }),
        h('span', { class: 'food-hero-text' },
          h('span', { class: 'food-hero-kicker' }, `Lust auf … ${label}?`),
          h('span', { class: 'food-hero-title' }, hero.name),
          h('span', { class: 'food-hero-teaser' }, teaser(hero)),
          h('span', { class: 'food-hero-meta' }, `⏱ ${hero.time} Min. · ${fmtInt(hero.nut.kcal)} kcal · ${hero.nut.p} g Protein`))));
      for (const sh of SHELVES) {
        const list = RECIPES.filter(sh.pick).sort(sh.sort || ((a, b) => (eaten.byRecipe.has(a.id) - eaten.byRecipe.has(b.id)) || stars(b) - stars(a)));
        if (list.length < 2) continue;
        parts.push(h('section', { class: 'shelf' },
          h('h2', { class: 'shelf-title' }, `${sh.emoji} ${sh.title}`),
          h('div', { class: 'carousel' }, list.map((r) => foodTile(r, ctx, eaten, ratings, { wide: true })))));
      }
    }

    parts.push(h('section', { class: 'shelf' },
      h('h2', { class: 'shelf-title' }, filtering ? `Treffer (${open.length})` : `Alle Rezepte (${open.length})`),
      open.length ? h('div', { class: 'fgrid' }, open.map((r) => foodTile(r, ctx, eaten, ratings)))
        : card(null, {}, emptyState(shown.length ? 'Alles schon gegessen – stark!' : 'Kein Rezept passt – probier ein anderes Stichwort.'))));

    if (done.length) {
      parts.push(h('details', { class: 'card collapse', open: doneOpen, ontoggle: (e) => { doneOpen = e.currentTarget.open; } },
        h('summary', null, icon('check', 20), h('strong', null, `Schon gegessen (${done.length})`), h('span', { class: 'collapse-hint small muted' }, 'antippen zum Aufklappen')),
        h('div', { class: 'fgrid' }, done.map((r) => foodTile(r, ctx, eaten, ratings)))));
    }
    box.replaceChildren(...parts);
  }
  draw();
}

async function renderShopping(el, ctx) {
  const cart = await getCart();
  el.append(pageHeader('Einkaufsliste', { eyebrow: 'Kochen', actions: h('a', { class: 'icon-btn', href: '#/kochen', 'aria-label': 'Zurück' }, icon('x')) }));
  if (!cart.recipes.length) {
    el.append(card(null, {}, emptyState('Noch leer. Öffne ein Rezept und tippe „Einkaufsliste“.', h('a', { class: 'btn btn-primary', href: '#/kochen' }, 'Zu den Rezepten'))));
    return;
  }
  const list = buildShopping(cart);
  const text = shoppingText(list, cart);
  const total = list.groups.reduce((a, g) => a + g.items.length, 0);
  const done = list.groups.reduce((a, g) => a + g.items.filter((i) => cart.checked?.[i.id]).length, 0);
  el.append(h('div', { class: 'card shop-head' },
    h('div', null, h('strong', null, `${done}/${total} erledigt`), h('div', { class: 'small muted' }, `${cart.recipes.length} ${cart.recipes.length === 1 ? 'Rezept' : 'Rezepte'}`)),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn btn-primary small',
        onclick: async () => {
          try { if (navigator.share) { await navigator.share({ title: 'Einkaufsliste', text }); return; } } catch (err) { if (err.name === 'AbortError') return; }
          try { await navigator.clipboard.writeText(text); toast('Liste kopiert'); } catch { toast('Teilen nicht möglich'); }
        },
      }, icon('share', 16), 'Teilen'),
      h('button', { class: 'btn small', onclick: async () => { await saveCart({ recipes: [], checked: {} }); toast('Liste geleert'); ctx.refresh(); } }, 'Leeren'))));

  el.append(card('Rezepte', { iconName: 'food' }, h('div', { class: 'list' }, cart.recipes.map((x, idx) => {
    const r = recipeById(x.r);
    const setN = async (v) => { if (v < 1) cart.recipes.splice(idx, 1); else x.n = v; await saveCart(cart); ctx.refresh(); };
    return h('div', { class: 'list-item static' }, r ? recipeImage(r, { size: 'xs' }) : null,
      h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, r?.name || x.r), h('span', { class: 'list-sub' }, personsLabel(x.n))),
      h('button', { class: 'icon-btn small', 'aria-label': 'Weniger', onclick: () => setN(x.n - 1) }, icon(x.n > 1 ? 'minus' : 'trash', 18)),
      h('button', { class: 'icon-btn small', 'aria-label': 'Mehr', onclick: () => setN(x.n + 1) }, icon('plus', 18)));
  }))));

  for (const g of list.groups) {
    el.append(card(g.label, {}, h('div', { class: 'list' }, g.items.map((i) => {
      const cb = h('input', { type: 'checkbox', checked: !!cart.checked?.[i.id] });
      const row = h('label', { class: 'shop-item' + (cb.checked ? ' done' : '') },
        cb, h('span', { class: 'shop-emoji' }, i.emoji),
        h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, i.name), h('span', { class: 'list-sub' }, i.recipes.slice(0, 2).join(', ') + (i.recipes.length > 2 ? ` +${i.recipes.length - 2}` : ''))),
        h('span', { class: 'shop-amt' }, i.amount));
      cb.addEventListener('change', async () => {
        row.classList.toggle('done', cb.checked);
        cart.checked = { ...(cart.checked || {}), [i.id]: cb.checked };
        if (!cb.checked) delete cart.checked[i.id];
        await saveCart(cart);
      });
      return row;
    }))));
  }
  if (list.pantry.length || list.spices.length) {
    el.append(card('Vorrat prüfen', { iconName: 'info' },
      list.pantry.length ? h('p', { class: 'small' }, list.pantry.map((i) => `${i.emoji} ${i.name}`).join(' · ')) : null,
      list.spices.length ? h('p', { class: 'small muted' }, h('strong', null, 'Gewürze: '), list.spices.join(', ')) : null));
  }
}

async function render(el, ctx) {
  shownCtx = ctx;
  if (ctx.query.v === 'einkauf') return renderShopping(el, ctx);
  return renderRecipes(el, ctx);
}

registerModule({
  id: 'kochen',
  area: 'fitness',
  title: 'Kochen',
  description: 'Vegane Rezepte, gegessen & bewertet, Einkaufsliste',
  order: 30,
  nav: { tab: 3, label: 'Kochen', icon: 'food' },
  routes: [{ path: '/kochen', render }, { path: '/ernaehrung', render }],
});
