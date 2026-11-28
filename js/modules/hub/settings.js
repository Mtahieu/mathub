// Einstellungen: Design, Profil, Kochen-Ziele (+ Richtwert-Rechner), Erinnerungen, Daten, Über.

import { registerModule } from '../../core/registry.js';
import { entries, clearAll } from '../../core/db.js';
import { getSettingsSync, updateSettings } from '../../core/settings.js';
import {
  h, icon, card, pageHeader, field, numInput, intInput, readNum, textInput, select, checkbox, toast, confirmDialog,
  openSheet, withUnit, fmt, fmtInt, segmented,
} from '../../core/ui.js';
import { checkForUpdate } from '../../core/update.js';
import { pushSupported, pushState, enablePush, disablePush, testNotification, REPO_SECRET_URL, WORKFLOW_URL } from '../../core/push.js';
import { APP_VERSION } from '../../version.js';
import { PRESETS, SHAPES, FONTS, DEFAULT_DESIGN, designVars } from '../../core/theme.js';
import { keyFromTs, formatDate } from '../../core/dates.js';

const ACTIVITY = [
  { value: 1.2, label: 'Überwiegend sitzend' },
  { value: 1.375, label: 'Leicht aktiv (1–3× Sport/Woche)' },
  { value: 1.55, label: 'Mäßig aktiv (3–5× Sport/Woche)' },
  { value: 1.725, label: 'Sehr aktiv (6–7× Sport/Woche)' },
];

/** Gewicht fürs Profil – sonst der letzte Eintrag aus der früheren Körperwerte-Funktion. */
async function latestWeight() {
  const own = getSettingsSync().profile.weightKg;
  if (own) return own;
  const list = (await entries.byType('body')).filter((e) => e.data.weight != null).sort((a, b) => (a.date < b.date ? 1 : -1));
  return list[0]?.data.weight ?? null;
}

// ---------- Design ----------
function designCard() {
  const s = getSettingsSync();
  let d = { ...DEFAULT_DESIGN, ...(s.prefs.design || {}) };
  const save = async (patch) => { d = { ...d, ...patch }; await updateSettings({ prefs: { design: d } }); draw(); };
  const box = h('div', { class: 'design' });
  const swatch = (key, p) => {
    const v = designVars({ ...d, preset: key, accent: null }, 'dark');
    return h('button', {
      type: 'button', class: 'swatch' + (d.preset === key && !d.accent ? ' active' : ''), 'aria-label': `Farbschema ${p.label}`,
      onclick: () => save({ preset: key, accent: null }),
    },
    h('span', { class: 'swatch-prev', style: `background:${v['--bg']}` },
      h('i', { style: `background:${v['--surface-2']}` }), h('b', { style: `background:${p.accent}` })),
    h('span', { class: 'swatch-label' }, p.label));
  };
  const draw = () => {
    const color = h('input', { type: 'color', class: 'color-input', value: d.accent || PRESETS[d.preset]?.accent || '#3ddc97' });
    color.addEventListener('input', () => { document.documentElement.style.setProperty('--accent', color.value); });
    color.addEventListener('change', () => save({ accent: color.value }));
    const p = PRESETS[d.preset] || PRESETS.mint;
    box.replaceChildren(
      field('Hell oder dunkel', segmented([{ value: 'dark', label: 'Dunkel' }, { value: 'light', label: 'Hell' }, { value: 'system', label: 'System' }], getSettingsSync().prefs.theme,
        async (v) => { await updateSettings({ prefs: { theme: v } }); })),
      field('Farbschema', h('div', { class: 'swatches' }, Object.entries(PRESETS).map(([k, x]) => swatch(k, x))),
        d.accent ? 'Eigene Farbe aktiv – tippe ein Schema an, um zurückzuwechseln.' : p.note),
      field('Eigene Akzentfarbe', h('div', { class: 'color-row' }, color,
        h('span', { class: 'small muted' }, d.accent ? `Eigene Farbe ${d.accent.toUpperCase()}` : 'Tippen, um frei zu wählen'),
        d.accent ? h('button', { type: 'button', class: 'btn small', onclick: () => save({ accent: null }) }, 'Zurücksetzen') : null)),
      field('Form', segmented(Object.entries(SHAPES).map(([k, x]) => ({ value: k, label: x.label })), d.shape, (v) => save({ shape: v }))),
      field('Schrift', h('div', { class: 'chips' }, Object.entries(FONTS).map(([k, x]) => h('button', {
        type: 'button', class: 'chip' + (d.font === k ? ' active' : ''), style: `font-family:${x.stack}`, onclick: () => save({ font: k }),
      }, x.label)))),
      h('div', { class: 'design-preview' },
        h('strong', null, 'Vorschau'),
        h('p', { class: 'small muted' }, '“May the Force be with you.”'),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-primary small' }, 'Knopf'), h('span', { class: 'chip active' }, 'Auswahl'))),
      h('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => save({ ...DEFAULT_DESIGN }) }, 'Design zurücksetzen'));
  };
  draw();
  return card('Design', { iconName: 'star', cls: 'anchor-design' }, box);
}

/** Richtwert nach Mifflin-St Jeor; für Muskelaufbau +300 kcal, Protein 1,8 g/kg. */
function suggest({ weight, heightCm, age, sex, activity }) {
  if (!weight || !heightCm || !age || !sex) return null;
  const bmr = 10 * weight + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161);
  const tdee = bmr * activity;
  return { tdee, kcal: Math.round((tdee + 300) / 50) * 50, protein: Math.round((weight * 1.8) / 5) * 5 };
}

async function render(el, ctx) {
  const s = getSettingsSync();
  const saved = (msg = 'Gespeichert') => { toast(msg); ctx.refresh(); };
  el.append(pageHeader('Einstellungen', {
    actions: h('a', { class: 'icon-btn', href: '#/heute', 'aria-label': 'Zur Startseite' }, icon('x')),
  }));

  // ----- Design -----
  el.append(designCard());

  // ----- Profil -----
  const name = textInput({ value: s.profile.name, placeholder: 'Wie soll ich dich nennen?', maxlength: 40 });
  const weight = numInput({ value: s.profile.weightKg, placeholder: 'kg' });
  const height = intInput({ value: s.profile.heightCm, placeholder: 'cm' });
  const birth = intInput({ value: s.profile.birthYear, placeholder: 'z. B. 1995' });
  const sex = select([{ value: '', label: '–' }, { value: 'm', label: 'männlich' }, { value: 'w', label: 'weiblich' }], s.profile.sex);
  const activity = select(ACTIVITY, s.profile.activity);
  el.append(card('Profil', { iconName: 'home', cls: 'anchor-profil' },
    field('Name', name),
    h('div', { class: 'grid-2' }, field('Größe', withUnit(height, 'cm')), field('Geburtsjahr', birth)),
    field('Gewicht (für den Kalorien-Richtwert)', withUnit(weight, 'kg')),
    field('Geschlecht (für den Kalorien-Richtwert)', sex),
    field('Aktivität im Alltag', activity),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ profile: { name: name.value.trim(), heightCm: readNum(height), birthYear: readNum(birth), sex: sex.value, activity: Number(activity.value), weightKg: readNum(weight) } });
        saved();
      },
    }, 'Profil speichern')));

  // ----- Ziele -----
  const kcal = intInput({ value: s.targets.kcal, placeholder: 'kcal' });
  const protein = intInput({ value: s.targets.protein, placeholder: 'g' });
  const calcBox = h('div');
  const calc = async () => {
    const weight = await latestWeight();
    const age = s.profile.birthYear ? new Date().getFullYear() - s.profile.birthYear : null;
    const r = suggest({ weight, heightCm: s.profile.heightCm, age, sex: s.profile.sex, activity: s.profile.activity });
    if (!r) {
      calcBox.replaceChildren(h('p', { class: 'muted small' }, 'Für einen Vorschlag brauche ich Größe, Geburtsjahr, Geschlecht und Gewicht (Profil).'));
      return;
    }
    calcBox.replaceChildren(h('div', { class: 'banner' }, icon('info'),
      h('div', { style: { flex: 1 } },
        h('div', null, h('strong', null, `${fmtInt(r.kcal)} kcal · ${r.protein} g Protein`)),
        h('div', { class: 'small muted' }, `Erhaltungsbedarf ca. ${fmtInt(r.tdee)} kcal + 300 kcal für Muskelaufbau, 1,8 g Protein je kg (${fmt(weight)} kg). Grober Richtwert – passe ihn an deinen Verlauf an.`)),
      h('button', { class: 'btn small', onclick: () => { kcal.value = r.kcal; protein.value = r.protein; toast('Übernommen – bitte speichern'); } }, 'Übernehmen')));
  };
  el.append(card('Kochen: Kalorien & Protein', { iconName: 'food', cls: 'anchor-ziele' },
    h('div', { class: 'grid-2' },
      field('Kalorien pro Tag', withUnit(kcal, 'kcal')),
      field('Protein pro Tag', withUnit(protein, 'g'))),
    h('button', { class: 'btn btn-ghost small', onclick: calc }, icon('info', 18), 'Richtwert für Kalorien & Protein berechnen'),
    calcBox,
    h('p', { class: 'muted small' }, 'Der Wochenplan beim Kochen nutzt diese Werte als Richtwert (kein Tracking).'),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ targets: { kcal: readNum(kcal), protein: readNum(protein) } });
        saved();
      },
    }, 'Speichern')));

  // ----- Erinnerungen -----
  el.append(await reminderCard(ctx));

  // ----- Daten -----
  const persisted = await navigator.storage?.persisted?.().catch(() => false);
  const est = await navigator.storage?.estimate?.().catch(() => null);
  el.append(card('Daten', { iconName: 'shield', cls: 'anchor-daten' },
    h('p', { class: 'muted small' }, 'Filme sowie gegessene und bewertete Rezepte liegen in der gemeinsamen Liste (Filme → ☁️) und sind dort gesichert. Wochenplan, Einkaufsliste und Einstellungen gibt es nur auf diesem Gerät.'),
    h('div', { class: 'kv-list small' },
      h('div', null, h('span', { class: 'muted' }, 'Speicher geschützt'), h('span', null, persisted ? 'ja' : 'nein (App installieren hilft)')),
      est?.usage != null ? h('div', null, h('span', { class: 'muted' }, 'Belegt'), h('span', null, `${fmt(est.usage / 1024 / 1024, 1)} MB`)) : null),
    h('button', {
      class: 'btn btn-danger',
      onclick: async () => {
        if (!await confirmDialog('Alle Daten auf diesem Gerät werden gelöscht. Die gemeinsame Liste in Google Drive bleibt bestehen.', { okLabel: 'Alles löschen', danger: true })) return;
        await clearAll();
        location.reload();
      },
    }, icon('trash', 18), 'Alle Daten auf diesem Gerät löschen')));

  // ----- Über -----
  el.append(card('Über Mathub', { iconName: 'shield' },
    h('div', { class: 'kv-list small' },
      h('div', null, h('span', { class: 'muted' }, 'Version'), h('span', null, APP_VERSION))),
    h('button', {
      class: 'btn',
      onclick: async () => {
        const r = await checkForUpdate().catch(() => 'unsupported');
        toast(r === 'found' ? 'Update gefunden' : r === 'none' ? 'Du hast die neueste Version' : 'Update-Prüfung hier nicht möglich');
      },
    }, icon('refresh', 18), 'Nach Updates suchen')));

  const anchor = ctx.query.s;
  if (anchor) setTimeout(() => el.querySelector('.anchor-' + anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ---------- Erinnerungen ----------
const REMINDER_TIMES = '7:30 Uhr (Essen des Tages, Film für heute Abend) und 20:30 Uhr';

async function reminderCard(ctx) {
  const c = card('Erinnerungen (Push)', { iconName: 'bell', cls: 'anchor-push' });
  if (!pushSupported()) {
    c.append(h('p', { class: 'muted small' }, 'Dieser Browser unterstützt keine Push-Benachrichtigungen. Öffne Mathub in Chrome und installiere die App.'));
    return c;
  }
  const st = await pushState().catch(() => ({ status: 'off' }));
  const test = (slot) => async () => {
    try { await testNotification(slot); toast('Test-Benachrichtigung gesendet'); } catch (err) { toast(err.message); }
  };
  c.append(h('p', { class: 'muted small' }, `Mathub erinnert dich täglich um ${REMINDER_TIMES}. Der Text entsteht auf deinem Handy – ohne Plan gibt’s einen Spruch. GitHub sendet nur ein leeres Wecksignal.`));

  if (st.status === 'denied') {
    c.append(h('div', { class: 'banner warn small' }, icon('info'), h('span', null, 'Benachrichtigungen sind für Mathub blockiert. Chrome → ⋮ → Einstellungen → Website-Einstellungen → Benachrichtigungen → mtahieu.github.io erlauben.')));
    return c;
  }
  if (st.status === 'on') {
    c.append(h('div', { class: 'kv-list small' },
      h('div', null, h('span', { class: 'muted' }, 'Status'), h('span', null, '✓ eingerichtet')),
      h('div', null, h('span', { class: 'muted' }, 'Seit'), h('span', null, formatDate(keyFromTs(st.saved.createdAt))))));
    c.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: test('morgen') }, 'Test Morgen'),
      h('button', { class: 'btn', onclick: test('abend') }, 'Test Abend')));
    c.append(h('button', { class: 'btn btn-ghost small', onclick: () => openSetupSheet(st.config) }, 'Einrichtungscode erneut anzeigen'));
    c.append(h('button', {
      class: 'btn btn-danger',
      onclick: async () => {
        if (!await confirmDialog('Erinnerungen auf diesem Gerät ausschalten? Das GitHub-Secret kannst du danach löschen.', { okLabel: 'Ausschalten', danger: true })) return;
        await disablePush(); toast('Erinnerungen ausgeschaltet'); ctx.refresh();
      },
    }, 'Ausschalten'));
    return c;
  }
  if (st.status === 'changed') {
    c.append(h('div', { class: 'banner warn small' }, icon('info'), h('span', null, 'Chrome hat die Push-Verbindung erneuert. Bitte neu einrichten und den Code in GitHub ersetzen.')));
  }
  c.append(h('button', {
    class: 'btn btn-primary',
    onclick: async (e) => {
      e.currentTarget.disabled = true;
      try {
        const { config } = await enablePush();
        openSetupSheet(config, () => ctx.refresh());
      } catch (err) { toast(err.message); ctx.refresh(); }
    },
  }, icon('plus', 18), 'Erinnerungen einrichten'));
  c.append(h('button', { class: 'btn btn-ghost small', onclick: test('abend') }, 'Nur testen, wie sie aussehen'));
  return c;
}

function openSetupSheet(config, onDone) {
  const box = h('textarea', { class: 'input code-box', readonly: true, rows: 5 });
  box.value = config;
  const copy = async () => {
    try { await navigator.clipboard.writeText(config); toast('Code kopiert'); }
    catch { box.select(); toast('Bitte manuell markieren und kopieren'); }
  };
  const sheet = openSheet({
    title: 'Erinnerungen verbinden',
    body: [
      h('p', { class: 'small' }, 'Einmalig: Den Code als geheimes Secret in deinem GitHub-Repo speichern. Er bleibt dort verschlüsselt und ist nicht öffentlich.'),
      h('ol', { class: 'howto' },
        h('li', null, h('strong', null, 'Code kopieren'), ' (Button unten).'),
        h('li', null, h('a', { class: 'link', href: REPO_SECRET_URL, target: '_blank', rel: 'noopener' }, 'GitHub-Secret anlegen'), ' öffnen.'),
        h('li', null, 'Bei ', h('strong', null, 'Name'), ' eingeben: ', h('code', null, 'PUSH_CONFIG')),
        h('li', null, 'Bei ', h('strong', null, 'Secret'), ' den Code einfügen → ', h('strong', null, 'Add secret'), '.'),
        h('li', null, 'Testen: ', h('a', { class: 'link', href: WORKFLOW_URL, target: '_blank', rel: 'noopener' }, 'Workflow „Erinnerungen“'), ' → ', h('strong', null, 'Run workflow'), '. Nach ca. 1 Minute kommt eine Benachrichtigung.')),
      box,
      h('p', { class: 'muted small' }, 'GitHub startet zeitgesteuerte Abläufe manchmal 5–30 Minuten verspätet.'),
    ],
    footer: [
      h('button', { class: 'btn', onclick: () => sheet.close() }, 'Fertig'),
      h('button', { class: 'btn btn-primary', onclick: copy }, 'Code kopieren'),
    ],
    onClose: () => onDone?.(),
  });
}


registerModule({
  id: 'settings',
  area: 'hub',
  title: 'Einstellungen',
  description: 'Design, Profil, Erinnerungen',
  order: 95,
  routes: [{ path: '/einstellungen', render }],
});
