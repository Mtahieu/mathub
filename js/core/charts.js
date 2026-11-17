// Leichte SVG-Diagramme ohne externe Bibliothek (funktionieren offline).

import { h, s } from './ui.js';
import { fromKey, formatDate, dayRange, startOfWeek } from './dates.js';

const W = 340, H = 170, PL = 34, PR = 10, PT = 14, PB = 22;

function niceScale(lo, hi, count = 4) {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { min, max: max === min ? min + step : max, ticks };
}

const fmtTick = (v) => (Math.abs(v) >= 10000
  ? (v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k'
  : v.toLocaleString('de-DE', { maximumFractionDigits: 1 }));

function frame(children, ariaLabel) {
  return h('div', { class: 'chart' },
    s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': ariaLabel || 'Diagramm' }, children));
}

export function emptyChart(text = 'Noch keine Daten in diesem Zeitraum') {
  return h('div', { class: 'chart-empty' }, text);
}

function yAxis(g, scale, Y) {
  for (const t of scale.ticks) {
    g.push(s('line', { x1: PL, x2: W - PR, y1: Y(t), y2: Y(t), class: 'grid' }));
    g.push(s('text', { x: PL - 6, y: Y(t) + 3.5, class: 'tick', 'text-anchor': 'end' }, fmtTick(t)));
  }
}

function targetLine(g, target, Y) {
  if (target == null) return;
  g.push(s('line', { x1: PL, x2: W - PR, y1: Y(target), y2: Y(target), class: 'target' }));
  g.push(s('text', { x: W - PR, y: Y(target) - 4, class: 'target-label', 'text-anchor': 'end' }, 'Ziel'));
}

/** Gleitender Durchschnitt über Kalendertage. */
export function movingAvg(points, days) {
  return points.map((p, i) => {
    const start = fromKey(p.key).getTime() - (days - 1) * 86400000;
    let sum = 0, n = 0;
    for (let j = i; j >= 0 && fromKey(points[j].key).getTime() >= start; j--) { sum += points[j].value; n++; }
    return { key: p.key, value: sum / n };
  });
}

/**
 * Liniendiagramm. points: [{key:'YYYY-MM-DD', value}]
 * opts: {from, to, target, avgDays, color, label}
 */
export function lineChart(points, { from, to, target = null, avgDays = 0, color = 'var(--accent)', label } = {}) {
  const pts = points
    .filter((p) => p.value != null && Number.isFinite(p.value) && (!from || p.key >= from) && (!to || p.key <= to))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  if (!pts.length) return emptyChart();
  const k0 = from && from < pts[0].key ? from : pts[0].key;
  const k1 = to || pts.at(-1).key;
  const x0 = fromKey(k0).getTime();
  let x1 = fromKey(k1).getTime();
  if (x1 <= x0) x1 = x0 + 86400000;
  const vals = pts.map((p) => p.value);
  if (target != null) vals.push(target);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || Math.max(Math.abs(hi) * 0.05, 1);
  const scale = niceScale(lo - pad, hi + pad);
  const X = (k) => PL + ((fromKey(k).getTime() - x0) / (x1 - x0)) * (W - PL - PR);
  const Y = (v) => PT + (1 - (v - scale.min) / (scale.max - scale.min)) * (H - PT - PB);
  const g = [];
  yAxis(g, scale, Y);
  g.push(s('text', { x: PL, y: H - 5, class: 'tick', 'text-anchor': 'start' }, formatDate(k0, 'short')));
  g.push(s('text', { x: W - PR, y: H - 5, class: 'tick', 'text-anchor': 'end' }, formatDate(k1, 'short')));
  targetLine(g, target, Y);
  const poly = (arr) => arr.map((p) => `${X(p.key).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  if (avgDays > 1 && pts.length > 2) {
    g.push(s('polyline', { points: poly(pts), class: 'line faint', style: { stroke: color } }));
    g.push(s('polyline', { points: poly(movingAvg(pts, avgDays)), class: 'line', style: { stroke: color } }));
  } else {
    g.push(s('polyline', { points: poly(pts), class: 'line', style: { stroke: color } }));
  }
  if (pts.length <= 45) for (const p of pts) g.push(s('circle', { cx: X(p.key), cy: Y(p.value), r: 2.4, class: 'dot', style: { fill: color } }));
  const last = pts.at(-1);
  g.push(s('circle', { cx: X(last.key), cy: Y(last.value), r: 4.5, class: 'dot last', style: { fill: color } }));
  return frame(g, label);
}

/**
 * Fasst Tageswerte zusammen: bis 62 Tage täglich, darüber wöchentlich (Mittelwert der Tage mit Wert).
 * getValue(dayKey) -> number|null
 */
export function bucketize(from, to, getValue) {
  const days = dayRange(from, to);
  if (days.length <= 62) return { unit: 'day', points: days.map((k) => ({ key: k, value: getValue(k) })) };
  const weeks = new Map();
  for (const k of days) {
    const w = startOfWeek(k);
    const v = getValue(k);
    if (!weeks.has(w)) weeks.set(w, []);
    if (v != null) weeks.get(w).push(v);
  }
  return {
    unit: 'week',
    points: [...weeks].map(([key, arr]) => ({ key, value: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null })),
  };
}

/** Balkendiagramm. points: [{key, value}] (bereits gruppiert). Balken ≥ Ziel werden hervorgehoben. */
export function barChart(points, { target = null, hit = (v, t) => t != null && v >= t, label } = {}) {
  const n = points.length;
  if (!n || points.every((p) => p.value == null)) return emptyChart();
  const vals = points.map((p) => p.value || 0);
  const hi = Math.max(...vals, target || 0) * 1.1 || 1;
  const scale = niceScale(0, hi);
  const Y = (v) => PT + (1 - (v - scale.min) / (scale.max - scale.min)) * (H - PT - PB);
  const slot = (W - PL - PR) / n;
  const bw = Math.max(1.5, Math.min(18, slot * 0.68));
  const g = [];
  yAxis(g, scale, Y);
  points.forEach((p, i) => {
    if (p.value == null || p.value <= 0) return;
    const x = PL + slot * i + (slot - bw) / 2;
    g.push(s('rect', {
      x, y: Y(p.value), width: bw, height: Math.max(0.5, Y(0) - Y(p.value)), rx: Math.min(4, bw / 2),
      class: 'cbar' + (hit(p.value, target) ? ' hit' : ''),
    }));
  });
  targetLine(g, target, Y);
  g.push(s('text', { x: PL, y: H - 5, class: 'tick', 'text-anchor': 'start' }, formatDate(points[0].key, 'short')));
  g.push(s('text', { x: W - PR, y: H - 5, class: 'tick', 'text-anchor': 'end' }, formatDate(points.at(-1).key, 'short')));
  return frame(g, label);
}
