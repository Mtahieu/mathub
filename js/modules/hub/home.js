// Startseite: Begrüßung und ein Film-Zitat bzw. alberner Spruch, der bei jedem App-Start wechselt.

import { registerModule } from '../../core/registry.js';
import { h, icon } from '../../core/ui.js';
import { getSettingsSync } from '../../core/settings.js';
import { kv } from '../../core/db.js';
import { QUOTES, pickQuote } from './home-quotes.js';

let quoteIndex = null;   // pro App-Start einmal gezogen

async function quoteOfThisStart() {
  if (quoteIndex == null) {
    const last = await kv.get('home:lastQuote', null);
    quoteIndex = pickQuote(last);
    await kv.set('home:lastQuote', quoteIndex);
  }
  return QUOTES[quoteIndex];
}

function greeting() {
  const hr = new Date().getHours();
  const name = getSettingsSync().profile.name;
  const g = hr < 5 ? 'Gute Nacht' : hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
  return name ? `${g}, ${name}!` : `${g}!`;
}

function subline() {
  const hr = new Date().getHours();
  if (hr < 11) return 'Schön, dass du da bist.';
  if (hr < 17) return 'Was gibt’s heute zu essen?';
  if (hr < 22) return 'Zeit für einen guten Film?';
  return 'Noch ein Film oder schon ins Bett?';
}

async function render(el) {
  const q = await quoteOfThisStart();
  el.classList.add('home');
  el.append(h('header', { class: 'home-top' },
    h('span', { class: 'home-brand' }, 'Mathub'),
    h('a', { class: 'icon-btn', href: '#/einstellungen', 'aria-label': 'Einstellungen & Design' }, icon('settings'))));
  el.append(h('section', { class: 'home-hero' },
    h('h1', { class: 'home-greet' }, greeting()),
    h('p', { class: 'home-sub' }, subline())));
  el.append(h('figure', { class: 'home-quote' },
    h('blockquote', { lang: 'en' }, `“${q.text}”`),
    h('figcaption', null, q.src ? `— ${q.src}` : '— Mathub-Weisheit')));
}

registerModule({
  id: 'home',
  area: 'hub',
  title: 'Home',
  order: 0,
  nav: { tab: 1, label: 'Home', icon: 'home' },
  routes: [{ path: '/heute', render }, { path: '/home', render }],
});
