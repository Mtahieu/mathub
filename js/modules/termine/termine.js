// Termine: dein Google Kalender in Mathub (nur Lesen).
// Agenda, Tageskarte auf „Heute“, Zeilen im Kalender (summarizeDay) und in der Morgen-Erinnerung.
// Anmeldung & Abgleich: ./google-api.js. Einrichtung (einmalig): Seite „Termine“ → Einrichtung.

import { registerModule } from '../../core/registry.js';
import { parseHash } from '../../core/router.js';
import {
  h, icon, card, pageHeader, segmented, openSheet, toast, field, textInput, checkbox, confirmDialog, emptyState,
} from '../../core/ui.js';
import { today, addDays, formatDate, relDayLabel, dayRange } from '../../core/dates.js';
import {
  getConfig, saveConfig, getToken, login, launchFromRedirect, disconnect, sync, isFresh, mayAutoLogin,
  loadEvents, eventsOn, shortLine, redirectUri, SYNC_FUTURE_DAYS,
} from './google-api.js';

const RANGES = [
  { value: '7', label: '7 Tage' },
  { value: '30', label: '30 Tage' },
  { value: '90', label: '90 Tage' },
];
const NEW_EVENT_URL = 'https://calendar.google.com/calendar/r/eventedit';
const CONSOLE_URL = 'https://console.cloud.google.com/';

// ---------- Hintergrund-Abgleich ----------
/** Startet bei Bedarf einen Abgleich und zeichnet die Seite danach neu – nur, wenn sie noch angezeigt wird. */
async function syncInBackground(ctx, cfg, { allowLogin = false } = {}) {
  if (!cfg.clientId || isFresh(cfg)) return;
  if (await getToken()) {
    const r = await sync();
    if (r === 'ok' && parseHash().path === ctx.path) ctx.refresh();
    if (r !== 'auth') return;
  }
  // Token abgelaufen: auf der Termine-Seite still neu anmelden (Google leitet sofort zurück).
  if (allowLogin && await mayAutoLogin(await getConfig())) login({ silent: true });
}

async function manualRefresh(ctx) {
  const cfg = await getConfig();
  if (!(await getToken())) { await login({ silent: !cfg.needsLogin && !!cfg.lastSync }); return; }
  toast('Wird aktualisiert …');
  const r = await sync({ reloadCalendars: true });
  if (r === 'ok') toast('Termine aktualisiert');
  else if (r === 'auth') { await login({ silent: !!cfg.lastSync }); return; }
  else if (r === 'offline') toast('Keine Verbindung – zeige gespeicherte Termine');
  else toast((await getConfig()).lastError || 'Aktualisieren fehlgeschlagen');
  ctx.refresh();
}

// ---------- Bausteine ----------
function eventRow(e, { showDate } = {}) {
  return h('button', { class: 'list-item ev-row', onclick: () => openEvent(e) },
    h('span', { class: 'ev-bar', style: { background: e.color || 'var(--accent)' } }),
    h('span', { class: 'ev-time num' + (/^\d/.test(e.time) ? '' : ' ev-label') }, e.time.replace(/–/, '\n')),
    h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, e.title),
      e.loc || showDate ? h('span', { class: 'list-sub' }, [showDate, e.loc].filter(Boolean).join(' · ')) : null),
    icon('chevR', 18));
}

function openEvent(e) {
  const when = e.allDay
    ? (e.end > addDays(e.start, 1) ? `${formatDate(e.start, 'long')} – ${formatDate(addDays(e.end, -1), 'long')}` : `${formatDate(e.start, 'long')} · ganztägig`)
    : fmtRange(new Date(e.start), new Date(e.end));
  const sheet = openSheet({
    title: e.title,
    body: [
      h('div', { class: 'list' },
        h('div', { class: 'list-item static' }, icon('calendar', 20), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, when))),
        e.loc ? h('a', {
          class: 'list-item', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.loc), target: '_blank', rel: 'noopener',
        }, icon('pin', 20), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, e.loc), h('span', { class: 'list-sub' }, 'In Karten öffnen')), icon('external', 18)) : null),
      e.desc ? h('p', { class: 'small muted pre' }, e.desc) : null,
    ],
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Schließen'),
      e.link ? h('a', { class: 'btn btn-primary', href: e.link, target: '_blank', rel: 'noopener' }, 'In Google Kalender') : null,
    ],
  });
}

const pad = (n) => String(n).padStart(2, '0');
const hm = (d) => `${d.getHours()}:${pad(d.getMinutes())}`;
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fmtRange(s, e) {
  const ks = keyOf(s); const ke = keyOf(e);
  return ks === ke
    ? `${formatDate(ks, 'long')} · ${hm(s)}–${hm(e)} Uhr`
    : `${formatDate(ks)} ${hm(s)} Uhr – ${formatDate(ke)} ${hm(e)} Uhr`;
}

function statusLine(cfg, store) {
  if (!store.syncedAt) return null;
  const min = Math.round((Date.now() - store.syncedAt) / 60000);
  const ago = min < 1 ? 'gerade eben' : min < 60 ? `vor ${min} Min.` : min < 60 * 24 ? `vor ${Math.round(min / 60)} Std.` : `am ${formatDate(keyOf(new Date(store.syncedAt)))}`;
  return h('p', { class: 'muted small center' }, `Aktualisiert ${ago}${cfg.account ? ' · ' + cfg.account : ''}`);
}

function problemBanner(cfg, ctx) {
  if (!cfg.lastError && !cfg.needsLogin) return null;
  return h('div', { class: 'banner warn' },
    icon('info'),
    h('div', { style: { flex: 1 } },
      h('strong', null, cfg.needsLogin ? 'Anmeldung nötig' : 'Abgleich nicht möglich'),
      h('div', { class: 'small muted' }, cfg.lastError || 'Bitte bei Google anmelden.')),
    h('button', { class: 'btn small', onclick: () => login({ silent: false, returnHash: '#' + ctx.path }) }, 'Anmelden'));
}

// ---------- Seite ----------
async function render(el, ctx) {
  let cfg = await getConfig();
  if (cfg.clientId && !cfg.lastSync && await getToken()) {
    // Erster Abgleich direkt nach der Anmeldung
    const r = await sync({ reloadCalendars: true });
    cfg = await getConfig();
    if (r === 'ok') toast('Google Kalender verbunden');
    else if (r === 'offline') toast('Keine Verbindung – bitte später erneut versuchen');
  }
  const v = ctx.query.v || (cfg.lastSync ? 'agenda' : 'einrichtung');
  const actions = cfg.lastSync ? [
    h('button', { class: 'icon-btn', 'aria-label': 'Aktualisieren', onclick: () => manualRefresh(ctx) }, icon('refresh')),
    h('a', { class: 'icon-btn', 'aria-label': 'Neuer Termin in Google Kalender', href: NEW_EVENT_URL, target: '_blank', rel: 'noopener' }, icon('plus')),
  ] : null;
  el.append(pageHeader('Termine', { eyebrow: 'Google Kalender', actions }));
  if (cfg.lastSync) {
    el.append(segmented([{ value: 'agenda', label: 'Agenda' }, { value: 'einrichtung', label: 'Kalender & Konto' }], v,
      (x) => ctx.navigate('/termine', { v: x === 'agenda' ? undefined : x }, { replace: true })));
  }
  if (v === 'einrichtung') return renderSetup(el, ctx, cfg);

  const banner = problemBanner(cfg, ctx);
  if (banner) el.append(banner);

  const store = await loadEvents();
  const r = RANGES.some((x) => x.value === ctx.query.r) ? ctx.query.r : '30';
  el.append(segmented(RANGES, r, (x) => ctx.navigate('/termine', { r: x === '30' ? undefined : x }, { replace: true })));

  const t = today();
  const days = dayRange(t, addDays(t, Number(r) - 1)).map((d) => ({ d, evs: eventsOn(store, d) }));
  const withEvents = days.filter((x) => x.evs.length);
  if (!withEvents.length) {
    el.append(card(null, {}, emptyState(`Keine Termine in den nächsten ${r} Tagen.`,
      h('a', { class: 'btn', href: NEW_EVENT_URL, target: '_blank', rel: 'noopener' }, 'Termin anlegen'))));
  }
  for (const { d, evs } of withEvents) {
    const rel = relDayLabel(d);
    el.append(card(rel === formatDate(d) ? formatDate(d, 'long') : `${rel} · ${formatDate(d)}`, { cls: d === t ? 'ev-today' : '' },
      h('div', { class: 'list' }, evs.map((e) => eventRow(e)))));
  }
  if (Number(r) > SYNC_FUTURE_DAYS) el.append(h('p', { class: 'muted small center' }, `Mathub lädt Termine bis ${SYNC_FUTURE_DAYS} Tage im Voraus.`));
  const st = statusLine(cfg, store);
  if (st) el.append(st);

  syncInBackground(ctx, cfg, { allowLogin: true });
}

function copyBtn(text) {
  return h('button', {
    class: 'btn small', type: 'button',
    onclick: async () => {
      try { await navigator.clipboard.writeText(text); toast('Kopiert'); } catch { toast('Bitte manuell kopieren'); }
    },
  }, 'Kopieren');
}

function renderSetup(el, ctx, cfg) {
  const uri = redirectUri();
  const origin = location.origin;

  if (cfg.lastSync) {
    // Verbunden: Kalender auswählen, Konto trennen
    el.append(card('Angezeigte Kalender', { iconName: 'calendar' },
      h('div', { class: 'list' }, cfg.calendars.map((c) => {
        const cb = checkbox(c.name + (c.primary ? ' (Hauptkalender)' : ''), c.on);
        cb.insertBefore(h('span', { class: 'cal-dot', style: { background: c.color } }), cb.lastChild);
        cb.input.addEventListener('change', async () => {
          const calendars = (await getConfig()).calendars.map((x) => (x.id === c.id ? { ...x, on: cb.input.checked } : x));
          await saveConfig({ calendars, lastSync: 1 });   // erzwingt neuen Abgleich, Liste bleibt
          if (await getToken()) { const r = await sync(); if (r === 'ok') toast('Gespeichert'); }
          else toast('Gespeichert – Termine werden beim nächsten Abgleich geladen');
        });
        return h('div', { class: 'list-item static' }, cb);
      })),
      h('button', { class: 'btn', onclick: () => manualRefresh(ctx) }, icon('refresh', 18), ' Kalenderliste neu laden')));
    el.append(card('Konto', { iconName: 'shield' },
      h('p', { class: 'small muted' }, cfg.account ? `Verbunden mit ${cfg.account}. ` : '', 'Mathub hat nur Lesezugriff. Termine werden lokal auf diesem Gerät gespeichert, damit sie auch offline da sind.'),
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn btn-danger',
          onclick: async () => {
            if (!await confirmDialog('Die Verbindung wird getrennt und die gespeicherten Termine auf diesem Gerät gelöscht. Dein Google Kalender bleibt unverändert.', { okLabel: 'Trennen', danger: true })) return;
            await disconnect();
            toast('Verbindung getrennt');
            ctx.navigate('/termine', {}, { replace: true });
          },
        }, 'Verbindung trennen'))));
    return;
  }

  // Noch nicht verbunden: Einrichtung
  const cid = textInput({ value: cfg.clientId, placeholder: '…apps.googleusercontent.com' });
  cid.setAttribute('autocapitalize', 'off');
  cid.setAttribute('spellcheck', 'false');
  const banner = problemBanner(cfg, ctx);
  if (banner) el.append(banner);

  el.append(card('Google Kalender verbinden', { iconName: 'calendar' },
    h('p', { class: 'small muted' },
      'Mathub liest deine Termine direkt bei Google – ohne Server dazwischen. Dafür braucht Mathub eine eigene, kostenlose „Client-ID“ aus der Google Cloud Console. Das ist einmalig und dauert ca. 10 Minuten.'),
    field('Client-ID', cid, 'Wird nur auf diesem Gerät gespeichert.'),
    h('button', {
      class: 'btn btn-primary block',
      onclick: async () => {
        const v = cid.value.trim();
        if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(v)) { toast('Das sieht nicht wie eine Client-ID aus'); return; }
        await saveConfig({ clientId: v, lastError: null, needsLogin: false });
        login({ silent: false, returnHash: '#/termine' });
      },
    }, 'Mit Google verbinden')));

  el.append(h('details', { class: 'card info-box', open: !cfg.clientId },
    h('summary', null, icon('info'), h('strong', null, 'Anleitung: Client-ID erstellen')),
    h('ol', { class: 'steps small' },
      h('li', null, 'Am besten am Computer ', h('a', { class: 'link', href: CONSOLE_URL, target: '_blank', rel: 'noopener' }, 'console.cloud.google.com'), ' öffnen und mit deinem Google-Konto anmelden.'),
      h('li', null, 'Oben ein ', h('strong', null, 'neues Projekt'), ' anlegen, z. B. „Mathub“.'),
      h('li', null, h('strong', null, 'APIs & Dienste → Bibliothek'), ': „Google Calendar API“ suchen und ', h('strong', null, 'aktivieren'), '.'),
      h('li', null, h('strong', null, 'OAuth-Zustimmungsbildschirm'), ' (bzw. „Google Auth Platform“) einrichten: Typ ', h('strong', null, 'Extern'), ', App-Name „Mathub“, deine E-Mail eintragen. Unter ', h('strong', null, 'Zielgruppe / Testnutzer'), ' deine Gmail-Adresse hinzufügen. Den Status „Test“ kannst du lassen.'),
      h('li', null, h('strong', null, 'Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID'), ', Anwendungstyp ', h('strong', null, 'Webanwendung'), '.'),
      h('li', null, 'Bei ', h('strong', null, 'Autorisierte JavaScript-Quellen'), ' eintragen:',
        h('div', { class: 'copy-row' }, h('code', null, origin), copyBtn(origin))),
      h('li', null, 'Bei ', h('strong', null, 'Autorisierte Weiterleitungs-URIs'), ' eintragen:',
        h('div', { class: 'copy-row' }, h('code', null, uri), copyBtn(uri))),
      h('li', null, 'Erstellen, die angezeigte ', h('strong', null, 'Client-ID'), ' kopieren (endet auf „.apps.googleusercontent.com“) und oben einfügen. Das Client-Secret brauchst du nicht.'),
      h('li', null, 'Auf „Mit Google verbinden“ tippen. Google warnt evtl. „App nicht überprüft“ – das ist deine eigene App: ', h('strong', null, 'Weiter'), ' wählen und den Lesezugriff erlauben.')),
    h('p', { class: 'small muted' },
      'Gut zu wissen: Google gibt Web-Apps ohne Server nur einen Zugang für ca. 1 Stunde. Danach meldet Mathub dich beim Öffnen der Termine automatisch kurz neu an (ein kurzer Sprung zu Google und zurück). Ohne Netz siehst du die zuletzt geladenen Termine.')));
}

// ---------- Heute, Kalender, Erinnerungen ----------
async function todayCard(date, data, ctx) {
  const store = data.ext?.termine;
  if (!store?.connected) return null;
  const evs = eventsOn(store, date);
  if (date === today()) syncInBackground(ctx, await getConfig());
  return card(date === today() ? 'Termine heute' : 'Termine', {
    iconName: 'calendar',
    actions: h('a', { class: 'link', href: '#/termine' }, 'Alle'),
  }, evs.length
    ? h('div', { class: 'list' }, evs.map((e) => eventRow(e)))
    : h('p', { class: 'muted small' }, 'Keine Termine.'));
}

function summarizeDay(date, data) {
  const store = data.ext?.termine;
  return store?.connected ? eventsOn(store, date).map((e) => '📅 ' + shortLine(e)) : [];
}

async function reminderNote(slot, date) {
  if (slot !== 'morgen') return null;
  const cfg = await getConfig();
  if (!cfg.lastSync) return null;
  const evs = eventsOn(await loadEvents(), date);
  if (!evs.length) return null;
  const names = evs.slice(0, 4).map(shortLine);
  return `📅 ${names.join(', ')}${evs.length > 4 ? ` +${evs.length - 4}` : ''}`;
}

async function loadData() {
  const cfg = await getConfig();
  if (!cfg.lastSync) return { connected: false };
  return { connected: true, ...(await loadEvents()) };
}

registerModule({
  id: 'termine',
  area: 'organisation',
  title: 'Termine',
  description: 'Dein Google Kalender',
  order: 5,
  nav: { tab: 2, label: 'Termine', icon: 'calendar' },
  routes: [{ path: '/termine', render }],
  launch: launchFromRedirect,
  loadData, todayCard, summarizeDay, reminderNote,
});
