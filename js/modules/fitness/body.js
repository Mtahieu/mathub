// Körperwerte: Gewicht, Körperfett, Umfänge.
// entries type 'body' (1 pro Tag): data {weight, bodyFat, measures:{chest, waist, …}, note}

import { registerModule, loadDays } from '../../core/registry.js';
import { entries } from '../../core/db.js';
import {
  h, icon, card, dateNav, pageHeader, toast, field, numInput, readNum, textarea, withUnit, fmt, select, confirmDialog,
} from '../../core/ui.js';
import { today, addDays, fromKey, formatDate } from '../../core/dates.js';
import { lineChart, movingAvg, emptyChart } from '../../core/charts.js';

export const MEASURES = {
  chest: 'Brust', shoulders: 'Schultern', waist: 'Taille', hips: 'Hüfte', arm: 'Oberarm',
  forearm: 'Unterarm', thigh: 'Oberschenkel', calf: 'Wade', neck: 'Hals',
};

async function weightSeries() {
  return (await entries.byType('body'))
    .filter((e) => e.data.weight != null)
    .map((e) => ({ key: e.date, value: e.data.weight }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

/** Steigung (kg/Woche) per linearer Regression über die letzten `days` Tage. */
function weeklyRate(series, days = 28) {
  if (series.length < 4) return null;
  const end = series.at(-1).key;
  const start = addDays(end, -days);
  const pts = series.filter((p) => p.key >= start);
  if (pts.length < 4) return null;
  const xs = pts.map((p) => (fromKey(p.key) - fromKey(start)) / 86400000);
  const ys = pts.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? (num / den) * 7 : null;
}

function statsCard(series, goal) {
  if (!series.length) return null;
  const avg = movingAvg(series, 7).at(-1).value;
  const rate = weeklyRate(series);
  const sign = (n) => (n > 0 ? '+' : '') + fmt(n, 2);
  return h('div', { class: 'stat-grid' },
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, fmt(avg, 1)), h('span', { class: 'stat-label' }, 'kg · Ø 7 Tage')),
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, rate == null ? '–' : sign(rate)), h('span', { class: 'stat-label' }, 'kg pro Woche')),
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, goal ? sign(goal - avg) : '–'), h('span', { class: 'stat-label' }, goal ? `kg bis ${fmt(goal)} kg` : 'kein Zielgewicht')));
}

async function render(el, ctx) {
  const date = ctx.date;
  const s = (await loadDays(date, date)).settings;
  const existing = await entries.daily('body', date);
  const d = existing?.data || {};
  const series = await weightSeries();
  const fields = s.prefs.measureFields.filter((k) => MEASURES[k]);

  el.append(pageHeader('Körperwerte'));
  el.append(dateNav(ctx));

  const weight = numInput({ value: d.weight, placeholder: series.at(-1) ? fmt(series.at(-1).value) : 'kg' });
  const fat = numInput({ value: d.bodyFat, placeholder: '%' });
  const mInputs = Object.fromEntries(fields.map((k) => [k, numInput({ value: d.measures?.[k], placeholder: 'cm' })]));
  const note = textarea({ value: d.note, placeholder: 'Notiz (optional)', rows: 2 });

  el.append(card('Eintrag', { iconName: 'scale' },
    h('div', { class: 'grid-2' }, field('Gewicht', withUnit(weight, 'kg')), field('Körperfett', withUnit(fat, '%'))),
    fields.length ? h('details', { class: 'measures', open: !!d.measures && Object.keys(d.measures).length > 0 },
      h('summary', null, 'Umfänge (cm)'),
      h('div', { class: 'grid-2' }, fields.map((k) => field(MEASURES[k], withUnit(mInputs[k], 'cm'))))) : null,
    field('Notiz', note),
    h('div', { class: 'btn-row' },
      existing ? h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (!await confirmDialog('Eintrag dieses Tages löschen?', { okLabel: 'Löschen', danger: true })) return;
          await entries.delete(existing.id); ctx.refresh();
        },
      }, 'Löschen') : null,
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const measures = {};
          for (const k of fields) { const v = readNum(mInputs[k]); if (v != null) measures[k] = v; }
          const data = { ...d, weight: readNum(weight), bodyFat: readNum(fat), measures: { ...(d.measures || {}), ...measures }, note: note.value.trim() };
          for (const k of fields) if (readNum(mInputs[k]) == null) delete data.measures[k];
          if (data.weight == null && data.bodyFat == null && !Object.keys(data.measures).length && !data.note) { toast('Bitte mindestens einen Wert eingeben'); return; }
          await entries.saveDaily('body', date, data);
          toast('Gespeichert');
          ctx.refresh();
        },
      }, 'Speichern'))));

  const stats = statsCard(series, s.targets.weightGoal);
  if (stats) el.append(card('Überblick', { iconName: 'chart' }, stats));

  const recent = (await entries.byType('body')).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  if (recent.length) {
    el.append(card('Letzte Einträge', { iconName: 'list' }, h('div', { class: 'list' }, recent.map((e) => h('button', {
      class: 'list-item', onclick: () => ctx.navigate('/koerper', { d: e.date === today() ? undefined : e.date }, { replace: true }),
    }, h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, formatDate(e.date)),
      h('span', { class: 'list-sub' }, [
        e.data.weight != null ? `${fmt(e.data.weight)} kg` : null,
        e.data.bodyFat != null ? `${fmt(e.data.bodyFat)} % KFA` : null,
        e.data.measures && Object.keys(e.data.measures).length ? `${Object.keys(e.data.measures).length} Umfänge` : null,
      ].filter(Boolean).join(' · '))), icon('chevR', 18))))));
  }
  el.append(h('a', { class: 'btn block', href: '#/fortschritt' }, icon('chart', 18), 'Verlauf im Fortschritt ansehen'));
}

async function todayCard(date, data, ctx) {
  const e = data.first(date, 'body');
  const w = e?.data.weight;
  if (w != null) {
    return card('Gewicht', { iconName: 'scale', actions: h('a', { class: 'link', href: `#/koerper${date !== today() ? '?d=' + date : ''}` }, 'Details') },
      h('div', { class: 'big-num' }, `${fmt(w)} kg`));
  }
  const series = await weightSeries();
  const input = numInput({ placeholder: series.at(-1) ? fmt(series.at(-1).value) : 'kg' });
  const save = async () => {
    const v = readNum(input);
    if (v == null || v < 20 || v > 400) { toast('Bitte ein gültiges Gewicht eingeben'); return; }
    await entries.saveDaily('body', date, { ...(e?.data || {}), weight: v });
    toast('Gewicht gespeichert');
    ctx.refresh();
  };
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
  const optional = !data.settings.prefs.weighDaily;
  return card(optional ? 'Gewicht (optional)' : 'Gewicht', { iconName: 'scale', cls: optional ? 'quiet' : '', actions: h('a', { class: 'link', href: '#/koerper' }, 'Details') },
    h('div', { class: 'inline-form' }, withUnit(input, 'kg'), h('button', { class: optional ? 'btn' : 'btn btn-primary', onclick: save }, 'Speichern')));
}

function goals(date, data) {
  if (!data.settings.prefs.weighDaily) return [];
  const w = data.first(date, 'body')?.data.weight;
  return [{ id: 'weigh', label: 'Wiegen', detail: w != null ? `${fmt(w)} kg` : 'noch nicht gewogen', done: w != null, progress: w != null ? 1 : 0, route: '/koerper' }];
}

function summarizeDay(date, data) {
  const e = data.first(date, 'body');
  if (!e) return [];
  return [[e.data.weight != null ? `${fmt(e.data.weight)} kg` : null, e.data.bodyFat != null ? `${fmt(e.data.bodyFat)} % KFA` : null].filter(Boolean).join(' · ') || 'Körperwerte eingetragen'];
}

const series = (data, from, to, pick) => {
  const pts = [];
  for (const [k, d] of data.byDay) {
    if (k < from || k > to) continue;
    const v = d.body?.[0] ? pick(d.body[0].data) : null;
    if (v != null) pts.push({ key: k, value: v });
  }
  return pts;
};

const charts = [
  {
    id: 'weight', title: 'Gewicht (kg) · Linie = Ø 7 Tage',
    render(el, { from, to, data }) {
      el.append(lineChart(series(data, from, to, (d) => d.weight), { from, to, target: data.settings.targets.weightGoal, avgDays: 7, label: 'Gewicht' }));
    },
  },
  {
    id: 'bodyfat', title: 'Körperfett (%)',
    render(el, { from, to, data }) {
      const pts = series(data, from, to, (d) => d.bodyFat);
      el.append(pts.length ? lineChart(pts, { from, to, color: 'var(--warn)', label: 'Körperfett' }) : emptyChart('Noch kein Körperfett erfasst'));
    },
  },
  {
    id: 'measures', title: 'Umfänge (cm)',
    render(el, { from, to, data }) {
      const used = Object.keys(MEASURES).filter((k) => series(data, '0000-00-00', '9999-99-99', (d) => d.measures?.[k]).length);
      if (!used.length) { el.append(emptyChart('Noch keine Umfänge erfasst')); return; }
      const sel = select(used.map((k) => ({ value: k, label: MEASURES[k] })), used[0]);
      const box = h('div');
      const draw = () => box.replaceChildren(lineChart(series(data, from, to, (d) => d.measures?.[sel.value]), { from, to, color: 'var(--c-mobil)', label: MEASURES[sel.value] }));
      sel.addEventListener('change', draw);
      draw();
      el.append(sel, box);
    },
  },
];

registerModule({
  id: 'body',
  area: 'fitness',
  title: 'Körperwerte',
  description: 'Gewicht, Körperfett & Umfänge',
  order: 15,
  nav: { more: 1, icon: 'scale' },
  routes: [{ path: '/koerper', render }],
  todayCard, goals, summarizeDay, charts,
});

