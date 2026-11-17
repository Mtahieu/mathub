// Training: Übungsbibliothek (Physio, Kraft, …), Wochenplan und tägliches Abhaken/Protokollieren.
//
// items  kind 'exercise': {name, category, mode:'reps'|'time'|'check', weighted, targetSets, targetReps,
//                          targetSeconds, days:[0..6], trackPain, notes, archived}
// entries type 'exercise': data {exerciseId, sets:[{reps, weight, seconds}], done, pain, note}

import { registerModule, loadDays } from '../../core/registry.js';
import { items, entries } from '../../core/db.js';
import {
  h, icon, card, dateNav, pageHeader, segmented, openSheet, confirmDialog, toast, field, numInput, intInput,
  readNum, textInput, textarea, select, checkbox, emptyState, fmt, sectionTitle,
} from '../../core/ui.js';
import { today, weekday, WEEKDAYS_SHORT, WEEKDAYS_LONG, keyFromTs, formatDate, startOfWeek, dayRange } from '../../core/dates.js';
import { lineChart, barChart, emptyChart } from '../../core/charts.js';

export const CATEGORIES = [
  { value: 'physio', label: 'Physio' },
  { value: 'kraft', label: 'Kraft' },
  { value: 'mobil', label: 'Mobilität' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'sonst', label: 'Sonstiges' },
];
const catLabel = (id) => CATEGORIES.find((c) => c.value === id)?.label || 'Sonstiges';
const catOrder = (id) => CATEGORIES.findIndex((c) => c.value === id);
const MODES = [
  { value: 'reps', label: 'Wiederholungen' },
  { value: 'time', label: 'Zeit' },
  { value: 'check', label: 'Abhaken' },
];

const TEMPLATES = [
  { name: 'Kniebeuge', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 8 },
  { name: 'Bankdrücken', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 8 },
  { name: 'Kreuzheben', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 5 },
  { name: 'Rudern (Langhantel)', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 10 },
  { name: 'Schulterdrücken', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 8 },
  { name: 'Latziehen', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 10 },
  { name: 'Ausfallschritte', category: 'kraft', mode: 'reps', weighted: true, targetSets: 3, targetReps: 10 },
  { name: 'Klimmzüge', category: 'kraft', mode: 'reps', weighted: false, targetSets: 3, targetReps: 6 },
  { name: 'Liegestütze', category: 'kraft', mode: 'reps', weighted: false, targetSets: 3, targetReps: 12 },
  { name: 'Unterarmstütz (Plank)', category: 'kraft', mode: 'time', targetSets: 3, targetSeconds: 45 },
];

// ---------- Helfer ----------
const sortEx = (a, b) => catOrder(a.category) - catOrder(b.category) || a.name.localeCompare(b.name, 'de');
const activeExercises = (list) => list.filter((e) => !e.archived).sort(sortEx);

export function isPlanned(ex, date) {
  return !ex.archived && (ex.days || []).includes(weekday(date)) && keyFromTs(ex.createdAt) <= date;
}

export function targetText(ex) {
  const sets = ex.targetSets || 1;
  if (ex.mode === 'time') return `${sets} × ${ex.targetSeconds || 30} s`;
  if (ex.mode === 'check') return 'abhaken';
  return `${sets} × ${ex.targetReps || 10}${ex.weighted ? ' mit Gewicht' : ''}`;
}

function daysText(days = []) {
  if (days.length === 7) return 'täglich';
  if (!days.length) return 'nicht eingeplant';
  return [...days].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

function setsText(ex, d) {
  if (!d?.sets?.length || ex?.mode === 'check') return 'erledigt';
  if (ex?.mode === 'time') return d.sets.map((st) => `${st.seconds ?? '–'} s`).join(' · ');
  return d.sets.map((st) => (st.weight != null ? `${st.reps ?? '–'}×${fmt(st.weight)} kg` : `${st.reps ?? '–'}`)).join(' · ');
}

const logFor = (data, date, exId) => data.get(date, 'exercise').find((e) => e.data.exerciseId === exId) || null;

async function lastLog(exId, beforeDate) {
  const all = await entries.byType('exercise');
  let best = null;
  for (const e of all) if (e.data.exerciseId === exId && e.date < beforeDate && (!best || e.date > best.date)) best = e;
  return best;
}

const lastWeight = (log) => log?.data.sets?.find((st) => st.weight != null)?.weight ?? null;

function defaultSets(ex, last) {
  return Array.from({ length: ex.targetSets || 1 }, () => (ex.mode === 'time'
    ? { seconds: ex.targetSeconds || 30 }
    : { reps: ex.targetReps || 10, weight: ex.weighted ? lastWeight(last) : null }));
}

// ---------- Aktionen ----------
async function quickToggle(ex, date, existing, after) {
  if (existing) {
    const ok = await confirmDialog(`Eintrag für „${ex.name}“ entfernen?`, { okLabel: 'Entfernen', danger: true });
    if (!ok) return;
    await entries.delete(existing.id);
    after();
    return;
  }
  const last = await lastLog(ex.id, date);
  await entries.put({
    type: 'exercise', date,
    data: { exerciseId: ex.id, sets: ex.mode === 'check' ? [] : defaultSets(ex, last), done: true, pain: null, note: '' },
  });
  toast(`${ex.name} erledigt`);
  after();
}

async function openLogSheet(ex, date, existing, after) {
  const last = await lastLog(ex.id, date);
  const sets = existing?.data.sets?.length ? structuredClone(existing.data.sets) : defaultSets(ex, last);
  const setsBox = h('div', { class: 'sets' });

  function renderSets() {
    setsBox.replaceChildren(
      ...sets.map((st, i) => {
        const row = h('div', { class: 'set-row' }, h('span', { class: 'set-no' }, `${i + 1}.`));
        if (ex.mode === 'time') {
          const inp = intInput({ value: st.seconds, placeholder: 'Sek.' });
          inp.addEventListener('input', () => { st.seconds = readNum(inp); });
          row.append(h('label', { class: 'set-field' }, inp, h('span', null, 'Sek.')));
        } else {
          const r = intInput({ value: st.reps, placeholder: 'Wdh.' });
          r.addEventListener('input', () => { st.reps = readNum(r); });
          row.append(h('label', { class: 'set-field' }, r, h('span', null, 'Wdh.')));
          if (ex.weighted) {
            const w = numInput({ value: st.weight, placeholder: 'kg' });
            w.addEventListener('input', () => { st.weight = readNum(w); });
            row.append(h('label', { class: 'set-field' }, w, h('span', null, 'kg')));
          }
        }
        row.append(h('button', { class: 'icon-btn small', 'aria-label': 'Satz entfernen', onclick: () => { sets.splice(i, 1); renderSets(); } }, icon('x', 18)));
        return row;
      }),
      h('button', { class: 'btn btn-ghost small', onclick: () => { sets.push({ ...(sets.at(-1) || {}) }); renderSets(); } }, icon('plus', 18), 'Satz hinzufügen'),
    );
  }
  if (ex.mode !== 'check') renderSets();

  let pain = existing?.data.pain ?? null;
  const painVal = h('span', { class: 'pain-val' }, pain == null ? '–' : String(pain));
  const slider = h('input', { type: 'range', min: 0, max: 10, step: 1, value: pain ?? 0, class: 'range' });
  slider.addEventListener('input', () => { pain = Number(slider.value); painVal.textContent = String(pain); });
  const note = textarea({ value: existing?.data.note || '', placeholder: 'Wie lief es? (optional)', rows: 2 });

  const sheet = openSheet({
    title: ex.name,
    body: [
      h('div', { class: 'chips' }, h('span', { class: 'tag', dataset: { cat: ex.category } }, catLabel(ex.category)), h('span', { class: 'tag' }, 'Ziel: ' + targetText(ex))),
      ex.notes ? h('p', { class: 'muted small pre' }, ex.notes) : null,
      last ? h('div', { class: 'muted small' }, `Letztes Mal (${formatDate(last.date, 'short')}): ${setsText(ex, last.data)}`) : null,
      ex.mode !== 'check' ? setsBox : null,
      ex.trackPain ? field('Beschwerden (0 = keine, 10 = stark)', h('div', { class: 'range-row' }, slider, painVal)) : null,
      field('Notiz', note),
    ],
    footer: [
      existing ? h('button', {
        class: 'btn btn-danger',
        onclick: async () => { await entries.delete(existing.id); sheet.close(); toast('Eintrag entfernt'); after(); },
      }, 'Löschen') : h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const clean = ex.mode === 'check' ? [] : sets.filter((st) => Object.values(st).some((v) => v != null));
          await entries.put({
            ...(existing || {}), type: 'exercise', date,
            data: { exerciseId: ex.id, sets: clean, done: true, pain: ex.trackPain ? pain : null, note: note.value.trim() },
          });
          sheet.close();
          toast('Gespeichert');
          after();
        },
      }, existing ? 'Speichern' : 'Erledigt'),
    ],
  });
}

function openExerciseEditor(ex, after) {
  const isNew = !ex;
  const st = {
    name: ex?.name || '', category: ex?.category || 'physio', mode: ex?.mode || 'reps', weighted: ex?.weighted ?? false,
    targetSets: ex?.targetSets ?? 3, targetReps: ex?.targetReps ?? 10, targetSeconds: ex?.targetSeconds ?? 30,
    days: [...(ex?.days ?? [0, 1, 2, 3, 4, 5, 6])], trackPain: ex?.trackPain ?? (ex ? false : true),
    notes: ex?.notes || '', archived: ex?.archived ?? false,
  };

  const name = textInput({ value: st.name, placeholder: 'z. B. Brücke, Knieheben, Bankdrücken', maxlength: 80 });
  const cat = select(CATEGORIES, st.category);
  const sets = intInput({ value: st.targetSets });
  const reps = intInput({ value: st.targetReps });
  const secs = intInput({ value: st.targetSeconds });
  const weighted = checkbox('Mit Gewicht (kg) protokollieren', st.weighted);
  const pain = checkbox('Beschwerden (0–10) erfassen', st.trackPain);
  const notes = textarea({ value: st.notes, placeholder: 'Ausführungshinweise, z. B. von der Physiotherapie' });

  const repsField = field('Wiederholungen pro Satz', reps);
  const secsField = field('Sekunden pro Satz', secs);
  const setsField = field('Sätze', sets);
  const modeDeps = () => {
    repsField.hidden = st.mode !== 'reps';
    weighted.hidden = st.mode !== 'reps';
    secsField.hidden = st.mode !== 'time';
    setsField.hidden = st.mode === 'check';
  };
  const mode = segmented(MODES, st.mode, (v) => { st.mode = v; modeDeps(); });
  modeDeps();

  const dayChips = h('div', { class: 'chips' });
  const renderDays = () => dayChips.replaceChildren(
    ...WEEKDAYS_SHORT.map((d, i) => h('button', {
      type: 'button', class: 'chip' + (st.days.includes(i) ? ' active' : ''),
      onclick: () => { st.days = st.days.includes(i) ? st.days.filter((x) => x !== i) : [...st.days, i].sort(); renderDays(); },
    }, d)),
    h('button', { type: 'button', class: 'chip', onclick: () => { st.days = st.days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]; renderDays(); } },
      st.days.length === 7 ? 'keine' : 'täglich'));
  renderDays();

  const archived = checkbox('Archiviert (nicht mehr eingeplant, Verlauf bleibt)', st.archived);

  const sheet = openSheet({
    title: isNew ? 'Neue Übung' : 'Übung bearbeiten',
    body: [
      field('Name', name),
      field('Kategorie', cat),
      field('Art', mode),
      h('div', { class: 'grid-2' }, setsField, repsField, secsField),
      weighted,
      field('Eingeplant an', dayChips, 'Diese Tage erscheinen im Wochenplan und als Tagesziel.'),
      pain,
      field('Notizen', notes),
      isNew ? null : archived,
    ],
    footer: [
      isNew ? h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen')
        : h('button', { class: 'btn btn-danger', onclick: () => deleteExercise(ex, sheet, after) }, 'Löschen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const n = name.value.trim();
          if (!n) { name.focus(); toast('Bitte einen Namen eingeben'); return; }
          await items.put({
            ...(ex || {}), kind: 'exercise', name: n, category: cat.value, mode: st.mode,
            weighted: st.mode === 'reps' && weighted.input.checked,
            targetSets: readNum(sets) || 1, targetReps: readNum(reps) || 10, targetSeconds: readNum(secs) || 30,
            days: st.days, trackPain: pain.input.checked, notes: notes.value.trim(), archived: !isNew && archived.input.checked,
          });
          sheet.close();
          toast(isNew ? 'Übung angelegt' : 'Gespeichert');
          after();
        },
      }, 'Speichern'),
    ],
  });
  if (isNew) setTimeout(() => name.focus(), 250);
}

async function deleteExercise(ex, sheet, after) {
  const logs = (await entries.byType('exercise')).filter((e) => e.data.exerciseId === ex.id);
  const ok = await confirmDialog(
    `„${ex.name}“ und ${logs.length} Einträge endgültig löschen? Tipp: „Archivieren“ behält den Verlauf.`,
    { okLabel: 'Endgültig löschen', danger: true });
  if (!ok) return;
  for (const l of logs) await entries.delete(l.id);
  await items.delete(ex.id);
  sheet.close();
  toast('Übung gelöscht');
  after();
}

async function openTemplates(after) {
  const existing = new Set((await items.all('exercise')).map((e) => e.name.toLowerCase()));
  const options = TEMPLATES.filter((t) => !existing.has(t.name.toLowerCase())).map((t) => ({ t, cb: checkbox(`${t.name} · ${targetText(t)}`) }));
  const sheet = openSheet({
    title: 'Vorlagen: Krafttraining',
    body: options.length
      ? [h('p', { class: 'muted small' }, 'Wähle Übungen aus. Die Tage legst du danach in der Übung fest.'), ...options.map((o) => o.cb)]
      : h('p', { class: 'muted' }, 'Alle Vorlagen sind bereits angelegt.'),
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const chosen = options.filter((o) => o.cb.input.checked);
          for (const { t } of chosen) await items.put({ kind: 'exercise', days: [], trackPain: false, notes: '', archived: false, ...t });
          sheet.close();
          if (chosen.length) toast(`${chosen.length} Übungen angelegt`);
          after();
        },
      }, 'Hinzufügen'),
    ],
  });
}

function openPicker(date, data, after) {
  const done = new Set(data.get(date, 'exercise').map((e) => e.data.exerciseId));
  const list = activeExercises(data.exercises).filter((e) => !done.has(e.id));
  const sheet = openSheet({
    title: 'Übung eintragen',
    body: list.length
      ? h('div', { class: 'list' }, list.map((ex) => h('button', {
        class: 'list-item',
        onclick: () => { sheet.close(); openLogSheet(ex, date, null, after); },
      }, h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, ex.name), h('span', { class: 'list-sub' }, targetText(ex))),
        h('span', { class: 'tag', dataset: { cat: ex.category } }, catLabel(ex.category)))))
      : h('p', { class: 'muted' }, 'Keine weiteren Übungen vorhanden.'),
  });
}

// ---------- Darstellung ----------
function exerciseRow(ex, date, data, after) {
  const log = logFor(data, date, ex.id);
  return h('div', { class: 'ex-row' + (log ? ' done' : '') },
    h('button', {
      class: 'check' + (log ? ' done' : ''), 'aria-label': log ? 'Als nicht erledigt markieren' : 'Als erledigt markieren',
      onclick: () => quickToggle(ex, date, log, after),
    }, icon('check', 18)),
    h('button', { class: 'ex-body', onclick: () => openLogSheet(ex, date, log, after) },
      h('div', { class: 'ex-name' }, ex.name),
      h('div', { class: 'ex-sub' }, log
        ? setsText(ex, log.data) + (log.data.pain != null ? ` · Beschwerden ${log.data.pain}/10` : '')
        : targetText(ex))),
    h('span', { class: 'tag', dataset: { cat: ex.category } }, catLabel(ex.category)));
}

function groupByCategory(list) {
  const groups = new Map();
  for (const ex of list) {
    if (!groups.has(ex.category)) groups.set(ex.category, []);
    groups.get(ex.category).push(ex);
  }
  return [...groups].sort((a, b) => catOrder(a[0]) - catOrder(b[0]));
}

async function render(el, ctx) {
  const view = ctx.query.v || 'tag';
  const data = await loadDays(ctx.date, ctx.date);
  const after = () => ctx.refresh();

  el.append(pageHeader('Training', {
    actions: h('button', { class: 'icon-btn', 'aria-label': 'Neue Übung', onclick: () => openExerciseEditor(null, after) }, icon('plus')),
  }));
  el.append(segmented(
    [{ value: 'tag', label: 'Tag' }, { value: 'plan', label: 'Wochenplan' }, { value: 'uebungen', label: 'Übungen' }],
    view, (v) => ctx.navigate('/training', { ...ctx.query, v: v === 'tag' ? undefined : v }, { replace: true })));

  const all = data.exercises;
  if (!all.length) {
    el.append(card(null, {}, emptyState('Noch keine Übungen angelegt. Trag deine Physioübungen ein oder starte mit Vorlagen fürs Krafttraining.',
      h('button', { class: 'btn btn-primary', onclick: () => openExerciseEditor(null, after) }, icon('plus', 18), 'Neue Übung'),
      h('button', { class: 'btn', onclick: () => openTemplates(after) }, 'Vorlagen'))));
    return;
  }

  if (view === 'plan') return renderPlan(el, all, after);
  if (view === 'uebungen') return renderLibrary(el, all, after);

  el.append(dateNav(ctx));
  const date = ctx.date;
  const planned = all.filter((ex) => isPlanned(ex, date)).sort(sortEx);
  if (planned.length) {
    for (const [cat, list] of groupByCategory(planned)) {
      const done = list.filter((ex) => logFor(data, date, ex.id)).length;
      el.append(card(`${catLabel(cat)} · ${done}/${list.length}`, { iconName: cat === 'physio' ? 'heart' : 'dumbbell' },
        h('div', null, list.map((ex) => exerciseRow(ex, date, data, after)))));
    }
  } else {
    el.append(card(null, {}, h('p', { class: 'muted' }, `Für ${WEEKDAYS_LONG[weekday(date)]} ist nichts eingeplant.`)));
  }
  const plannedIds = new Set(planned.map((e) => e.id));
  const extra = data.get(date, 'exercise').filter((l) => !plannedIds.has(l.data.exerciseId));
  if (extra.length) {
    el.append(card('Zusätzlich erledigt', { iconName: 'plus' },
      h('div', null, extra.map((l) => {
        const ex = all.find((e) => e.id === l.data.exerciseId);
        return ex ? exerciseRow(ex, date, data, after) : null;
      }))));
  }
  el.append(h('button', { class: 'btn block', onclick: () => openPicker(date, data, after) }, icon('plus', 18), 'Andere Übung eintragen'));
}

function renderPlan(el, all, after) {
  const active = activeExercises(all);
  const wd = weekday(today());
  el.append(card('Wochenplan', { iconName: 'calendar' },
    h('p', { class: 'muted small' }, 'Tippe auf eine Übung, um ihre Tage zu ändern.'),
    h('div', null, WEEKDAYS_SHORT.map((d, i) => {
      const list = active.filter((ex) => (ex.days || []).includes(i));
      return h('div', { class: 'week-row' + (i === wd ? ' today' : '') },
        h('div', { class: 'week-day' }, d),
        h('div', { class: 'chips' }, list.length
          ? list.map((ex) => h('button', { class: 'chip', dataset: { cat: ex.category }, onclick: () => openExerciseEditor(ex, after) }, ex.name))
          : h('span', { class: 'muted small', style: { paddingTop: '8px' } }, 'Ruhetag')));
    }))));
}

function renderLibrary(el, all, after) {
  el.append(h('div', { class: 'btn-row' },
    h('button', { class: 'btn btn-primary', onclick: () => openExerciseEditor(null, after) }, icon('plus', 18), 'Neue Übung'),
    h('button', { class: 'btn', onclick: () => openTemplates(after) }, 'Vorlagen')));
  const row = (ex) => h('button', { class: 'list-item', onclick: () => openExerciseEditor(ex, after) },
    h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, ex.name), h('span', { class: 'list-sub' }, `${targetText(ex)} · ${daysText(ex.days)}`)),
    icon('edit', 18));
  for (const [cat, list] of groupByCategory(activeExercises(all))) {
    el.append(card(catLabel(cat), { iconName: cat === 'physio' ? 'heart' : 'dumbbell' }, h('div', { class: 'list' }, list.map(row))));
  }
  const archived = all.filter((e) => e.archived).sort(sortEx);
  if (archived.length) el.append(sectionTitle('Archiviert'), card(null, {}, h('div', { class: 'list' }, archived.map(row))));
}

// ---------- Startseite, Ziele, Zusammenfassung, Diagramme ----------
function todayCard(date, data, ctx) {
  const planned = data.exercises.filter((ex) => isPlanned(ex, date)).sort(sortEx);
  if (!planned.length) return null;
  const done = planned.filter((ex) => logFor(data, date, ex.id)).length;
  return card(`Training · ${done}/${planned.length}`, {
    iconName: 'dumbbell',
    actions: h('a', { class: 'link', href: `#/training${date !== today() ? '?d=' + date : ''}` }, 'Öffnen'),
  }, h('div', null, planned.map((ex) => exerciseRow(ex, date, data, () => ctx.refresh()))));
}

function goals(date, data) {
  const planned = data.exercises.filter((ex) => isPlanned(ex, date));
  return groupByCategory(planned).map(([cat, list]) => {
    const done = list.filter((ex) => logFor(data, date, ex.id)).length;
    return {
      id: 'training:' + cat, label: catLabel(cat), detail: `${done}/${list.length} Übungen`,
      done: done === list.length, progress: done / list.length, route: '/training',
    };
  });
}

function summarizeDay(date, data) {
  return data.get(date, 'exercise').map((l) => {
    const ex = data.exercises.find((e) => e.id === l.data.exerciseId);
    return `${ex?.name || 'Übung'}: ${setsText(ex, l.data)}${l.data.pain != null ? ` · Beschwerden ${l.data.pain}/10` : ''}`;
  });
}

const charts = [
  {
    id: 'training-weeks',
    title: 'Trainingstage pro Woche',
    render(el, { from, to, data }) {
      const weeks = new Map();
      for (const k of dayRange(startOfWeek(from), to)) {
        const w = startOfWeek(k);
        if (!weeks.has(w)) weeks.set(w, 0);
        if (k >= from && data.get(k, 'exercise').length) weeks.set(w, weeks.get(w) + 1);
      }
      el.append(barChart([...weeks].map(([key, value]) => ({ key, value })), { hit: (v) => v >= 3, label: 'Trainingstage pro Woche' }));
    },
  },
  {
    id: 'training-strength',
    title: 'Kraftentwicklung (schwerster Satz)',
    render(el, { from, to, data }) {
      const weighted = activeExercises(data.exercises).filter((e) => e.weighted);
      if (!weighted.length) { el.append(emptyChart('Noch keine Übungen mit Gewicht')); return; }
      const box = h('div');
      const sel = select(weighted.map((e) => ({ value: e.id, label: e.name })), weighted[0].id);
      const draw = () => {
        const pts = [];
        for (const [date, d] of data.byDay) {
          if (date < from || date > to) continue;
          for (const l of d.exercise || []) {
            if (l.data.exerciseId !== sel.value) continue;
            const max = Math.max(...(l.data.sets || []).map((st) => st.weight ?? -Infinity));
            if (Number.isFinite(max)) pts.push({ key: date, value: max });
          }
        }
        box.replaceChildren(lineChart(pts, { from, to, color: 'var(--c-kraft)', label: 'Gewicht in kg' }));
      };
      sel.addEventListener('change', draw);
      draw();
      el.append(sel, box);
    },
  },
  {
    id: 'training-pain',
    title: 'Beschwerden (Ø pro Tag, 0–10)',
    render(el, { from, to, data }) {
      const pts = [];
      for (const [date, d] of data.byDay) {
        if (date < from || date > to) continue;
        const vals = (d.exercise || []).map((l) => l.data.pain).filter((v) => v != null);
        if (vals.length) pts.push({ key: date, value: vals.reduce((a, b) => a + b, 0) / vals.length });
      }
      el.append(pts.length ? lineChart(pts, { from, to, color: 'var(--c-physio)', avgDays: 7, label: 'Beschwerden' }) : emptyChart('Noch keine Beschwerden erfasst'));
    },
  },
];

registerModule({
  id: 'training',
  area: 'fitness',
  title: 'Training',
  description: 'Physio, Krafttraining & Wochenplan',
  order: 20,
  nav: { tab: 2, label: 'Training', icon: 'dumbbell' },
  routes: [{ path: '/training', render }],
  todayCard, goals, summarizeDay, charts,
});
