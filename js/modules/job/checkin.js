// Job: täglicher Check-in mit drei Fragen (1–10) und Highlight/Lowlight des Tages.
// entries type 'job' (1 pro Tag): data {leistung, zufriedenheit, gebraucht, highlight, lowlight}
// Werte 1–10 oder null (nicht beantwortet).

import { registerModule, loadDays } from '../../core/registry.js';
import { entries } from '../../core/db.js';
import { h, icon, card, dateNav, pageHeader, toast, field, textarea, fmt, segmented, confirmDialog } from '../../core/ui.js';
import { today, addDays, weekday, formatDate } from '../../core/dates.js';
import { lineChart, emptyChart } from '../../core/charts.js';

export const QUESTIONS = [
  {
    key: 'leistung', short: 'Leistung', label: 'Wie viel habe ich geleistet?', color: 'var(--c-kraft)',
    emojis: ['😴', '🥱', '🐢', '🙃', '😐', '🙂', '👍', '💪', '🔥', '🚀'],
  },
  {
    key: 'zufriedenheit', short: 'Zufriedenheit', label: 'Wie zufrieden bin ich heute mit meinem Job?', color: 'var(--accent)',
    emojis: ['😫', '😣', '😞', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩'],
  },
  {
    key: 'gebraucht', short: 'Gebraucht', label: 'Fühle ich mich gebraucht?', color: 'var(--c-physio)',
    emojis: ['👻', '🫥', '😶', '🤷', '😐', '🙂', '🤝', '🙌', '⭐', '🦸'],
  },
];

// Ab diesem Tag zählt der Check-in an Werktagen als Tagesziel (frühere Tage bleiben für die Serie unverändert).
const GOAL_SINCE = '2026-11-17';

const emojiFor = (q, v) => (v >= 1 && v <= 10 ? q.emojis[v - 1] : '·');
const hasValues = (d) => QUESTIONS.some((q) => d?.[q.key] != null);
const isWorkday = (date) => weekday(date) < 5;

/** Skala 1–10 mit Emojis. Erneutes Tippen auf den gewählten Wert entfernt ihn. */
function scale(q, value, onChange) {
  let current = value ?? null;
  const shown = h('span', { class: 'job-q-emoji', 'aria-hidden': 'true' });
  const valueText = h('span', { class: 'job-q-val num' });
  const grid = h('div', { class: 'job-scale', role: 'radiogroup', 'aria-label': q.label });
  const render = () => {
    shown.textContent = current ? emojiFor(q, current) : '❔';
    valueText.textContent = current ? `${current}/10` : '–';
    grid.replaceChildren(...q.emojis.map((e, i) => {
      const n = i + 1;
      return h('button', {
        type: 'button', role: 'radio', class: 'job-step' + (current === n ? ' on' : ''),
        'aria-checked': String(current === n), 'aria-label': `${n} von 10`,
        onclick: () => { current = current === n ? null : n; render(); onChange(current); },
      }, h('span', { class: 'job-step-emoji' }, e), h('span', { class: 'job-step-num' }, n));
    }));
  };
  render();
  return h('div', { class: 'job-q' },
    h('div', { class: 'job-q-head' }, shown, h('span', { class: 'job-q-label' }, q.label), valueText),
    grid);
}

function avg(list, key) {
  const vals = list.map((e) => e.data[key]).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

async function render(el, ctx) {
  const date = ctx.date;
  const existing = await entries.daily('job', date);
  const d = { ...(existing?.data || {}) };

  el.append(pageHeader('Job', { eyebrow: 'Täglicher Check-in' }));
  el.append(dateNav(ctx));

  const highlight = textarea({ value: d.highlight, placeholder: 'Was war heute richtig gut?', rows: 2 });
  const lowlight = textarea({ value: d.lowlight, placeholder: 'Was hat heute genervt oder Energie gekostet?', rows: 2 });

  el.append(card('Check-in', { iconName: 'briefcase' },
    QUESTIONS.map((q) => scale(q, d[q.key], (v) => { d[q.key] = v; })),
    h('div', { class: 'job-q-head' }, h('span', { class: 'job-q-emoji', 'aria-hidden': 'true' }, '✨'), h('span', { class: 'job-q-label' }, 'Was war das Highlight / Lowlight heute?')),
    field('Highlight', highlight),
    field('Lowlight', lowlight),
    h('div', { class: 'btn-row' },
      existing ? h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (!await confirmDialog('Check-in dieses Tages löschen?', { okLabel: 'Löschen', danger: true })) return;
          await entries.delete(existing.id); toast('Gelöscht'); ctx.refresh();
        },
      }, 'Löschen') : null,
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const data = {
            leistung: d.leistung ?? null, zufriedenheit: d.zufriedenheit ?? null, gebraucht: d.gebraucht ?? null,
            highlight: highlight.value.trim(), lowlight: lowlight.value.trim(),
          };
          if (!hasValues(data) && !data.highlight && !data.lowlight) { toast('Bitte mindestens eine Frage beantworten'); return; }
          await entries.saveDaily('job', date, data);
          toast('Check-in gespeichert');
          ctx.refresh();
        },
      }, 'Speichern'))));

  const all = (await entries.byType('job')).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!all.length) {
    el.append(card('So nutzt du den Check-in', { iconName: 'info' },
      h('p', { class: 'muted small' }, 'Beantworte die Fragen am besten jeden Arbeitstag zur gleichen Zeit, zum Beispiel direkt nach Feierabend. Nach zwei, drei Wochen siehst du hier Durchschnitte, Verlauf und – wenn du auch deinen Schlaf einträgst – ob du an ausgeschlafenen Tagen zufriedener bist.')));
    return;
  }

  // Überblick: Ø 7 und Ø 30 Tage
  const t = today();
  const last7 = all.filter((e) => e.date > addDays(t, -7));
  const last30 = all.filter((e) => e.date > addDays(t, -30));
  el.append(card('Überblick', { iconName: 'chart' },
    h('div', { class: 'stat-grid' }, QUESTIONS.map((q) => {
      const a7 = avg(last7, q.key), a30 = avg(last30, q.key);
      return h('div', { class: 'stat' },
        h('span', { class: 'stat-val' }, a7 == null ? '–' : `${emojiFor(q, Math.round(a7))} ${fmt(a7, 1)}`),
        h('span', { class: 'stat-label' }, q.short),
        h('span', { class: 'stat-label' }, a30 == null ? '30 T.: –' : `30 T.: ${fmt(a30, 1)}`));
    })),
    h('p', { class: 'muted small' }, `Groß: Ø der letzten 7 Tage · ${last30.length} Check-ins in 30 Tagen, ${all.length} insgesamt`)));

  // Schlaf und Zufriedenheit
  const sleepCard = await sleepInsight(all);
  if (sleepCard) el.append(sleepCard);

  // Verlauf
  const box = h('div');
  let qKey = 'zufriedenheit';
  let range = 30;
  const draw = () => {
    const q = QUESTIONS.find((x) => x.key === qKey);
    const from = addDays(t, -(range - 1));
    const pts = all.filter((e) => e.data[q.key] != null).map((e) => ({ key: e.date, value: e.data[q.key] }));
    box.replaceChildren(pts.length ? lineChart(pts, { from, to: t, avgDays: 7, color: q.color, label: q.short }) : emptyChart());
  };
  el.append(card('Verlauf', { iconName: 'chart' },
    segmented(QUESTIONS.map((q) => ({ value: q.key, label: q.short })), qKey, (v) => { qKey = v; draw(); }),
    segmented([{ value: 30, label: '30 Tage' }, { value: 90, label: '90 Tage' }, { value: 365, label: '1 Jahr' }], range, (v) => { range = v; draw(); }),
    box,
    h('p', { class: 'muted small' }, 'Dünne Linie: Tageswerte · dicke Linie: Ø 7 Tage')));
  draw();

  // Highlights & Lowlights
  const withText = all.filter((e) => e.data.highlight || e.data.lowlight).slice(0, 14);
  if (withText.length) {
    el.append(card('Highlights & Lowlights', { iconName: 'star' },
      h('div', { class: 'list' }, withText.map((e) => h('button', {
        class: 'list-item job-note', onclick: () => ctx.navigate('/job', { d: e.date === t ? undefined : e.date }, { replace: true }),
      }, h('span', { class: 'list-main' },
        h('span', { class: 'list-title' }, formatDate(e.date), ' ', h('span', { class: 'job-mini' }, QUESTIONS.map((q) => emojiFor(q, e.data[q.key])).join(' '))),
        e.data.highlight ? h('span', { class: 'list-sub job-hi' }, '▲ ', e.data.highlight) : null,
        e.data.lowlight ? h('span', { class: 'list-sub job-lo' }, '▼ ', e.data.lowlight) : null))))));
  }
}

/** Vergleicht die Zufriedenheit an Tagen mit genug vs. zu wenig Schlaf (Schlaf-Eintrag = Nacht vor dem Tag). */
async function sleepInsight(all) {
  const sleeps = await entries.byType('sleep');
  if (!sleeps.length) return null;
  const s = (await loadDays(today(), today())).settings;
  const target = s.targets.sleepH || 7;
  const sleepByDay = new Map(sleeps.map((e) => [e.date, e.data]));
  const rested = [], tired = [];
  for (const e of all) {
    const sl = sleepByDay.get(e.date);
    if (!sl || sl.hours == null || e.data.zufriedenheit == null) continue;
    (sl.hours >= target - 0.5 ? rested : tired).push(e);
  }
  if (rested.length + tired.length < 5) {
    return card('Schlaf & Zufriedenheit', { iconName: 'moon' },
      h('p', { class: 'muted small' }, `Sobald du an mindestens 5 Tagen Schlaf und Check-in eingetragen hast, siehst du hier, ob du nach genug Schlaf (ab ${fmt(target - 0.5)} h) zufriedener mit deinem Job bist. Bisher: ${rested.length + tired.length}.`));
  }
  const aR = avg(rested, 'zufriedenheit'), aT = avg(tired, 'zufriedenheit');
  const diff = aR != null && aT != null ? aR - aT : null;
  let verdict = 'Noch zu wenige Tage in einer der beiden Gruppen für einen Vergleich.';
  if (diff != null) {
    verdict = Math.abs(diff) < 0.75
      ? 'Kaum Unterschied: Deine Zufriedenheit hängt bisher wenig vom Schlaf ab. Was dich stört, ist eher dauerhaft.'
      : diff > 0
        ? `Nach genug Schlaf bist du im Schnitt ${fmt(diff, 1)} Punkte zufriedener. Müdigkeit färbt deine Einschätzung des Jobs.`
        : `Überraschend: Nach wenig Schlaf bist du ${fmt(-diff, 1)} Punkte zufriedener.`;
  }
  return card('Schlaf & Zufriedenheit', { iconName: 'moon' },
    h('div', { class: 'stat-grid two' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, aR == null ? '–' : fmt(aR, 1)), h('span', { class: 'stat-label' }, `ausgeschlafen · ${rested.length} Tage`)),
      h('div', { class: 'stat' }, h('span', { class: 'stat-val' }, aT == null ? '–' : fmt(aT, 1)), h('span', { class: 'stat-label' }, `zu wenig Schlaf · ${tired.length} Tage`))),
    h('p', { class: 'muted small' }, verdict));
}

async function todayCard(date, data) {
  const e = data.first(date, 'job');
  const link = `#/job${date !== today() ? '?d=' + date : ''}`;
  if (e && hasValues(e.data)) {
    return card('Job', { iconName: 'briefcase', actions: h('a', { class: 'link', href: link }, 'Details') },
      h('div', { class: 'job-today' }, QUESTIONS.map((q) => h('div', { class: 'job-today-item' },
        h('span', { class: 'job-today-emoji' }, emojiFor(q, e.data[q.key])),
        h('span', { class: 'job-today-val num' }, e.data[q.key] ?? '–'),
        h('span', { class: 'job-today-label' }, q.short)))));
  }
  if (!isWorkday(date) && !e) return null;
  return card('Job', { iconName: 'briefcase' },
    h('p', { class: 'muted small' }, 'Leistung, Zufriedenheit, gebraucht fühlen – dauert 20 Sekunden.'),
    h('a', { class: 'btn btn-primary block', href: link }, 'Check-in ausfüllen'));
}

function goals(date, data) {
  if (date < GOAL_SINCE || !isWorkday(date)) return [];
  const e = data.first(date, 'job');
  const done = !!e && hasValues(e.data);
  return [{ id: 'job-checkin', label: 'Job-Check-in', detail: done ? QUESTIONS.map((q) => emojiFor(q, e.data[q.key])).join(' ') : 'noch offen', done, progress: done ? 1 : 0, route: '/job' }];
}

function summarizeDay(date, data) {
  const e = data.first(date, 'job');
  if (!e) return [];
  const vals = QUESTIONS.filter((q) => e.data[q.key] != null).map((q) => `${q.short} ${e.data[q.key]}`);
  return [['Job: ' + (vals.join(' · ') || 'Notiz'), e.data.highlight ? `▲ ${e.data.highlight}` : null].filter(Boolean).join(' – ')];
}

const charts = QUESTIONS.map((q) => ({
  id: 'job-' + q.key,
  title: `Job: ${q.short} (1–10) · Linie = Ø 7 Tage`,
  render(el, { from, to, data }) {
    const pts = [];
    for (const [k, d] of data.byDay) {
      const v = d.job?.[0]?.data[q.key];
      if (k >= from && k <= to && v != null) pts.push({ key: k, value: v });
    }
    el.append(pts.length ? lineChart(pts, { from, to, avgDays: 7, color: q.color, label: q.short }) : emptyChart('Noch keine Check-ins in diesem Zeitraum'));
  },
}));

registerModule({
  id: 'job',
  area: 'job',
  title: 'Job',
  description: 'Täglicher Check-in: Leistung, Zufriedenheit, gebraucht fühlen',
  order: 30,
  nav: { more: 1, icon: 'briefcase' },
  routes: [{ path: '/job', render }],
  todayCard, goals, summarizeDay, charts,
});
