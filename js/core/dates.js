// Datums-Helfer. Alle Tage werden als lokaler Schlüssel "YYYY-MM-DD" gespeichert.

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

export const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
export const today = () => toKey(new Date());
export const keyFromTs = (ts) => toKey(new Date(ts));

export function addDays(k, n) {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

/** Wochentag 0 = Montag … 6 = Sonntag */
export const weekday = (k) => (fromKey(k).getDay() + 6) % 7;

export function dayRange(from, to) {
  const out = [];
  if (!from || !to || from > to) return out;
  const d = fromKey(from);
  let k = from;
  let guard = 0;
  while (k <= to && guard++ < 20000) {
    out.push(k);
    d.setDate(d.getDate() + 1);
    k = toKey(d);
  }
  return out;
}

export const startOfWeek = (k) => addDays(k, -weekday(k));
export const monthKey = (k) => k.slice(0, 7);
export const monthStart = (mk) => `${mk}-01`;

export function monthEnd(mk) {
  const [y, m] = mk.split('-').map(Number);
  return toKey(new Date(y, m, 0));
}

export function addMonths(mk, n) {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function formatDate(k, style = 'medium') {
  const d = fromKey(k);
  if (style === 'short') return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
  if (style === 'long') return `${WEEKDAYS_LONG[weekday(k)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (style === 'month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const mon = MONTHS[d.getMonth()];
  return `${WEEKDAYS_SHORT[weekday(k)]}, ${d.getDate()}. ${mon.length > 4 ? mon.slice(0, 3) + '.' : mon}`;
}

export function relDayLabel(k) {
  const t = today();
  if (k === t) return 'Heute';
  if (k === addDays(t, -1)) return 'Gestern';
  if (k === addDays(t, 1)) return 'Morgen';
  return formatDate(k);
}
