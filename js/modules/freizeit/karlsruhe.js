// Veranstaltungen in Karlsruhe von „Keep Karlsruhe Boring“ (keepkarlsruheboring.org, läuft auf Gancio).
// Öffentliche Schnittstelle ohne Anmeldung: GET /api/events?start=<unix>&end=<unix>
//   → [{id, title, slug, start_datetime, end_datetime, multidate, place:{name, address}, tags:[], media:[{url}]}]
// Anzeige: Karte auf der Startseite (homeCard) und Seite #/karlsruhe (heute/morgen).
// Zuletzt geladene Liste je Tag in kv 'ka:events2' – so bleibt sie offline sichtbar.

import { registerModule } from '../../core/registry.js';
import { kv } from '../../core/db.js';
import { h, icon, card, pageHeader, segmented, emptyState } from '../../core/ui.js';
import { today, addDays, fromKey, formatDate } from '../../core/dates.js';

export const KKB = 'https://keepkarlsruheboring.org';
const FRESH_MS = 15 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const hm = (sec) => { const d = new Date(sec * 1000); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const eventUrl = (e) => `${KKB}/event/${encodeURIComponent(e.slug || e.id)}`;
const thumbUrl = (e) => (e.media?.[0]?.url ? `${KKB}/media/thumb/${encodeURIComponent(e.media[0].url)}` : null);

/** Termine eines Tages: {events, at, offline, error} – nutzt den Speicher, wenn frisch genug oder ohne Netz. */
export async function eventsOn(date, { force = false } = {}) {
  const cache = await kv.get('ka:events2', {});
  const hit = cache[date];
  if (hit && !force && Date.now() - hit.at < FRESH_MS) return { ...hit, cached: true };
  const start = Math.floor(fromKey(date).getTime() / 1000);
  const end = Math.floor(fromKey(addDays(date, 1)).getTime() / 1000) - 1;
  try {
    if (navigator.onLine === false) throw new TypeError('offline');
    const res = await fetch(`${KKB}/api/events?start=${start}&end=${end}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Fehler ${res.status}`);
    const raw = await res.json();
    const list = (Array.isArray(raw) ? raw : raw?.events || [])
      .filter((e) => e && e.title && (e.end_datetime || e.start_datetime) >= start && e.start_datetime <= end)
      .sort((a, b) => a.start_datetime - b.start_datetime)
      .map((e) => ({
        id: e.id, title: e.title, slug: e.slug, start: e.start_datetime, end: e.end_datetime || null,
        allDay: !!e.multidate || (e.end_datetime && e.end_datetime - e.start_datetime >= 20 * 3600),
        place: e.place?.name || '', address: e.place?.address || '', tags: (e.tags || []).slice(0, 3), media: e.media || [],
      }));
    const rec = { events: list, at: Date.now() };
    // nur die letzten Tage aufheben
    const keep = Object.fromEntries(Object.entries({ ...cache, [date]: rec }).filter(([k]) => k >= addDays(today(), -2)));
    await kv.set('ka:events2', keep);
    return rec;
  } catch (err) {
    if (hit) return { ...hit, cached: true, offline: true };
    return { events: [], at: null, error: err instanceof TypeError ? 'offline' : String(err.message || err) };
  }
}

function eventRow(e, { thumbs = false } = {}) {
  const time = e.allDay ? 'ganztägig' : hm(e.start);
  const img = thumbs && thumbUrl(e) ? h('img', { class: 'ka-thumb', src: thumbUrl(e), alt: '', loading: 'lazy' }) : null;
  return h('a', { class: 'list-item ka-row', href: eventUrl(e), target: '_blank', rel: 'noopener' },
    h('span', { class: 'ka-time num' }, time),
    img,
    h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, e.title),
      e.place || e.tags.length ? h('span', { class: 'list-sub' }, [e.place, e.tags.map((t) => '#' + t).join(' ')].filter(Boolean).join(' · ')) : null),
    icon('chevR', 18));
}

function problemText(r) {
  if (r.error === 'offline') return 'Gerade keine Verbindung zu keepkarlsruheboring.org.';
  if (r.error) return `keepkarlsruheboring.org antwortet nicht (${r.error}).`;
  return null;
}

/** Karte für die Startseite. */
async function homeCard() {
  const r = await eventsOn(today());
  const now = Date.now() / 1000;
  const upcoming = r.events.filter((e) => (e.end || e.start + 3 * 3600) > now);
  const list = upcoming.slice(0, 4);
  return card('Heute in Karlsruhe', {
    iconName: 'calendar', cls: 'ka-card',
    actions: h('a', { class: 'link', href: '#/karlsruhe' }, upcoming.length > list.length ? `Alle ${upcoming.length}` : 'Mehr'),
  },
  list.length ? h('div', { class: 'list' }, list.map((e) => eventRow(e)))
    : h('p', { class: 'small muted' }, problemText(r) || (r.events.length ? 'Für heute ist schon alles vorbei – schau morgen wieder rein.' : 'Heute ist nichts eingetragen.')),
  h('p', { class: 'ka-source small muted' }, 'Quelle: ', h('a', { class: 'link', href: KKB, target: '_blank', rel: 'noopener' }, 'Keep Karlsruhe Boring'), r.offline ? ' · gespeicherter Stand' : ''));
}

async function render(el, ctx) {
  const day = ctx.query.t === 'morgen' ? 'morgen' : 'heute';
  const date = day === 'morgen' ? addDays(today(), 1) : today();
  el.append(pageHeader('Karlsruhe', {
    eyebrow: 'Veranstaltungen',
    actions: h('a', { class: 'icon-btn', href: '#/heute', 'aria-label': 'Zurück' }, icon('x')),
  }));
  el.append(segmented([{ value: 'heute', label: 'Heute' }, { value: 'morgen', label: 'Morgen' }], day,
    (v) => ctx.navigate('/karlsruhe', { t: v === 'heute' ? undefined : v }, { replace: true })));
  const r = await eventsOn(date, { force: ctx.query.neu === '1' });
  el.append(card(formatDate(date, 'long'), { iconName: 'calendar' },
    r.events.length ? h('div', { class: 'list' }, r.events.map((e) => eventRow(e, { thumbs: true })))
      : emptyState(problemText(r) || 'Für diesen Tag ist nichts eingetragen.', h('a', { class: 'btn', href: KKB, target: '_blank', rel: 'noopener' }, 'Auf keepkarlsruheboring.org schauen'))));
  el.append(h('p', { class: 'muted small center' },
    'Termine von ', h('a', { class: 'link', href: KKB, target: '_blank', rel: 'noopener' }, 'Keep Karlsruhe Boring'),
    ' – dem offenen Veranstaltungskalender für Karlsruhe, in den jede Person Termine eintragen kann.',
    r.offline ? ' (gespeicherter Stand, gerade offline)' : ''));
}

registerModule({
  id: 'karlsruhe',
  area: 'freizeit',
  title: 'Karlsruhe',
  description: 'Veranstaltungen heute & morgen',
  order: 80,
  routes: [{ path: '/karlsruhe', render }],
  homeCard,
});
