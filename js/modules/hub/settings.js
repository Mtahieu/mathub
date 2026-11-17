// Einstellungen: Profil, Ziele (+ Richtwert-Rechner), Tagesziele, Darstellung, Daten/Backup, Über.

import { registerModule } from '../../core/registry.js';
import { entries, clearAll } from '../../core/db.js';
import { getSettingsSync, updateSettings } from '../../core/settings.js';
import {
  h, icon, card, pageHeader, field, numInput, intInput, readNum, textInput, select, checkbox, toast, confirmDialog,
  openSheet, withUnit, fmt, fmtInt, segmented,
} from '../../core/ui.js';
import { createBackup, downloadFile, shareFile, markBackupDone, readBackupFile, restoreBackup } from '../../core/backup.js';
import { checkForUpdate } from '../../core/update.js';
import { pushSupported, pushState, enablePush, disablePush, testNotification, REPO_SECRET_URL, WORKFLOW_URL } from '../../core/push.js';
import { APP_VERSION } from '../../version.js';
import { MEASURES } from '../fitness/body.js';
import { keyFromTs, formatDate } from '../../core/dates.js';

const ACTIVITY = [
  { value: 1.2, label: 'Überwiegend sitzend' },
  { value: 1.375, label: 'Leicht aktiv (1–3× Sport/Woche)' },
  { value: 1.55, label: 'Mäßig aktiv (3–5× Sport/Woche)' },
  { value: 1.725, label: 'Sehr aktiv (6–7× Sport/Woche)' },
];

async function latestWeight() {
  const list = (await entries.byType('body')).filter((e) => e.data.weight != null).sort((a, b) => (a.date < b.date ? 1 : -1));
  return list[0]?.data.weight ?? null;
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
  el.append(pageHeader('Einstellungen'));

  // ----- Profil -----
  const name = textInput({ value: s.profile.name, placeholder: 'Wie soll ich dich nennen?', maxlength: 40 });
  const height = intInput({ value: s.profile.heightCm, placeholder: 'cm' });
  const birth = intInput({ value: s.profile.birthYear, placeholder: 'z. B. 1995' });
  const sex = select([{ value: '', label: '–' }, { value: 'm', label: 'männlich' }, { value: 'w', label: 'weiblich' }], s.profile.sex);
  const activity = select(ACTIVITY, s.profile.activity);
  el.append(card('Profil', { iconName: 'home', cls: 'anchor-profil' },
    field('Name', name),
    h('div', { class: 'grid-2' }, field('Größe', withUnit(height, 'cm')), field('Geburtsjahr', birth)),
    field('Geschlecht (für den Kalorien-Richtwert)', sex),
    field('Aktivität im Alltag', activity),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ profile: { name: name.value.trim(), heightCm: readNum(height), birthYear: readNum(birth), sex: sex.value, activity: Number(activity.value) } });
        saved();
      },
    }, 'Profil speichern')));

  // ----- Ziele -----
  const wGoal = numInput({ value: s.targets.weightGoal, placeholder: 'kg' });
  const kcal = intInput({ value: s.targets.kcal, placeholder: 'kcal' });
  const protein = intInput({ value: s.targets.protein, placeholder: 'g' });
  const sleep = numInput({ value: s.targets.sleepH, placeholder: 'h' });
  const calcBox = h('div');
  const calc = async () => {
    const weight = await latestWeight();
    const age = s.profile.birthYear ? new Date().getFullYear() - s.profile.birthYear : null;
    const r = suggest({ weight, heightCm: s.profile.heightCm, age, sex: s.profile.sex, activity: s.profile.activity });
    if (!r) {
      calcBox.replaceChildren(h('p', { class: 'muted small' }, 'Für einen Vorschlag brauche ich Größe, Geburtsjahr und Geschlecht (Profil) sowie ein eingetragenes Gewicht.'));
      return;
    }
    calcBox.replaceChildren(h('div', { class: 'banner' }, icon('info'),
      h('div', { style: { flex: 1 } },
        h('div', null, h('strong', null, `${fmtInt(r.kcal)} kcal · ${r.protein} g Protein`)),
        h('div', { class: 'small muted' }, `Erhaltungsbedarf ca. ${fmtInt(r.tdee)} kcal + 300 kcal für Muskelaufbau, 1,8 g Protein je kg (${fmt(weight)} kg). Grober Richtwert – passe ihn an deinen Verlauf an.`)),
      h('button', { class: 'btn small', onclick: () => { kcal.value = r.kcal; protein.value = r.protein; toast('Übernommen – bitte speichern'); } }, 'Übernehmen')));
  };
  el.append(card('Ziele', { iconName: 'trophy', cls: 'anchor-ziele' },
    h('div', { class: 'grid-2' },
      field('Zielgewicht', withUnit(wGoal, 'kg')),
      field('Kalorien pro Tag', withUnit(kcal, 'kcal')),
      field('Protein pro Tag', withUnit(protein, 'g')),
      field('Schlaf', withUnit(sleep, 'h'))),
    h('button', { class: 'btn btn-ghost small', onclick: calc }, icon('info', 18), 'Richtwert für Kalorien & Protein berechnen'),
    calcBox,
    h('p', { class: 'muted small' }, 'Leere Felder = kein Tagesziel dafür.'),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ targets: { weightGoal: readNum(wGoal), kcal: readNum(kcal), protein: readNum(protein), sleepH: readNum(sleep) } });
        saved();
      },
    }, 'Ziele speichern')));

  // ----- Tagesziele & Serien -----
  const weigh = checkbox('Wiegen als tägliches Ziel zählen (optional)', s.prefs.weighDaily);
  const thr = intInput({ value: s.prefs.streakThreshold });
  const tol = intInput({ value: s.prefs.kcalTolerance });
  const mChips = h('div', { class: 'chips' });
  let mSel = [...s.prefs.measureFields];
  const renderM = () => mChips.replaceChildren(...Object.entries(MEASURES).map(([k, label]) => h('button', {
    type: 'button', class: 'chip' + (mSel.includes(k) ? ' active' : ''),
    onclick: () => { mSel = mSel.includes(k) ? mSel.filter((x) => x !== k) : [...mSel, k]; renderM(); },
  }, label)));
  renderM();
  el.append(card('Tagesziele & Serien', { iconName: 'flame' },
    weigh,
    h('div', { class: 'grid-2' },
      field('Serie zählt ab', withUnit(thr, '%'), 'erfüllter Tagesziele'),
      field('Kalorien-Toleranz', withUnit(tol, '± %'))),
    field('Umfänge, die du messen willst', mChips),
    h('button', {
      class: 'btn btn-primary',
      onclick: async () => {
        await updateSettings({ prefs: {
          weighDaily: weigh.input.checked,
          streakThreshold: Math.min(100, Math.max(10, readNum(thr) ?? 80)),
          kcalTolerance: Math.min(50, Math.max(0, readNum(tol) ?? 10)),
          measureFields: Object.keys(MEASURES).filter((k) => mSel.includes(k)),
        } });
        saved();
      },
    }, 'Speichern')));

  // ----- Darstellung -----
  el.append(card('Darstellung', { iconName: 'settings' },
    segmented([{ value: 'dark', label: 'Dunkel' }, { value: 'light', label: 'Hell' }, { value: 'system', label: 'System' }], s.prefs.theme,
      async (v) => { await updateSettings({ prefs: { theme: v } }); })));

  // ----- Erinnerungen -----
  el.append(await reminderCard(ctx));

  // ----- Daten -----
  const persisted = await navigator.storage?.persisted?.().catch(() => false);
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      openImportSheet(data, ctx);
    } catch (err) { toast(err.message); }
  });
  const doBackup = async (share) => {
    const b = await createBackup();
    try {
      if (share && await shareFile(b.name, b.text)) { await markBackupDone(); saved('Backup geteilt'); return; }
    } catch (err) { if (err.name === 'AbortError') return; }
    downloadFile(b.name, b.text);
    await markBackupDone();
    saved('Backup heruntergeladen');
  };
  el.append(card('Daten & Backup', { iconName: 'shield', cls: 'anchor-daten' },
    h('p', { class: 'muted small' }, 'Alle Daten liegen nur auf diesem Gerät im Browser-Speicher. Sichere sie regelmäßig als Datei, z. B. in Google Drive.'),
    h('div', { class: 'kv-list small' },
      h('div', null, h('span', { class: 'muted' }, 'Letztes Backup'), h('span', null, s.backup.lastAt ? formatDate(keyFromTs(s.backup.lastAt)) : 'noch keins')),
      h('div', null, h('span', { class: 'muted' }, 'Speicher geschützt'), h('span', null, persisted ? 'ja' : 'nein (App installieren hilft)')),
      est?.usage != null ? h('div', null, h('span', { class: 'muted' }, 'Belegt'), h('span', null, `${fmt(est.usage / 1024 / 1024, 1)} MB`)) : null),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', onclick: () => doBackup(true) }, icon('share', 18), 'Backup teilen'),
      h('button', { class: 'btn', onclick: () => doBackup(false) }, icon('download', 18), 'Herunterladen')),
    h('button', { class: 'btn', onclick: () => fileInput.click() }, icon('upload', 18), 'Backup wiederherstellen'),
    fileInput,
    h('button', {
      class: 'btn btn-danger',
      onclick: async () => {
        if (!await confirmDialog('Alle Einträge, Übungen und Einstellungen auf diesem Gerät werden gelöscht. Mach vorher ein Backup!', { okLabel: 'Alles löschen', danger: true })) return;
        await clearAll();
        location.reload();
      },
    }, icon('trash', 18), 'Alle Daten löschen')));

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
const REMINDER_TIMES = '7:30 Uhr (Tagesüberblick) und 20:30 Uhr (was noch offen ist)';

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
  c.append(h('p', { class: 'muted small' }, `Mathub erinnert dich täglich um ${REMINDER_TIMES}. Der Text entsteht auf deinem Handy aus deinen Tageszielen – GitHub sendet nur ein leeres Wecksignal.`));

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

function openImportSheet(data, ctx) {
  const counts = `${data.entries.length} Einträge, ${(data.items || []).length} Übungen/Favoriten, gesichert am ${new Date(data.exportedAt).toLocaleString('de-DE')}`;
  const go = async (mode) => {
    if (mode === 'replace' && !await confirmDialog('Alle aktuellen Daten werden durch das Backup ersetzt.', { okLabel: 'Ersetzen', danger: true })) return;
    try {
      await restoreBackup(data, mode);
      sheet.close();
      toast('Backup wiederhergestellt');
      setTimeout(() => location.reload(), 600);
    } catch (err) { toast(err.message); }
  };
  const sheet = openSheet({
    title: 'Backup wiederherstellen',
    body: [
      h('p', null, counts),
      h('p', { class: 'muted small' }, '„Zusammenführen“ ergänzt und überschreibt gleiche Einträge. „Ersetzen“ löscht vorher alles auf diesem Gerät.'),
    ],
    footer: [
      h('button', { class: 'btn', onclick: () => go('merge') }, 'Zusammenführen'),
      h('button', { class: 'btn btn-danger', onclick: () => go('replace') }, 'Ersetzen'),
    ],
  });
  return ctx;
}

registerModule({
  id: 'settings',
  area: 'hub',
  title: 'Einstellungen',
  description: 'Profil, Ziele, Backup',
  order: 95,
  nav: { more: 9, icon: 'settings' },
  routes: [{ path: '/einstellungen', render }],
});
