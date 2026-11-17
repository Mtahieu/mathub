// Ernährung & Schlaf: Kalorien/Protein (Mahlzeiten + Favoriten), Schlaf.
// (Wassertracking wurde in 0.3.0 entfernt; alte 'water'-Einträge bleiben in der DB, werden aber nicht mehr genutzt.)
//
// entries type 'food'  (1 pro Tag): data {items:[{id, name, kcal, protein, t}]}
// entries type 'sleep' (1 pro Tag): data {hours, quality 1–5}   – gilt für die Nacht VOR diesem Tag
// items   kind 'food-fav': {name, kcal, protein}

import { registerModule, loadDays } from '../../core/registry.js';
import { entries, items, uid } from '../../core/db.js';
import {
  h, icon, card, dateNav, pageHeader, openSheet, toast, field, numInput, intInput, readNum, textInput, checkbox,
  metric, fmt, fmtInt, withUnit,
} from '../../core/ui.js';
import { bucketize, barChart, lineChart } from '../../core/charts.js';

// ---------- Daten ----------
export const sumFood = (e) => (e?.data.items || []).reduce(
  (a, i) => ({ kcal: a.kcal + (i.kcal || 0), protein: a.protein + (i.protein || 0) }), { kcal: 0, protein: 0 });

async function addFood(date, item) {
  const e = await entries.daily('food', date);
  await entries.saveDaily('food', date, { items: [...(e?.data.items || []), { id: uid(), t: Date.now(), ...item }] });
}

async function removeFood(date, id) {
  const e = await entries.daily('food', date);
  if (!e) return;
  const rest = e.data.items.filter((i) => i.id !== id);
  if (rest.length) await entries.saveDaily('food', date, { items: rest });
  else await entries.delete(e.id);
}

const kcalOk = (kcal, target, tol) => target && kcal >= target * (1 - tol / 100) && kcal <= target * (1 + tol / 100);

// ---------- Sheets ----------
async function openFoodSheet(date, after) {
  const favs = (await items.all('food-fav')).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const name = textInput({ placeholder: 'z. B. Frühstück, Shake (optional)', maxlength: 60 });
  const kcal = intInput({ placeholder: '0' });
  const protein = numInput({ placeholder: '0' });
  const fav = checkbox('Als Favorit speichern');

  const favBox = h('div', { class: 'list' });
  const renderFavs = (list) => favBox.replaceChildren(...list.map((f) => h('div', { class: 'list-item static' },
    h('button', {
      class: 'list-main plain',
      onclick: async () => { await addFood(date, { name: f.name, kcal: f.kcal, protein: f.protein }); sheet.close(); toast(`${f.name} hinzugefügt`); after(); },
    }, h('span', { class: 'list-title' }, f.name), h('span', { class: 'list-sub' }, `${fmtInt(f.kcal)} kcal · ${fmt(f.protein)} g Protein`)),
    h('button', {
      class: 'icon-btn small', 'aria-label': `Favorit ${f.name} löschen`,
      onclick: async () => { await items.delete(f.id); list = list.filter((x) => x.id !== f.id); renderFavs(list); },
    }, icon('trash', 18)))));
  renderFavs(favs);

  const sheet = openSheet({
    title: 'Mahlzeit hinzufügen',
    body: [
      favs.length ? field('Favoriten – antippen zum Hinzufügen', favBox) : null,
      field('Name', name),
      h('div', { class: 'grid-2' }, field('Kalorien', withUnit(kcal, 'kcal')), field('Protein', withUnit(protein, 'g'))),
      fav,
    ],
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const item = { name: name.value.trim(), kcal: readNum(kcal) || 0, protein: readNum(protein) || 0 };
          if (!item.kcal && !item.protein) { toast('Bitte Kalorien oder Protein eingeben'); return; }
          await addFood(date, item);
          if (fav.input.checked) await items.put({ kind: 'food-fav', ...item, name: item.name || `${item.kcal} kcal` });
          sheet.close();
          toast('Hinzugefügt');
          after();
        },
      }, 'Hinzufügen'),
    ],
  });
}

function openSleepSheet(date, existing, after) {
  const hours = numInput({ value: existing?.data.hours ?? null, placeholder: 'z. B. 7,5' });
  let quality = existing?.data.quality ?? null;
  const stars = h('div', { class: 'stars' });
  const renderStars = () => stars.replaceChildren(...[1, 2, 3, 4, 5].map((n) => h('button', {
    type: 'button', class: 'star' + (quality && n <= quality ? ' on' : ''), 'aria-label': `${n} von 5`,
    onclick: () => { quality = quality === n ? null : n; renderStars(); },
  }, icon('star', 30))));
  renderStars();
  const sheet = openSheet({
    title: 'Schlaf (letzte Nacht)',
    body: [field('Stunden', withUnit(hours, 'h')), field('Qualität', stars)],
    footer: [
      existing
        ? h('button', { class: 'btn btn-danger', onclick: async () => { await entries.delete(existing.id); sheet.close(); after(); } }, 'Löschen')
        : h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const hrs = readNum(hours);
          if (hrs == null || hrs < 0 || hrs > 24) { toast('Bitte Stunden zwischen 0 und 24 eingeben'); return; }
          await entries.saveDaily('sleep', date, { hours: hrs, quality });
          sheet.close();
          toast('Gespeichert');
          after();
        },
      }, 'Speichern'),
    ],
  });
}

// ---------- Bausteine ----------
function foodMetrics(f, t) {
  return [
    metric('Kalorien', t.kcal ? `${fmtInt(f.kcal)} / ${fmtInt(t.kcal)} kcal` : `${fmtInt(f.kcal)} kcal`, f.kcal, t.kcal,
      { over: t.kcal && f.kcal > t.kcal * (1 + getTol() / 100) }),
    metric('Protein', t.protein ? `${fmt(f.protein)} / ${fmt(t.protein)} g` : `${fmt(f.protein)} g`, f.protein, t.protein),
  ];
}
let tolCache = 10;
const getTol = () => tolCache;

function sleepRow(date, sl, after) {
  return h('button', { class: 'list-item', onclick: () => openSleepSheet(date, sl, after) },
    icon('moon', 20),
    h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, sl ? `${fmt(sl.data.hours, 2)} h Schlaf` : 'Schlaf eintragen'),
      h('span', { class: 'list-sub' }, sl ? (sl.data.quality ? '★'.repeat(sl.data.quality) + '☆'.repeat(5 - sl.data.quality) : 'Qualität nicht bewertet') : 'Letzte Nacht')),
    icon(sl ? 'edit' : 'plus', 18));
}

// ---------- Seite ----------
async function render(el, ctx) {
  const date = ctx.date;
  const data = await loadDays(date, date);
  const t = data.settings.targets;
  tolCache = data.settings.prefs.kcalTolerance;
  const after = () => ctx.refresh();
  const foodEntry = data.first(date, 'food');
  const f = sumFood(foodEntry);

  el.append(pageHeader('Ernährung & Schlaf'));
  el.append(dateNav(ctx));

  if (!t.kcal || !t.protein) {
    el.append(h('a', { class: 'banner', href: '#/einstellungen?s=ziele' }, icon('info'),
      h('div', { style: { flex: 1 } }, h('strong', null, 'Ziele festlegen'), h('div', { class: 'small muted' }, 'Lege Kalorien- und Proteinziel fest, um Fortschritt zu sehen.')),
      icon('chevR', 18)));
  }

  el.append(card('Kalorien & Protein', {
    iconName: 'food',
    actions: h('button', { class: 'btn btn-primary small', onclick: () => openFoodSheet(date, after) }, icon('plus', 16), 'Mahlzeit'),
  },
  foodMetrics(f, t),
  foodEntry?.data.items?.length
    ? h('div', { class: 'list' }, foodEntry.data.items.map((i) => h('div', { class: 'list-item static' },
      h('span', { class: 'list-main' },
        h('span', { class: 'list-title' }, i.name || 'Mahlzeit'),
        h('span', { class: 'list-sub' }, `${fmtInt(i.kcal)} kcal · ${fmt(i.protein)} g Protein`)),
      h('button', { class: 'icon-btn small', 'aria-label': 'Entfernen', onclick: async () => { await removeFood(date, i.id); after(); } }, icon('trash', 18)))))
    : h('p', { class: 'muted small' }, 'Noch nichts eingetragen.')));

  el.append(card('Schlaf', { iconName: 'moon' }, h('div', { class: 'list' }, sleepRow(date, data.first(date, 'sleep'), after))));
}

function todayCard(date, data, ctx) {
  const t = data.settings.targets;
  tolCache = data.settings.prefs.kcalTolerance;
  const after = () => ctx.refresh();
  const f = sumFood(data.first(date, 'food'));
  return [
    card('Ernährung', {
      iconName: 'food',
      actions: h('button', { class: 'btn btn-primary small', onclick: () => openFoodSheet(date, after) }, icon('plus', 16), 'Mahlzeit'),
    }, foodMetrics(f, t)),
    card('Schlaf', { iconName: 'moon' },
      h('div', { class: 'list' }, sleepRow(date, data.first(date, 'sleep'), after))),
  ];
}

function goals(date, data) {
  const t = data.settings.targets;
  const tol = data.settings.prefs.kcalTolerance ?? 10;
  const out = [];
  const f = sumFood(data.first(date, 'food'));
  if (t.kcal) out.push({ id: 'kcal', label: 'Kalorien', detail: `${fmtInt(f.kcal)} / ${fmtInt(t.kcal)} kcal (± ${tol} %)`, done: !!kcalOk(f.kcal, t.kcal, tol), progress: Math.min(f.kcal / t.kcal, 1), route: '/ernaehrung' });
  if (t.protein) out.push({ id: 'protein', label: 'Protein', detail: `${fmt(f.protein)} / ${fmt(t.protein)} g`, done: f.protein >= t.protein, progress: Math.min(f.protein / t.protein, 1), route: '/ernaehrung' });
  if (t.sleepH) {
    const sl = data.first(date, 'sleep');
    out.push({ id: 'sleep', label: 'Schlaf', detail: sl ? `${fmt(sl.data.hours, 2)} / ${fmt(t.sleepH)} h` : 'nicht eingetragen', done: !!sl && sl.data.hours >= t.sleepH, progress: sl ? Math.min(sl.data.hours / t.sleepH, 1) : 0, route: '/ernaehrung' });
  }
  return out;
}

function summarizeDay(date, data) {
  const out = [];
  const fe = data.first(date, 'food');
  if (fe) { const f = sumFood(fe); out.push(`${fmtInt(f.kcal)} kcal · ${fmt(f.protein)} g Protein`); }
  const sl = data.first(date, 'sleep');
  if (sl) out.push(`${fmt(sl.data.hours, 2)} h Schlaf`);
  return out;
}

const charts = [
  {
    id: 'kcal', title: 'Kalorien',
    render(el, { from, to, data }) {
      const { points } = bucketize(from, to, (k) => { const e = data.first(k, 'food'); return e ? sumFood(e).kcal : null; });
      const t = data.settings.targets.kcal; const tol = data.settings.prefs.kcalTolerance;
      el.append(barChart(points, { target: t, hit: (v) => !!kcalOk(v, t, tol), label: 'Kalorien' }));
    },
  },
  {
    id: 'protein', title: 'Protein (g)',
    render(el, { from, to, data }) {
      const { points } = bucketize(from, to, (k) => { const e = data.first(k, 'food'); return e ? sumFood(e).protein : null; });
      el.append(barChart(points, { target: data.settings.targets.protein, label: 'Protein' }));
    },
  },
  {
    id: 'sleep', title: 'Schlaf (h)',
    render(el, { from, to, data }) {
      const pts = [];
      for (const [k, d] of data.byDay) if (d.sleep?.[0]) pts.push({ key: k, value: d.sleep[0].data.hours });
      el.append(lineChart(pts, { from, to, target: data.settings.targets.sleepH, color: 'var(--c-mobil)', avgDays: 7, label: 'Schlaf' }));
    },
  },
];

registerModule({
  id: 'nutrition',
  area: 'fitness',
  title: 'Ernährung & Schlaf',
  description: 'Kalorien, Protein & Schlaf',
  order: 30,
  nav: { tab: 3, label: 'Ernährung', icon: 'food' },
  routes: [{ path: '/ernaehrung', render }],
  todayCard, goals, summarizeDay, charts,
});

