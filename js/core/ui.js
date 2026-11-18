// UI-Bausteine: Element-Helfer, Icons, Sheets (Dialoge von unten), Toasts, Formularfelder.

import { today, addDays, relDayLabel, isKey } from './dates.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROP_KEYS = new Set(['value', 'checked', 'disabled', 'selected', 'indeterminate', 'multiple']);

function setProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROP_KEYS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}

/** h('div', {class:'x', onclick: fn}, 'Text', child, [mehr]) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  setProps(el, props);
  append(el, children);
  if (props && props.value != null && 'value' in el) el.value = props.value;
  return el;
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  setProps(el, attrs);
  append(el, children);
  return el;
}

// ---------- Icons (eigene, einfache Linien-Icons, 24×24) ----------
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  food: 'M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1-3.5 4-3.5 7.5 0 2 1 3 3.5 3',
  chart: 'M3 3v18h18M7 15l4-4 3 3 6-7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  settings: 'M4 7h9M17 7h3M15 5v4M4 12h3M11 12h9M9 10v4M4 17h11M19 17h1M17 15v4',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 10a4 4 0 0 1 8 0zM12 10l1.5-2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  droplet: 'M12 3c3 4 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 3-7 6-11z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  flame: 'M12 3c.5 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.6 1.4-4 2.3-5.6.5 1.3 1.2 2.2 2.2 2.6.8-2.2.9-5 .5-8z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  share: 'M12 15V3M7 8l5-5 5 5M5 12v8h14v-8',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z',
  ruler: 'M3 16.5L16.5 3 21 7.5 7.5 21zM7 12.5l2 2M10 9.5l2 2M13 6.5l2 2',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3.5 3.5 0 0 0 3.7 4M16 6h3.5a3.5 3.5 0 0 1-3.7 4M12 13v4M8 21h8M9.5 17h5v4h-5z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  pill: 'M4.9 13.1l8.2-8.2a4.6 4.6 0 0 1 6.5 6.5l-8.2 8.2a4.6 4.6 0 0 1-6.5-6.5zM8.5 9.5l6 6',
  briefcase: 'M4 8h16v11H4zM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M4 13h16',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  dot: 'M12 12h.01',
};

export function icon(name, size = 22) {
  return s('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': name === 'more' ? 3 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    class: 'icon', 'aria-hidden': 'true',
  }, s('path', { d: ICONS[name] || ICONS.dot }));
}

// ---------- Zahlen ----------
export function fmt(n, dec = 1) {
  if (n == null || !Number.isFinite(n)) return '–';
  return n.toLocaleString('de-DE', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}
export const fmtInt = (n) => fmt(n == null ? null : Math.round(n), 0);

// ---------- Overlay: Toast & Sheets ----------
const overlayRoot = () => document.getElementById('overlay-root') || document.body;

export function toast(message, { action, onAction, duration = 2600 } = {}) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = h('div', { class: 'toast', role: 'status' },
    h('span', null, message),
    action ? h('button', { class: 'toast-action', onclick: () => { onAction?.(); remove(); } }, action) : null);
  overlayRoot().append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const t = setTimeout(remove, duration);
  function remove() {
    clearTimeout(t);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }
}

const openSheets = new Set();

/** Öffnet ein Bottom-Sheet. footer: Element oder Array. Rückgabe: {close(result), panel} */
export function openSheet({ title, body, footer, onClose }) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-handle' }),
    h('div', { class: 'sheet-head' },
      h('h2', null, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Schließen', onclick: () => api.close() }, icon('x'))),
    h('div', { class: 'sheet-body' }, body),
    footer ? h('div', { class: 'sheet-foot' }, footer) : null);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) api.close(); });
  backdrop.append(panel);
  overlayRoot().append(backdrop);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => backdrop.classList.add('open'));
  let closed = false;
  const api = {
    panel,
    close(result) {
      if (closed) return;
      closed = true;
      openSheets.delete(api);
      backdrop.classList.remove('open');
      if (!openSheets.size) document.body.classList.remove('no-scroll');
      setTimeout(() => backdrop.remove(), 220);
      onClose?.(result);
    },
  };
  openSheets.add(api);
  return api;
}

export function closeAllSheets() {
  [...openSheets].forEach((sh) => sh.close());
}

export function confirmDialog(message, { okLabel = 'OK', danger = false, title = 'Bist du sicher?' } = {}) {
  return new Promise((resolve) => {
    const sh = openSheet({
      title,
      body: h('p', { class: 'muted' }, message),
      footer: [
        h('button', { class: 'btn', onclick: () => sh.close(false) }, 'Abbrechen'),
        h('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', onclick: () => sh.close(true) }, okLabel),
      ],
      onClose: (r) => resolve(!!r),
    });
  });
}

// ---------- Layout ----------
export function pageHeader(title, { eyebrow, actions } = {}) {
  return h('header', { class: 'page-head' },
    h('div', null, eyebrow ? h('div', { class: 'eyebrow' }, eyebrow) : null, h('h1', null, title)),
    actions ? h('div', { class: 'page-actions' }, actions) : null);
}

export function card(title, { iconName, actions, cls = '' } = {}, ...children) {
  return h('section', { class: `card ${cls}` },
    title ? h('div', { class: 'card-head' },
      h('h2', null, iconName ? icon(iconName, 20) : null, title),
      actions ? h('div', { class: 'card-actions' }, actions) : null) : null,
    children);
}

export function emptyState(text, ...actions) {
  return h('div', { class: 'empty' }, h('p', null, text), actions.length ? h('div', { class: 'btn-row' }, actions) : null);
}

export function sectionTitle(text) {
  return h('div', { class: 'section-title' }, text);
}

/** Datumsleiste mit ‹ Heute › – ändert ?d= in der URL. */
export function dateNav(ctx, { allowFuture = false } = {}) {
  const d = ctx.date;
  const t = today();
  const go = (k) => {
    if (!isKey(k)) return;
    ctx.navigate(ctx.path, { ...ctx.query, d: k === t ? undefined : k }, { replace: true });
  };
  const picker = h('input', { type: 'date', class: 'date-input', value: d, max: allowFuture ? null : t, onchange: (e) => go(e.target.value) });
  return h('div', { class: 'date-nav' },
    h('button', { class: 'icon-btn', 'aria-label': 'Vorheriger Tag', onclick: () => go(addDays(d, -1)) }, icon('chevL')),
    h('button', {
      class: 'date-label',
      onclick: () => { try { picker.showPicker(); } catch { picker.focus(); picker.click(); } },
    }, relDayLabel(d), d !== t ? h('span', { class: 'date-sub' }, ' · zurück zu heute') : null),
    h('button', { class: 'icon-btn', 'aria-label': 'Nächster Tag', disabled: !allowFuture && d >= t, onclick: () => go(addDays(d, 1)) }, icon('chevR')),
    picker);
}

// ---------- Formulare ----------
export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function textInput({ value = '', placeholder = '', maxlength } = {}) {
  return h('input', { class: 'input', type: 'text', value, placeholder, maxlength, autocomplete: 'off' });
}

/** Dezimalzahl – akzeptiert Komma und Punkt. */
export function numInput({ value = null, placeholder = '' } = {}) {
  return h('input', {
    class: 'input', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder,
    value: value == null ? '' : String(value).replace('.', ','),
  });
}

export function intInput({ value = null, placeholder = '' } = {}) {
  return h('input', { class: 'input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', placeholder, value: value == null ? '' : String(value) });
}

export function withUnit(input, unit) {
  return h('div', { class: 'input-unit' }, input, h('span', { class: 'unit' }, unit));
}

export function readNum(input) {
  const v = String(input.value).trim().replace(',', '.');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function textarea({ value = '', placeholder = '', rows = 3 } = {}) {
  const t = h('textarea', { class: 'input', placeholder, rows });
  t.value = value || '';
  return t;
}

export function select(options, value) {
  return h('select', { class: 'input', value },
    options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
}

export function checkbox(label, checked = false) {
  const input = h('input', { type: 'checkbox', checked });
  const el = h('label', { class: 'checkbox' }, input, h('span', null, label));
  el.input = input;
  return el;
}

export function segmented(options, value, onChange) {
  const el = h('div', { class: 'seg', role: 'tablist' });
  const render = (v) => {
    el.replaceChildren(...options.map((o) => h('button', {
      type: 'button', role: 'tab', class: o.value === v ? 'active' : '', 'aria-selected': String(o.value === v),
      onclick: () => { render(o.value); onChange(o.value); },
    }, o.label)));
  };
  render(value);
  return el;
}

/** Sterne-Bewertung. onChange(null) = Bewertung entfernt (erneutes Tippen auf denselben Stern). */
export function starRating(value, onChange, { size = 30, readonly = false } = {}) {
  let current = value || 0;
  const el = h('div', { class: 'stars' + (readonly ? ' readonly' : ''), role: readonly ? 'img' : 'radiogroup', 'aria-label': `${current} von 5 Sternen` });
  const render = () => el.replaceChildren(...[1, 2, 3, 4, 5].map((n) => (readonly
    ? h('span', { class: 'star' + (n <= Math.round(current) ? ' on' : '') }, icon('star', size))
    : h('button', {
      type: 'button', class: 'star' + (n <= current ? ' on' : ''), 'aria-label': `${n} von 5 Sternen`,
      onclick: () => { current = current === n ? 0 : n; render(); onChange?.(current || null); },
    }, icon('star', size)))));
  render();
  return el;
}

// ---------- Fortschritt ----------
export function progressBar(value, target, { over = false } = {}) {
  const pct = target ? Math.min((value || 0) / target, 1) * 100 : 0;
  return h('div', { class: 'bar' }, h('div', { class: 'bar-fill' + (over ? ' over' : ''), style: { width: pct + '%' } }));
}

export function metric(label, valueText, value, target, opts) {
  return h('div', { class: 'metric' },
    h('div', { class: 'metric-top' }, h('span', { class: 'metric-label' }, label), h('span', { class: 'metric-val num' }, valueText)),
    progressBar(value, target, opts));
}

export function ring(ratio, { size = 92, stroke = 9, label, sub } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, ratio || 0)));
  return h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } },
    s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size },
      s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track', 'stroke-width': stroke, fill: 'none' }),
      s('circle', {
        cx: size / 2, cy: size / 2, r, class: 'ring-fill', 'stroke-width': stroke, fill: 'none',
        'stroke-dasharray': c, 'stroke-dashoffset': off, 'stroke-linecap': 'round',
        transform: `rotate(-90 ${size / 2} ${size / 2})`,
      })),
    h('div', { class: 'ring-center' }, h('div', { class: 'ring-label' }, label), sub ? h('div', { class: 'ring-sub' }, sub) : null));
}
