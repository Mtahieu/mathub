// Kalender: Monatsansicht mit Zielerfüllung pro Tag und Tagesdetails.
// Termine aus dem Google Kalender erscheinen über summarizeDay des Moduls „termine“ in den Tagesdetails.

import { registerModule, loadDays, dayScore, summarizeDay } from '../../core/registry.js';
import { h, icon, card, pageHeader, openSheet } from '../../core/ui.js';
import {
  today, monthKey, monthStart, monthEnd, addMonths, dayRange, weekday, WEEKDAYS_SHORT, formatDate, fromKey,
} from '../../core/dates.js';
import { threshold, isSuccess } from '../../core/streaks.js';

function level(r, thr) {
  if (r.ratio == null) return 0;
  if (isSuccess(r, thr)) return 3;
  if (r.ratio >= 0.5) return 2;
  if (r.ratio > 0) return 1;
  return 0;
}

function openDay(date, data, ctx) {
  const sc = dayScore(date, data);
  const lines = summarizeDay(date, data);
  const sheet = openSheet({
    title: formatDate(date, 'long'),
    body: [
      sc.goals.length
        ? h('div', { class: 'list' }, sc.goals.map((g) => h('div', { class: 'list-item static' },
          h('span', { class: 'check' + (g.done ? ' done' : '') }, icon('check', 18)),
          h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, g.label), g.detail ? h('span', { class: 'list-sub' }, g.detail) : null))))
        : h('p', { class: 'muted' }, 'Keine Tagesziele für diesen Tag.'),
      lines.length ? h('div', { class: 'summary' }, lines.map((l) => h('div', { class: 'small' }, '• ', l.text))) : null,
    ],
    footer: date <= today() ? [
      h('button', { class: 'btn btn-primary', onclick: () => { sheet.close(); ctx.navigate('/heute', { d: date === today() ? undefined : date }); } }, 'Tag bearbeiten'),
    ] : null,
  });
}

async function render(el, ctx) {
  const t = today();
  const mk = /^\d{4}-\d{2}$/.test(ctx.query.m || '') ? ctx.query.m : monthKey(t);
  const from = monthStart(mk);
  const to = monthEnd(mk);
  const data = await loadDays(from, to);
  const thr = threshold();

  el.append(pageHeader('Monatsübersicht'));
  const go = (m) => ctx.navigate('/kalender', { m: m === monthKey(t) ? undefined : m }, { replace: true });

  const cells = [];
  for (let i = 0; i < weekday(from); i++) cells.push(h('div', { class: 'cal-day empty' }));
  for (const k of dayRange(from, to)) {
    const future = k > t;
    const lvl = future ? 0 : level(dayScore(k, data), thr);
    cells.push(h('button', {
      class: `cal-day lvl-${lvl}${k === t ? ' today' : ''}${future ? ' future' : ''}`,
      onclick: () => openDay(k, data, ctx),
      'aria-label': formatDate(k, 'long'),
    }, String(fromKey(k).getDate())));
  }

  el.append(card(null, {},
    h('div', { class: 'cal-nav' },
      h('button', { class: 'icon-btn', 'aria-label': 'Voriger Monat', onclick: () => go(addMonths(mk, -1)) }, icon('chevL')),
      h('strong', null, formatDate(from, 'month')),
      h('button', { class: 'icon-btn', 'aria-label': 'Nächster Monat', onclick: () => go(addMonths(mk, 1)) }, icon('chevR'))),
    h('div', { class: 'cal-grid' }, WEEKDAYS_SHORT.map((d) => h('div', { class: 'cal-head' }, d)), cells),
    mk !== monthKey(t) ? h('button', { class: 'link', onclick: () => go(monthKey(t)) }, 'Zum aktuellen Monat') : null));
  el.append(h('p', { class: 'muted small center' }, 'Tippe auf einen Tag für Details. Je kräftiger die Farbe, desto mehr Ziele erfüllt.'));
}

registerModule({
  id: 'calendar',
  area: 'hub',
  title: 'Monatsübersicht',
  description: 'Tagesziele & Termine pro Tag',
  order: 60,
  nav: { more: 2, icon: 'calendar' },
  routes: [{ path: '/kalender', render }],
});
