// Schlaf: Stunden und Qualität der letzten Nacht.
// entries type 'sleep' (1 pro Tag): data {hours, quality 1–5} – gilt für die Nacht VOR diesem Tag.
// (Bis 0.4 Teil von nutrition.js; Datenformat unverändert. Wird auch vom Job-Bereich ausgewertet.)

import { registerModule } from '../../core/registry.js';
import { entries } from '../../core/db.js';
import { h, icon, card, dateNav, pageHeader, openSheet, toast, field, numInput, readNum, fmt, withUnit } from '../../core/ui.js';
import { today, formatDate } from '../../core/dates.js';
import { lineChart } from '../../core/charts.js';

function openSleepSheet(date, existing, after) {
  const hours = numInput({ value: existing?.data.hours ?? null, placeholder: 'z. B. 7,5' });
  let quality = existing?.data.quality ?? null;
  const stars = h('div', { class: 'stars' });
  const renderStars = () => stars.replaceChildren(...[1, 2, 3, 4, 5].map((n) => h('button', {
    type: 'button', class: 'star' + (quality && n <= quality ? ' on' : ''), 'aria-label': `${n} von 5`,
    onclick: () => { quality = quality === n ? null : n; renderStars(); },
  }, icon('star', 30))));
  renderStars();
  const quick = h('div', { class: 'chips' }, [6, 6.5, 7, 7.5, 8, 8.5].map((v) => h('button', {
    type: 'button', class: 'chip', onclick: () => { hours.value = String(v).replace('.', ','); },
  }, `${String(v).replace('.', ',')} h`)));
  const sheet = openSheet({
    title: 'Schlaf (letzte Nacht)',
    body: [field('Stunden', withUnit(hours, 'h')), quick, field('Qualität', stars)],
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

function sleepRow(date, sl, after) {
  return h('button', { class: 'list-item', onclick: () => openSleepSheet(date, sl, after) },
    icon('moon', 20),
    h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, sl ? `${fmt(sl.data.hours, 2)} h Schlaf` : 'Schlaf eintragen'),
      h('span', { class: 'list-sub' }, sl ? (sl.data.quality ? '★'.repeat(sl.data.quality) + '☆'.repeat(5 - sl.data.quality) : 'Qualität nicht bewertet') : 'Letzte Nacht')),
    icon(sl ? 'edit' : 'plus', 18));
}

async function render(el, ctx) {
  const date = ctx.date;
  const after = () => ctx.refresh();
  el.append(pageHeader('Schlaf'));
  el.append(dateNav(ctx));
  el.append(card(null, {}, h('div', { class: 'list' }, sleepRow(date, await entries.daily('sleep', date), after))));
  const all = (await entries.byType('sleep')).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (all.length) {
    const last14 = all.slice(0, 14);
    const avg = last14.reduce((a, e) => a + e.data.hours, 0) / last14.length;
    el.append(card('Letzte Nächte', { iconName: 'moon' },
      h('p', { class: 'small muted' }, `Ø ${fmt(avg, 1)} h in den letzten ${last14.length} Einträgen`),
      h('div', { class: 'list' }, last14.map((e) => h('button', {
        class: 'list-item', onclick: () => ctx.navigate('/schlaf', { d: e.date === today() ? undefined : e.date }, { replace: true }),
      }, h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, formatDate(e.date)),
        h('span', { class: 'list-sub' }, `${fmt(e.data.hours, 2)} h${e.data.quality ? ' · ' + '★'.repeat(e.data.quality) : ''}`)), icon('chevR', 18))))));
  }
}

function todayCard(date, data, ctx) {
  return card('Schlaf', { iconName: 'moon' }, h('div', { class: 'list' }, sleepRow(date, data.first(date, 'sleep'), () => ctx.refresh())));
}

function goals(date, data) {
  const t = data.settings.targets.sleepH;
  if (!t) return [];
  const sl = data.first(date, 'sleep');
  return [{
    id: 'sleep', label: 'Schlaf', detail: sl ? `${fmt(sl.data.hours, 2)} / ${fmt(t)} h` : 'nicht eingetragen',
    done: !!sl && sl.data.hours >= t, progress: sl ? Math.min(sl.data.hours / t, 1) : 0, route: '/schlaf',
  }];
}

function summarizeDay(date, data) {
  const sl = data.first(date, 'sleep');
  return sl ? [`${fmt(sl.data.hours, 2)} h Schlaf`] : [];
}

const charts = [{
  id: 'sleep', title: 'Schlaf (h)',
  render(el, { from, to, data }) {
    const pts = [];
    for (const [k, d] of data.byDay) if (d.sleep?.[0]) pts.push({ key: k, value: d.sleep[0].data.hours });
    el.append(lineChart(pts, { from, to, target: data.settings.targets.sleepH, color: 'var(--c-mobil)', avgDays: 7, label: 'Schlaf' }));
  },
}];

registerModule({
  id: 'sleep',
  area: 'fitness',
  title: 'Schlaf',
  description: 'Stunden & Qualität',
  order: 35,
  nav: { more: 2, icon: 'moon' },
  routes: [{ path: '/schlaf', render }],
  todayCard, goals, summarizeDay, charts,
});
