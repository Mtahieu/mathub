// Einstiegspunkt: Datenbank öffnen, Einstellungen laden, Router starten.

import { openDB, runMigrations, kv } from './core/db.js';
import { loadSettings, applyTheme } from './core/settings.js';
import { getRoutes, getTabs, runLaunchHooks } from './core/registry.js';
import { startRouter, navigate } from './core/router.js';
import { h, icon, closeAllSheets } from './core/ui.js';
import { today, isKey } from './core/dates.js';
import { initUpdates } from './core/update.js';
import './modules/index.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let renderToken = 0;

function renderTabs(activeModule) {
  const activeId = activeModule?.nav?.tab ? activeModule.id : 'more';
  tabbar.replaceChildren(...getTabs().map((m) => h('a', {
    class: 'tab' + (m.id === activeId ? ' active' : ''),
    href: '#' + m.routes[0].path,
    'aria-current': m.id === activeId ? 'page' : null,
  }, icon(m.nav.icon, 24), h('span', null, m.nav.label))));
}

async function render(route, { keepScroll = false } = {}) {
  if (!keepScroll) closeAllSheets();
  const routes = getRoutes();
  const match = routes.find((r) => r.path === route.path) || routes.find((r) => r.path === '/heute');
  const token = ++renderToken;
  const y = window.scrollY;
  const container = h('div', { class: 'view-inner' });
  const ctx = {
    path: match.path,
    query: route.query,
    date: isKey(route.query.d) ? route.query.d : today(),
    navigate,
    refresh: () => render(route, { keepScroll: true }),
  };
  try {
    await match.render(container, ctx);
  } catch (err) {
    console.error(err);
    container.replaceChildren(h('div', { class: 'card' }, h('h2', null, 'Da ist etwas schiefgelaufen'), h('p', { class: 'muted small' }, String(err?.message || err))));
  }
  if (token !== renderToken) return;
  view.replaceChildren(container);
  renderTabs(match.module);
  document.title = `${match.module.title} · Mathub`;
  window.scrollTo(0, keepScroll ? y : 0);
}

async function boot() {
  try {
    await openDB();
    await runMigrations();
    if (!(await kv.get('installedAt'))) await kv.set('installedAt', Date.now());
    await loadSettings();
    applyTheme();
    matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);
    navigator.storage?.persist?.().catch(() => {});
    await runLaunchHooks();
    startRouter(render);
    initUpdates();
  } catch (err) {
    console.error(err);
    view.replaceChildren(h('div', { class: 'card' },
      h('h2', null, 'Mathub konnte nicht starten'),
      h('p', { class: 'muted' }, String(err?.message || err)),
      h('p', { class: 'muted small' }, 'Tipp: Privates/Inkognito-Fenster blockiert oft den lokalen Speicher.')));
  }
}

boot();
