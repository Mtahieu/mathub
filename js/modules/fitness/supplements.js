// Nahrungsergänzungsmittel: Arsenal, Einnahmeplan, tägliches Abhaken, Kombi-Check und Wissen.
//
// items   kind 'supplement': {catalogId?, name, dose, slot, days:[0–6], mode:'plan'|'bedarf'}
// entries type 'supplements' (1 pro Tag): data {taken: {itemId: Zeitstempel}}
// Wissen & Kombinationsregeln: supplement-data.js

import { registerModule } from '../../core/registry.js';
import { items, entries } from '../../core/db.js';
import { getSettingsSync } from '../../core/settings.js';
import {
  h, icon, card, dateNav, pageHeader, segmented, openSheet, toast, field, textInput, select, confirmDialog, emptyState, sectionTitle,
} from '../../core/ui.js';
import { today, weekday, WEEKDAYS_SHORT, startOfWeek, dayRange, keyFromTs } from '../../core/dates.js';
import { barChart } from '../../core/charts.js';
import { SUPPLEMENTS, SLOTS, EVIDENCE, supplementById, analyzeCombo } from './supplement-data.js';

const WORKDAYS = [0, 1, 2, 3, 4];
const ALLDAYS = [0, 1, 2, 3, 4, 5, 6];
const fasting = () => getSettingsSync().prefs.food?.fasting !== false;

// ---------- Daten ----------
const loadArsenal = async () => (await items.all('supplement')).sort((a, b) =>
  (SLOTS[a.slot]?.order ?? 9) - (SLOTS[b.slot]?.order ?? 9) || a.name.localeCompare(b.name, 'de'));

const plannedOn = (it, date) => it.mode !== 'bedarf' && (it.days || []).includes(weekday(date)) && (!it.createdAt || keyFromTs(it.createdAt) <= date);
const info = (it) => supplementById(it.catalogId);
const emojiOf = (it) => info(it)?.emoji || '💊';

function daysLabel(it) {
  if (it.mode === 'bedarf') return 'bei Bedarf';
  const d = [...(it.days || [])].sort();
  if (d.length === 7) return 'täglich';
  if (d.join() === WORKDAYS.join()) return 'werktags';
  return d.length ? d.map((i) => WEEKDAYS_SHORT[i]).join(', ') : 'pausiert';
}

async function toggleTaken(date, itemId, on) {
  const e = await entries.daily('supplements', date);
  const taken = { ...(e?.data.taken || {}) };
  if (on) taken[itemId] = Date.now(); else delete taken[itemId];
  if (Object.keys(taken).length) await entries.saveDaily('supplements', date, { taken });
  else if (e) await entries.delete(e.id);
}

// ---------- Bausteine ----------
function evidenceBadge(level) {
  const e = EVIDENCE[level];
  return h('span', { class: `ev ${e.cls}` }, e.label);
}

function takeRow(it, date, takenMap, after) {
  const done = !!takenMap[it.id];
  return h('div', { class: 'ex-row' + (done ? ' done' : '') },
    h('button', {
      class: 'check' + (done ? ' done' : ''), 'aria-label': done ? 'Als nicht genommen markieren' : 'Als genommen markieren',
      onclick: async () => { await toggleTaken(date, it.id, !done); after(); },
    }, icon('check', 18)),
    h('button', { class: 'ex-body', onclick: () => openInfo(it.catalogId, it) },
      h('div', { class: 'ex-name' }, `${emojiOf(it)} ${it.name}`),
      h('div', { class: 'ex-sub' }, [it.dose, it.mode === 'bedarf' ? 'bei Bedarf' : null].filter(Boolean).join(' · ') || SLOTS[it.slot]?.label)));
}

function dayChecklist(arsenal, date, taken, after, { compact = false } = {}) {
  const planned = arsenal.filter((it) => plannedOn(it, date));
  const extra = arsenal.filter((it) => !plannedOn(it, date) && taken[it.id]);
  const shown = [...planned, ...extra];
  const groups = Object.entries(SLOTS).map(([k, s]) => ({ k, s, list: shown.filter((it) => it.slot === k) })).filter((g) => g.list.length);
  const optional = arsenal.filter((it) => !plannedOn(it, date) && !taken[it.id]);
  return [
    groups.length ? groups.map((g) => h('div', { class: 'supp-group' },
      h('div', { class: 'supp-slot' }, g.s.label),
      g.list.map((it) => takeRow(it, date, taken, after))))
      : h('p', { class: 'muted small' }, 'Heute ist nichts eingeplant.'),
    optional.length ? h('div', { class: 'supp-extra' },
      h('span', { class: 'small muted' }, compact ? 'Zusätzlich:' : 'Zusätzlich genommen?'),
      h('div', { class: 'chips' }, optional.map((it) => h('button', {
        type: 'button', class: 'chip', onclick: async () => { await toggleTaken(date, it.id, true); toast(`${it.name} eingetragen`); after(); },
      }, `${emojiOf(it)} ${it.name}`)))) : null,
  ];
}

// ---------- Sheets ----------
function openInfo(catalogId, own) {
  const s = supplementById(catalogId);
  if (!s) {
    openSheet({ title: own?.name || 'Supplement', body: h('p', { class: 'muted' }, 'Eigenes Mittel – keine hinterlegten Informationen.') });
    return;
  }
  openSheet({
    title: `${s.emoji} ${s.name}`,
    body: [
      h('div', { class: 'chips' }, evidenceBadge(s.evidence), h('span', { class: 'tag' }, SLOTS[s.slot].label), s.suggestion ? h('span', { class: 'tag' }, `Tipp: ${s.suggestion}`) : null),
      h('p', null, s.effect),
      field('Dosierung', h('p', { class: 'small' }, s.dose)),
      field('Einnahme', h('p', { class: 'small' }, s.timing)),
      field('Beachten', h('ul', { class: 'caution-list' }, s.cautions.map((c) => h('li', null, c)))),
      h('p', { class: 'muted small' }, 'Allgemeine Information, keine medizinische Beratung. Bei Erkrankungen oder Medikamenten Arzt oder Apotheke fragen.'),
    ],
  });
}

function openEditor(it, after, preset) {
  const isNew = !it?.id;
  const base = preset ? supplementById(preset) : info(it);
  const st = {
    name: it?.name || base?.name || '', dose: it?.dose || '', slot: it?.slot || base?.slot || 'flexibel',
    mode: it?.mode || 'plan', days: [...(it?.days || WORKDAYS)],
  };
  const name = textInput({ value: st.name, placeholder: 'Name', maxlength: 60 });
  const dose = textInput({ value: st.dose, placeholder: 'z. B. 1 Kapsel, 200 mg', maxlength: 60 });
  const slot = select(Object.entries(SLOTS).map(([k, s]) => ({ value: k, label: s.label })), st.slot);
  const daysBox = h('div', { class: 'stack' });
  const render = () => daysBox.replaceChildren(
    segmented([{ value: 'werktags', label: 'Werktags' }, { value: 'taeglich', label: 'Täglich' }, { value: 'eigene', label: 'Eigene' }, { value: 'bedarf', label: 'Bei Bedarf' }],
      st.mode === 'bedarf' ? 'bedarf' : st.days.length === 7 ? 'taeglich' : st.days.join() === WORKDAYS.join() ? 'werktags' : 'eigene',
      (v) => {
        if (v === 'bedarf') st.mode = 'bedarf';
        else { st.mode = 'plan'; if (v === 'werktags') st.days = [...WORKDAYS]; if (v === 'taeglich') st.days = [...ALLDAYS]; }
        render();
      }),
    st.mode === 'plan' ? h('div', { class: 'chips' }, WEEKDAYS_SHORT.map((d, i) => h('button', {
      type: 'button', class: 'chip' + (st.days.includes(i) ? ' active' : ''),
      onclick: () => { st.days = st.days.includes(i) ? st.days.filter((x) => x !== i) : [...st.days, i].sort(); render(); },
    }, d))) : h('p', { class: 'muted small' }, 'Nicht eingeplant – auf „Heute“ mit einem Tipp als genommen eintragen.'));
  render();
  const sheet = openSheet({
    title: isNew ? `${base?.emoji || '💊'} Hinzufügen` : `${emojiOf(it)} Bearbeiten`,
    body: [
      field('Name', name),
      field('Dosis (optional)', dose, base ? `Richtwert: ${base.dose}` : null),
      field('Zeitpunkt', slot, base ? base.timing : null),
      field('Wann', daysBox),
    ],
    footer: [
      isNew ? h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen')
        : h('button', {
          class: 'btn btn-danger',
          onclick: async () => {
            if (!await confirmDialog(`${it.name} aus dem Arsenal entfernen? Bisherige Einträge bleiben erhalten.`, { okLabel: 'Entfernen', danger: true })) return;
            await items.delete(it.id); sheet.close(); after();
          },
        }, 'Entfernen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const n = name.value.trim();
          if (!n) { toast('Bitte einen Namen eingeben'); return; }
          await items.put({ ...(it || {}), kind: 'supplement', catalogId: it?.catalogId || preset || null, name: n, dose: dose.value.trim(), slot: slot.value, mode: st.mode, days: st.days });
          sheet.close(); toast('Gespeichert'); after();
        },
      }, 'Speichern'),
    ],
  });
}

function openQuickSetup(arsenal, after) {
  const have = new Set(arsenal.map((it) => it.catalogId));
  const choice = {};
  const rows = SUPPLEMENTS.filter((s) => !have.has(s.id)).map((s) => h('div', { class: 'setup-row' },
    h('div', { class: 'setup-name' }, h('span', null, s.emoji), h('span', null, s.name), s.suggestion ? h('span', { class: 'tag' }, s.suggestion) : null),
    segmented([{ value: '', label: '–' }, { value: 'werktags', label: 'Werktags' }, { value: 'taeglich', label: 'Täglich' }, { value: 'bedarf', label: 'Bedarf' }], '',
      (v) => { choice[s.id] = v; })));
  const sheet = openSheet({
    title: 'Arsenal einrichten',
    body: [h('p', { class: 'small muted' }, 'Wähle für jedes Mittel, wann du es nimmst. Zeitpunkt und Dosis kannst du danach anpassen.'), ...rows],
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          let n = 0;
          for (const [id, v] of Object.entries(choice)) {
            if (!v) continue;
            const s = supplementById(id);
            await items.put({
              kind: 'supplement', catalogId: id, name: s.name, dose: '', slot: s.slot,
              mode: v === 'bedarf' ? 'bedarf' : 'plan', days: v === 'taeglich' ? [...ALLDAYS] : [...WORKDAYS],
            });
            n++;
          }
          sheet.close(); if (n) toast(`${n} Mittel hinzugefügt`); after();
        },
      }, 'Übernehmen'),
    ],
  });
}

// ---------- Ansichten ----------
async function renderToday(el, ctx, arsenal) {
  const date = ctx.date;
  const after = () => ctx.refresh();
  el.append(dateNav(ctx));
  if (!arsenal.length) {
    el.append(card(null, {}, emptyState('Noch kein Arsenal angelegt. Wähle deine Mittel aus – dann erscheinen sie hier zum Abhaken.',
      h('button', { class: 'btn btn-primary', onclick: () => openQuickSetup(arsenal, after) }, 'Arsenal einrichten'))));
    return;
  }
  const taken = (await entries.daily('supplements', date))?.data.taken || {};
  el.append(card('Einnahme', { iconName: 'pill' }, dayChecklist(arsenal, date, taken, after)));
  const todayIds = arsenal.filter((it) => plannedOn(it, date) || taken[it.id]).map((it) => it.catalogId).filter(Boolean);
  if (todayIds.length > 1) {
    const a = analyzeCombo(todayIds, { fasting: fasting() });
    if (a.pairs.length) el.append(card('Heute beachten', { iconName: 'info' }, pairList(a.pairs)));
  }
}

function pairList(pairs) {
  const icons = { good: '✅', timing: '⏱️', warn: '⚠️', info: 'ℹ️' };
  return h('div', { class: 'pair-list' }, pairs.map((p) => h('div', { class: `pair pair-${p.type}` },
    h('span', { class: 'pair-ic' }, icons[p.type]),
    h('div', null,
      p.a ? h('strong', null, `${supplementById(p.a).name} + ${supplementById(p.b).name}`) : null,
      h('div', { class: 'small' }, p.text)))));
}

function renderArsenal(el, ctx, arsenal) {
  const after = () => ctx.refresh();
  el.append(h('div', { class: 'btn-row' },
    h('button', { class: 'btn btn-primary', onclick: () => openQuickSetup(arsenal, after) }, icon('plus', 18), 'Aus Katalog'),
    h('button', { class: 'btn', onclick: () => openEditor(null, after) }, 'Eigenes Mittel')));
  if (!arsenal.length) { el.append(card(null, {}, h('p', { class: 'muted' }, 'Dein Arsenal ist leer.'))); return; }
  const planned = arsenal.filter((it) => it.mode !== 'bedarf');
  const optional = arsenal.filter((it) => it.mode === 'bedarf');
  const row = (it) => h('button', { class: 'list-item', onclick: () => openEditor(it, after) },
    h('span', { class: 'li-emoji' }, emojiOf(it)),
    h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, it.name),
      h('span', { class: 'list-sub' }, [SLOTS[it.slot]?.label, daysLabel(it), it.dose].filter(Boolean).join(' · '))),
    info(it) ? evidenceBadge(info(it).evidence) : null,
    icon('edit', 18));
  if (planned.length) el.append(card('Eingeplant', { iconName: 'calendar' }, h('div', { class: 'list' }, planned.map(row))));
  if (optional.length) el.append(card('Im Arsenal (bei Bedarf)', { iconName: 'pill' }, h('div', { class: 'list' }, optional.map(row))));
  el.append(h('p', { class: 'muted small center' }, 'Tippe auf ein Mittel, um Tage, Zeitpunkt oder Dosis zu ändern.'));
}

function renderCombo(el, ctx, arsenal) {
  const own = arsenal.map((it) => it.catalogId).filter(Boolean);
  const initial = ctx.query.k ? ctx.query.k.split(',') : arsenal.filter((it) => plannedOn(it, today())).map((it) => it.catalogId).filter(Boolean);
  let sel = new Set(initial);
  const box = h('div', { class: 'stack' });
  const chips = h('div', { class: 'chips' });
  const renderChips = () => chips.replaceChildren(...SUPPLEMENTS.map((s) => h('button', {
    type: 'button', class: 'chip' + (sel.has(s.id) ? ' active' : '') + (own.includes(s.id) ? '' : ' faint'),
    onclick: () => { sel.has(s.id) ? sel.delete(s.id) : sel.add(s.id); renderChips(); renderResult(); },
  }, `${s.emoji} ${s.name}`)));
  const renderResult = () => {
    const a = analyzeCombo([...sel], { fasting: fasting() });
    if (!a.list.length) { box.replaceChildren(card(null, {}, h('p', { class: 'muted' }, 'Wähle oben Mittel aus, um die Kombination zu prüfen.'))); return; }
    box.replaceChildren(
      card('Wirkung der Kombi', { iconName: 'heart' },
        h('div', { class: 'effect-list' }, a.effects.map((e) => h('div', { class: 'effect' }, h('strong', null, e.area), h('span', { class: 'small muted' }, e.names.join(', '))))),
        h('div', { class: 'list' }, a.list.map((s) => h('button', { class: 'list-item', onclick: () => openInfo(s.id) },
          h('span', { class: 'li-emoji' }, s.emoji),
          h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, s.name), h('span', { class: 'list-sub clamp' }, s.effect)),
          evidenceBadge(s.evidence))))),
      card('Vorschlag Zeitplan', { iconName: 'calendar' },
        Object.entries(SLOTS).filter(([k]) => a.schedule[k]).map(([k, sl]) => h('div', { class: 'sched-row' },
          h('span', { class: 'supp-slot' }, k === 'nuechtern' && fasting() ? 'Vor dem Fastenbrechen' : k === 'mahlzeit' && fasting() ? 'Zur 1. Mahlzeit' : sl.label),
          h('span', null, a.schedule[k].map((s) => `${s.emoji} ${s.name}`).join(' · '))))),
      a.pairs.length ? card('Zusammen nehmen?', { iconName: 'info' }, pairList(a.pairs)) : null,
      a.notes.length ? card('Hinweise', { iconName: 'shield' }, pairList(a.notes)) : null,
    );
  };
  renderChips(); renderResult();
  el.append(card('Kombi zusammenstellen', { iconName: 'pill' },
    h('p', { class: 'small muted' }, 'Tippe Mittel an oder ab – Wirkung, Zeitplan und Hinweise passen sich an. Blasse Mittel sind (noch) nicht in deinem Arsenal.'),
    chips));
  el.append(box);
}

function renderKnowledge(el) {
  const block = (title, iconName, list) => card(title, { iconName }, h('div', { class: 'list' }, list.map((s) => h('button', { class: 'list-item', onclick: () => openInfo(s.id) },
    h('span', { class: 'li-emoji' }, s.emoji),
    h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, s.name), h('span', { class: 'list-sub clamp' }, s.effect)),
    evidenceBadge(s.evidence)))));
  el.append(card('Einordnung', { iconName: 'info' },
    h('p', { class: 'small' }, 'Nahrungsergänzung ersetzt keine ausgewogene Ernährung; ein Nutzen ist meist nur bei Mangel oder bestimmten Zielen belegt. Für Deutschland empfiehlt das BfR Höchstmengen pro Tag aus Nahrungsergänzung (z. B. Magnesium 250 mg, Zink 6,5 mg, Vitamin D 20 µg).'),
    h('p', { class: 'muted small' }, 'Allgemeine Informationen, keine medizinische Beratung.')));
  el.append(sectionTitle('Empfehlenswert für deine Ziele'));
  el.append(block('Gut begründet bei Muskelaufbau & pflanzenbetonter Ernährung', 'trophy',
    ['kreatin', 'b12', 'omega3', 'vitd', 'magnesium'].map(supplementById)));
  el.append(sectionTitle('Eher verzichtbar oder mit Vorsicht'));
  el.append(block('Ohne Mangel kaum Nutzen / Risiken beachten', 'shield', ['biotin', 'zink', 'ala'].map(supplementById)));
  el.append(card('Was eher nicht empfohlen wird', { iconName: 'info' },
    h('ul', { class: 'caution-list' },
      h('li', null, 'Biotin hochdosiert „für Haare“ ohne Mangel – kaum Nutzen, dafür verfälschte Laborwerte.'),
      h('li', null, 'Zink dauerhaft über 6,5 mg/Tag aus Präparaten – Risiko für Kupfermangel.'),
      h('li', null, 'Magnesium über 250 mg/Tag aus Präparaten – häufig Durchfall.'),
      h('li', null, 'Alpha-Liponsäure ohne medizinischen Grund – geringe Effekte; bei Diabetes-Medikamenten nur nach Rücksprache.'),
      h('li', null, 'Omega-3 hochdosiert über 1,5 g/Tag ohne ärztlichen Rat.'))));
  el.append(block('Alle Mittel im Katalog', 'list', SUPPLEMENTS));
}

async function render(el, ctx) {
  const view = ctx.query.v || 'heute';
  const arsenal = await loadArsenal();
  el.append(pageHeader('Supplements'));
  el.append(segmented([{ value: 'heute', label: 'Heute' }, { value: 'arsenal', label: 'Arsenal' }, { value: 'kombi', label: 'Kombi' }, { value: 'wissen', label: 'Wissen' }],
    view, (v) => ctx.navigate('/supplements', { v: v === 'heute' ? undefined : v, d: ctx.query.d }, { replace: true })));
  if (view === 'arsenal') return renderArsenal(el, ctx, arsenal);
  if (view === 'kombi') return renderCombo(el, ctx, arsenal);
  if (view === 'wissen') return renderKnowledge(el);
  return renderToday(el, ctx, arsenal);
}

// ---------- Startseite, Ziele, Erinnerungen, Diagramme ----------
async function todayCard(date, data, ctx) {
  const arsenal = await loadArsenal();
  if (!arsenal.length) return null;
  const taken = data.first(date, 'supplements')?.data.taken || {};
  const planned = arsenal.filter((it) => plannedOn(it, date));
  const done = planned.filter((it) => taken[it.id]).length;
  return card(planned.length ? `Supplements · ${done}/${planned.length}` : 'Supplements', {
    iconName: 'pill', actions: h('a', { class: 'link', href: '#/supplements' }, 'Details'),
  }, dayChecklist(arsenal, date, taken, () => ctx.refresh(), { compact: true }));
}

function goals(date, data) {
  const planned = data.itemsOf('supplement').filter((it) => plannedOn(it, date));
  if (!planned.length) return [];
  const taken = data.first(date, 'supplements')?.data.taken || {};
  const done = planned.filter((it) => taken[it.id]).length;
  return [{ id: 'supplements', label: 'Supplements', detail: `${done}/${planned.length} genommen`, done: done === planned.length, progress: done / planned.length, route: '/supplements' }];
}

function summarizeDay(date, data) {
  const taken = data.first(date, 'supplements')?.data.taken;
  if (!taken) return [];
  const names = data.itemsOf('supplement').filter((it) => taken[it.id]).map((it) => it.name);
  return names.length ? [`💊 ${names.join(', ')}`] : [];
}

async function reminderNote(slot, date) {
  const arsenal = await loadArsenal();
  const planned = arsenal.filter((it) => plannedOn(it, date));
  if (!planned.length) return null;
  const taken = (await entries.daily('supplements', date))?.data.taken || {};
  if (slot === 'morgen') {
    const groups = Object.entries(SLOTS).map(([k, s]) => [s.short, planned.filter((it) => it.slot === k)]).filter(([, l]) => l.length);
    return '💊 ' + groups.map(([lbl, l]) => `${lbl}: ${l.map((it) => it.name).join(', ')}`).join(' · ');
  }
  const open = planned.filter((it) => !taken[it.id]);
  return open.length ? `💊 Noch offen: ${open.map((it) => it.name).join(', ')}` : null;
}

const charts = [{
  id: 'supplements-week', title: 'Supplements: Tage komplett pro Woche',
  async render(el, { from, to, data }) {
    const arsenal = await loadArsenal();
    if (!arsenal.some((it) => it.mode !== 'bedarf')) { el.append(h('div', { class: 'chart-empty' }, 'Noch keine eingeplanten Supplements')); return; }
    const weeks = new Map();
    for (const k of dayRange(startOfWeek(from), to)) {
      const w = startOfWeek(k);
      if (!weeks.has(w)) weeks.set(w, 0);
      const planned = arsenal.filter((it) => plannedOn(it, k));
      if (!planned.length || k < from) continue;
      const taken = data.first(k, 'supplements')?.data.taken || {};
      if (planned.every((it) => taken[it.id])) weeks.set(w, weeks.get(w) + 1);
    }
    el.append(barChart([...weeks].map(([key, value]) => ({ key, value })), { hit: (v) => v >= 5, label: 'Tage komplett' }));
  },
}];

registerModule({
  id: 'supplements',
  area: 'fitness',
  title: 'Supplements',
  description: 'Nahrungsergänzung: Plan, Abhaken, Kombi-Check & Wissen',
  order: 33,
  nav: { more: 3, icon: 'pill' },
  routes: [{ path: '/supplements', render }],
  todayCard, goals, summarizeDay, reminderNote, charts,
});

