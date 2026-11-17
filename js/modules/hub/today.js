// Startseite "Heute": Tagesziele aller Module, Serie und Schnell-Eingaben (todayCard der Module).

import { registerModule, getModules, dayScore } from '../../core/registry.js';
import { h, icon, dateNav, ring, card } from '../../core/ui.js';
import { today, diffDays, keyFromTs, formatDate } from '../../core/dates.js';
import { computeStreaks } from '../../core/streaks.js';
import { getSettingsSync } from '../../core/settings.js';
import { kv } from '../../core/db.js';

registerModule({
  id: 'today',
  area: 'hub',
  title: 'Heute',
  order: 0,
  nav: { tab: 1, label: 'Heute', icon: 'home' },
  routes: [{ path: '/heute', render }],
});

function greeting() {
  const hr = new Date().getHours();
  const name = getSettingsSync().profile.name;
  const g = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
  return name ? `${g}, ${name}` : g;
}

async function render(el, ctx) {
  const date = ctx.date;
  const streak = await computeStreaks();
  const data = streak.data;
  const score = dayScore(date, data);
  const isToday = date === today();

  el.append(h('header', { class: 'page-head' },
    h('div', null, h('div', { class: 'eyebrow' }, greeting()), h('h1', null, 'Mathub')),
    h('div', { class: 'streak-pill', title: 'Aktuelle Serie' }, icon('flame', 18), h('span', null, streak.current))));

  el.append(dateNav(ctx));

  const backup = await backupReminder();
  if (backup) el.append(backup);
  const pushHint = await pushReminder();
  if (pushHint) el.append(pushHint);

  // Fortschritt des Tages
  const ratio = score.ratio ?? 0;
  el.append(h('section', { class: 'card hero' },
    ring(ratio, { label: score.total ? `${Math.round(ratio * 100)} %` : '–', sub: score.total ? `${score.done}/${score.total}` : null }),
    h('div', { class: 'hero-text' },
      h('div', { class: 'hero-title' }, heroTitle(score, isToday)),
      h('div', { class: 'muted small' },
        streak.current > 0
          ? `Serie: ${streak.current} ${streak.current === 1 ? 'Tag' : 'Tage'} · Rekord: ${streak.best}`
          : `Ein Tag zählt ab ${Math.round(streak.threshold * 100)} % erfüllter Ziele.`))));

  // Zielliste
  if (score.goals.length) {
    el.append(card('Tagesziele', { iconName: 'check' },
      h('div', { class: 'list' }, score.goals.map((g) => h('button', {
        class: 'list-item',
        onclick: () => ctx.navigate(g.route || '/heute', { d: isToday ? undefined : date }),
      },
        h('span', { class: 'check' + (g.done ? ' done' : '') }, icon('check', 18)),
        h('span', { class: 'list-main' },
          h('span', { class: 'list-title' }, g.label),
          g.detail ? h('span', { class: 'list-sub' }, g.detail) : null),
        icon('chevR', 18))))));
  } else {
    el.append(card('Los geht’s', { iconName: 'info' },
      h('p', { class: 'muted' }, 'Lege Übungen an und trage deine Ziele ein, dann erscheinen hier deine Tagesziele.'),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn', href: '#/training?v=uebungen' }, 'Übungen'),
        h('a', { class: 'btn', href: '#/einstellungen' }, 'Ziele'))));
  }

  // Schnell-Eingaben der Module
  for (const m of getModules()) {
    if (!m.todayCard) continue;
    try {
      const c = await m.todayCard(date, data, ctx);
      if (c) el.append(...[c].flat());
    } catch (err) {
      console.error(err);
    }
  }
}

function heroTitle(score, isToday) {
  if (!score.total) return 'Noch keine Tagesziele';
  if (score.done === score.total) return isToday ? 'Alles geschafft – stark!' : 'Alle Ziele erfüllt';
  const left = score.total - score.done;
  return `${isToday ? 'Noch' : 'Offen:'} ${left} ${left === 1 ? 'Ziel' : 'Ziele'}`;
}

async function pushReminder() {
  if (!('PushManager' in window) || (await kv.get('push', null)) || (await kv.get('pushHintDismissed', false))) return null;
  const el = h('div', { class: 'banner' },
    icon('bell'),
    h('a', { href: '#/einstellungen?s=push', style: { flex: 1, textDecoration: 'none' } },
      h('strong', null, 'Erinnerungen einschalten'),
      h('div', { class: 'small muted' }, 'Morgens Überblick, abends was noch offen ist.')),
    h('button', { class: 'icon-btn small', 'aria-label': 'Ausblenden', onclick: async () => { await kv.set('pushHintDismissed', true); el.remove(); } }, icon('x', 18)));
  return el;
}

async function backupReminder() {
  const s = getSettingsSync();
  const installed = await kv.get('installedAt');
  const last = s.backup.lastAt;
  const ref = last || installed;
  if (!ref) return null;
  const days = diffDays(keyFromTs(ref), today());
  const due = last ? days >= s.backup.remindDays : days >= 7;
  if (!due) return null;
  return h('a', { class: 'banner warn', href: '#/einstellungen?s=daten' },
    icon('shield'),
    h('div', { style: { flex: 1 } },
      h('strong', null, 'Zeit für ein Backup'),
      h('div', { class: 'small muted' }, last ? `Letztes Backup: ${formatDate(keyFromTs(last))}` : 'Du hast noch kein Backup gemacht.')),
    icon('chevR', 18));
}
