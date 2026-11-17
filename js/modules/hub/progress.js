// Fortschritt: Serien, Heatmap, Zielquoten, Meilensteine und die Diagramme aller Module (charts).

import { registerModule, getModules } from '../../core/registry.js';
import { h, icon, card, pageHeader, segmented, fmt } from '../../core/ui.js';
import { today, addDays, startOfWeek, dayRange, WEEKDAYS_SHORT } from '../../core/dates.js';
import { computeStreaks, isSuccess } from '../../core/streaks.js';

const RANGES = [
  { value: '30', label: '30 T' },
  { value: '90', label: '90 T' },
  { value: '365', label: '1 J' },
  { value: 'all', label: 'Alles' },
];
const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

function level(r, thr) {
  if (r == null || r.ratio == null) return 0;
  if (isSuccess(r, thr)) return 3;
  if (r.ratio >= 0.5) return 2;
  if (r.ratio > 0) return 1;
  return 0;
}

function heatmap(st) {
  const t = today();
  const end = addDays(startOfWeek(t), 6);
  const start = addDays(startOfWeek(t), -7 * 15);
  const byDate = new Map(st.days.map((d) => [d.date, d]));
  return h('div', { class: 'heat-wrap' },
    h('div', { class: 'heat-labels' }, WEEKDAYS_SHORT.map((d, i) => h('span', null, i % 2 === 0 ? d : ''))),
    h('div', { class: 'heat' }, dayRange(start, end).map((k) => {
      const r = byDate.get(k);
      return h('div', {
        class: `heat-cell lvl-${level(r, st.threshold)}${k > t ? ' future' : ''}${k === t ? ' today' : ''}`,
        title: r?.total ? `${k}: ${r.done}/${r.total}` : k,
      });
    })));
}

async function render(el, ctx) {
  const r = ctx.query.r || '90';
  const st = await computeStreaks();
  const t = today();
  const from = r === 'all' ? st.from : addDays(t, -(Number(r) - 1));

  el.append(pageHeader('Fortschritt'));

  const last30 = st.days.filter((d) => d.date > addDays(t, -30) && d.ratio != null && d.date !== t);
  const rate = last30.length ? last30.filter((d) => isSuccess(d, st.threshold)).length / last30.length : null;
  el.append(h('div', { class: 'stat-grid' },
    h('div', { class: 'stat accent' }, h('span', { class: 'stat-val' }, icon('flame', 20), ' ', st.current), h('span', { class: 'stat-label' }, 'aktuelle Serie')),
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, st.best), h('span', { class: 'stat-label' }, 'beste Serie')),
    h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, rate == null ? '–' : `${Math.round(rate * 100)} %`), h('span', { class: 'stat-label' }, 'Tage geschafft (30 T)'))));

  el.append(card('Letzte 16 Wochen', { iconName: 'calendar', actions: h('a', { class: 'link', href: '#/kalender' }, 'Kalender') },
    heatmap(st),
    h('div', { class: 'legend small muted' },
      h('span', null, h('i', { class: 'heat-cell lvl-0' }), 'nichts'),
      h('span', null, h('i', { class: 'heat-cell lvl-1' }), 'begonnen'),
      h('span', null, h('i', { class: 'heat-cell lvl-2' }), '≥ 50 %'),
      h('span', null, h('i', { class: 'heat-cell lvl-3' }), `≥ ${Math.round(st.threshold * 100)} %`))));

  // Zielquoten letzte 30 Tage
  const rates = new Map();
  for (const d of last30) for (const g of d.goals) {
    const x = rates.get(g.id) || { label: g.label, done: 0, total: 0 };
    x.total++; if (g.done) x.done++;
    rates.set(g.id, x);
  }
  if (rates.size) {
    el.append(card('Ziele erreicht (letzte 30 Tage)', { iconName: 'check' },
      [...rates.values()].map((x) => h('div', { class: 'metric' },
        h('div', { class: 'metric-top' }, h('span', null, x.label), h('span', { class: 'num muted' }, `${x.done}/${x.total}`)),
        h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: (x.done / x.total) * 100 + '%' } }))))));
  }

  el.append(card('Meilensteine', { iconName: 'trophy' },
    h('div', { class: 'badges' }, MILESTONES.map((n) => h('div', { class: 'badge' + (st.best >= n ? ' on' : '') },
      h('strong', null, n), h('span', null, n === 1 ? 'Tag' : 'Tage')))),
    h('p', { class: 'muted small' }, `Serien zählen Tage mit mindestens ${Math.round(st.threshold * 100)} % erfüllten Zielen.`)));

  // Diagramme
  el.append(segmented(RANGES, r, (v) => ctx.navigate('/fortschritt', { r: v === '90' ? undefined : v }, { replace: true })));
  const chartCtx = { from, to: t, data: st.data };
  for (const m of getModules()) {
    for (const c of m.charts || []) {
      const box = h('div', { class: 'chart-box' });
      try { await c.render(box, chartCtx); } catch (err) { console.error(err); box.append(h('p', { class: 'muted small' }, 'Diagramm konnte nicht geladen werden.')); }
      el.append(card(c.title, {}, box));
    }
  }
  if (rate != null) el.append(h('p', { class: 'muted small center' }, `Ø ${fmt(rate * 100, 0)} % Erfolgsquote in den letzten 30 Tagen`));
}

registerModule({
  id: 'progress',
  area: 'hub',
  title: 'Fortschritt',
  order: 50,
  nav: { tab: 4, label: 'Fortschritt', icon: 'chart' },
  routes: [{ path: '/fortschritt', render }],
});
