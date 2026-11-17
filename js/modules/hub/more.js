// "Mehr": listet alle Module mit nav.more, gruppiert nach Bereich.

import { registerModule, getMoreItems, getAreas } from '../../core/registry.js';
import { h, icon, card, pageHeader } from '../../core/ui.js';
import { APP_VERSION } from '../../version.js';

function render(el) {
  el.append(pageHeader('Mehr'));
  const list = getMoreItems();
  const areas = [...getAreas(), { id: undefined, title: 'Weitere' }];
  for (const a of areas) {
    const mods = list.filter((m) => m.area === a.id || (!a.id && !getAreas().some((x) => x.id === m.area)));
    if (!mods.length) continue;
    el.append(card(a.title, { iconName: a.icon },
      h('div', { class: 'list' }, mods.map((m) => h('a', { class: 'list-item', href: '#' + m.routes[0].path },
        icon(m.nav.icon || 'dot', 22),
        h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, m.title), m.description ? h('span', { class: 'list-sub' }, m.description) : null),
        icon('chevR', 18))))));
  }
  el.append(h('p', { class: 'muted small center' }, `Mathub · Version ${APP_VERSION} · Daten nur auf diesem Gerät`));
}

registerModule({
  id: 'more',
  area: 'hub',
  title: 'Mehr',
  order: 90,
  nav: { tab: 5, label: 'Mehr', icon: 'more' },
  routes: [{ path: '/mehr', render }],
});
