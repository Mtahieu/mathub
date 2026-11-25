// Filme: Merkliste mit „gesehen“-Haken und „Hilf mir zu entscheiden!“ für den Filmabend.
// items kind 'film': {catalogId?, title, year?, runtime?, genres:[], moods:[], intensity?, emoji?, note?, watched, watchedAt?, stars?}
//   catalogId verweist auf FILM_CATALOG (filme-data.js) für Beschreibung, Regie usw.
// kv 'filme:seeded'  Startliste angelegt (danach nie wieder, auch wenn Filme gelöscht werden)
// kv 'filme:heute'   {date, filmId} – Entscheidung für den heutigen Abend
// Titelbilder: filme-poster.js (Wikipedia, nur auf dem Gerät)

import { registerModule } from '../../core/registry.js';
import { items, kv } from '../../core/db.js';
import {
  h, icon, card, pageHeader, openSheet, toast, field, textInput, intInput, readNum, textarea, segmented, confirmDialog,
  starRating, emptyState,
} from '../../core/ui.js';
import { today, formatDate } from '../../core/dates.js';
import { FILM_CATALOG, MOODS, INTENSITY, GENRES, catalogFilm } from './filme-data.js';
import { findPoster, forgetPoster } from './filme-poster.js';

const selected = new Set();   // Auswahl für die Entscheidung (bleibt beim Neuzeichnen erhalten)

// ---------- Daten ----------
async function seedOnce() {
  if (await kv.get('filme:seeded', false)) return;
  for (const f of FILM_CATALOG) {
    await items.put({ kind: 'film', catalogId: f.id, title: f.title, year: f.year, runtime: f.runtime, genres: f.genres, moods: f.moods, intensity: f.intensity, emoji: f.emoji, watched: false });
  }
  await kv.set('filme:seeded', true);
}

/** Item + Katalog-Infos zusammengeführt (eigene Angaben haben Vorrang). */
function view(it) {
  const c = catalogFilm(it.catalogId) || {};
  return {
    ...c, ...it,
    moods: it.moods?.length ? it.moods : (c.moods || []),
    genres: it.genres?.length ? it.genres : (c.genres || []),
    hue: c.hue ?? hueOf(it.title),
  };
}
function hueOf(s = '') {
  let x = 0;
  for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) % 360;
  return x;
}

async function loadFilms() {
  await seedOnce();
  const list = (await items.all('film')).map(view);
  list.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  return list;
}

async function setWatched(f, watched) {
  const it = await items.get(f.id);
  if (!it) return;
  await items.put({ ...it, watched, watchedAt: watched ? (it.watchedAt || today()) : null });
  selected.delete(f.id);
  const tonight = await kv.get('filme:heute', null);
  if (watched && tonight?.filmId === f.id) await kv.set('filme:heute', null);
}

function markWatched(f, after) {
  setWatched(f, true).then(() => {
    toast(`„${f.title}“ als gesehen markiert`, { action: 'Rückgängig', onAction: async () => { await setWatched(f, false); after(); } });
    after();
  });
}

const minutes = (f) => (f.runtime ? `ca. ${f.runtime} Min.` : null);
const moodEmojis = (f) => f.moods.map((m) => MOODS[m]?.emoji).filter(Boolean).join(' ');
const genreText = (f, max = 2) => f.genres.slice(0, max).map((g) => GENRES[g] || g).join(', ');

// ---------- Bausteine ----------
/** Kachel mit Emoji; das echte Titelbild wird nachgeladen, sobald es da ist. */
function poster(f, size = 'sm') {
  const tile = h('span', { class: `poster poster-${size}`, style: `--hue: ${Number(f.hue) || 0}` }, f.emoji || '🎬');
  findPoster(f).then((r) => {
    if (!r?.url) return;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.onload = () => { tile.classList.add('has-img'); tile.replaceChildren(img); };
    img.src = r.url;
  });
  return tile;
}

function filmRow(f, ctx, bar) {
  const isSel = selected.has(f.id);
  const row = h('div', { class: 'film-row' + (isSel ? ' sel' : '') });
  const selBtn = h('button', {
    class: 'film-select', type: 'button', 'aria-pressed': String(isSel), 'aria-label': `${f.title} auswählen`,
    onclick: () => {
      if (selected.has(f.id)) selected.delete(f.id); else selected.add(f.id);
      const on = selected.has(f.id);
      row.classList.toggle('sel', on);
      selBtn.setAttribute('aria-pressed', String(on));
      bar.update();
    },
  }, icon('check', 18));
  row.append(
    selBtn,
    h('button', { class: 'film-body', type: 'button', onclick: () => openFilm(f, ctx) },
      poster(f),
      h('span', { class: 'list-main' },
        h('span', { class: 'list-title' }, f.title),
        h('span', { class: 'list-sub' }, [f.year, minutes(f)].filter(Boolean).join(' · ')),
        h('span', { class: 'list-sub' }, [genreText(f), moodEmojis(f)].filter(Boolean).join(' · ')))),
    h('button', { class: 'film-seen', type: 'button', 'aria-label': `${f.title} als gesehen markieren`, onclick: () => markWatched(f, () => ctx.refresh()) },
      icon('eye', 18), h('span', null, 'Gesehen')));
  return row;
}

function watchedRow(f, ctx) {
  return h('button', { class: 'list-item film-done', onclick: () => openFilm(f, ctx) },
    poster(f),
    h('span', { class: 'list-main' },
      h('span', { class: 'list-title' }, f.title),
      h('span', { class: 'list-sub' }, [f.watchedAt ? `gesehen am ${formatDate(f.watchedAt)}` : 'gesehen', f.stars ? '★'.repeat(f.stars) : null].filter(Boolean).join(' · '))),
    icon('chevR', 18));
}

function decideBar(films, ctx) {
  const btn = h('button', { class: 'btn btn-primary decide-btn' });
  const hint = h('span', { class: 'small muted' });
  const el = h('div', { class: 'decide-bar' }, hint, btn);
  const update = () => {
    const n = films.filter((f) => selected.has(f.id)).length;
    btn.disabled = n < 2;
    btn.hidden = n < 2;
    el.classList.toggle('active', n >= 2);
    btn.replaceChildren('🎲 Hilf mir zu entscheiden!', n >= 2 ? ` (${n})` : '');
    hint.textContent = n === 0 ? 'Tippe die Kreise an, um Filme für heute auszuwählen.' : n === 1 ? 'Wähle mindestens noch einen Film.' : '';
    hint.hidden = n >= 2;
  };
  btn.addEventListener('click', () => openDecider(films.filter((f) => selected.has(f.id)), ctx));
  update();
  return { el, update };
}

// ---------- Film-Details ----------
function openFilm(f, ctx) {
  const after = () => ctx.refresh();
  const source = h('p', { class: 'small muted' });
  findPoster(f).then((r) => {
    if (r?.page) source.replaceChildren('Titelbild & mehr: ', h('a', { class: 'link', href: r.page, target: '_blank', rel: 'noopener' }, `Wikipedia – ${r.pageTitle || f.title}`));
  });
  const body = [
    h('div', { class: 'film-head' }, poster(f, 'xl'),
      h('div', { class: 'film-facts' },
        f.deTitle ? h('div', { class: 'small' }, h('em', null, f.deTitle)) : null,
        h('div', { class: 'small muted' }, [f.year, f.country, minutes(f)].filter(Boolean).join(' · ')),
        f.director ? h('div', { class: 'small' }, 'Regie: ', f.director) : null,
        f.cast ? h('div', { class: 'small muted' }, f.cast) : null)),
    f.genres.length ? h('div', { class: 'chips' }, f.genres.map((g) => h('span', { class: 'tag genre' }, GENRES[g] || g))) : null,
    f.desc ? h('p', null, f.desc) : null,
    f.why ? h('div', { class: 'summary' }, h('strong', { class: 'small' }, 'Warum anschauen?'), h('span', { class: 'small' }, f.why)) : null,
    f.note ? h('p', { class: 'small muted pre' }, f.note) : null,
    f.moods.length || f.intensity ? h('div', { class: 'chips' },
      f.moods.map((m) => h('span', { class: 'tag' }, `${MOODS[m]?.emoji || ''} ${MOODS[m]?.label || m}`)),
      f.intensity ? h('span', { class: 'tag' }, `Intensität: ${INTENSITY[f.intensity]}`) : null) : null,
    source,
  ];
  if (f.watched) {
    body.push(field(`Gesehen${f.watchedAt ? ' am ' + formatDate(f.watchedAt) : ''} – deine Bewertung`, starRating(f.stars, async (v) => {
      const it = await items.get(f.id);
      await items.put({ ...it, stars: v });
      f.stars = v;
      after();
    })));
  }
  const sheet = openSheet({
    title: f.title,
    body,
    footer: [
      h('button', { class: 'btn', onclick: () => { sheet.close(); openEditor(f, ctx); } }, icon('edit', 18), ' Bearbeiten'),
      f.watched
        ? h('button', { class: 'btn', onclick: async () => { await setWatched(f, false); sheet.close(); toast('Wieder auf der Liste'); after(); } }, 'Nicht gesehen')
        : h('button', { class: 'btn btn-primary', onclick: () => { sheet.close(); markWatched(f, after); } }, icon('check', 18), ' Gesehen'),
    ],
  });
}

function openEditor(f, ctx) {
  const title = textInput({ value: f?.title || '', placeholder: 'Filmtitel', maxlength: 80 });
  const runtime = intInput({ value: f?.runtime ?? null, placeholder: 'z. B. 110' });
  const note = textarea({ value: f?.note || '', placeholder: 'Notiz, z. B. wer ihn empfohlen hat', rows: 2 });
  const moods = new Set(f?.moods || []);
  const moodChips = h('div', { class: 'chips' }, Object.entries(MOODS).map(([k, m]) => {
    const c = h('button', {
      type: 'button', class: 'chip' + (moods.has(k) ? ' active' : ''),
      onclick: () => { if (moods.has(k)) moods.delete(k); else moods.add(k); c.classList.toggle('active', moods.has(k)); },
    }, `${m.emoji} ${m.label}`);
    return c;
  }));
  const genres = new Set(f?.genres || []);
  const genreChips = h('div', { class: 'chips' }, Object.entries(GENRES).map(([k, label]) => {
    const c = h('button', {
      type: 'button', class: 'chip' + (genres.has(k) ? ' active' : ''),
      onclick: () => { if (genres.has(k)) genres.delete(k); else genres.add(k); c.classList.toggle('active', genres.has(k)); },
    }, label);
    return c;
  }));
  let intensity = String(f?.intensity || 2);
  const sheet = openSheet({
    title: f ? 'Film bearbeiten' : 'Film hinzufügen',
    body: [
      field('Titel', title),
      field('Laufzeit (Minuten)', runtime, 'Optional – hilft bei „max. 2 Stunden“.'),
      field('Kategorien', genreChips),
      field('Stimmung', moodChips),
      field('Intensität', segmented(Object.entries(INTENSITY).map(([v, l]) => ({ value: v, label: l })), intensity, (v) => { intensity = v; })),
      field('Notiz', note),
    ],
    footer: [
      f ? h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (!await confirmDialog(`„${f.title}“ von der Liste löschen?`, { okLabel: 'Löschen', danger: true })) return;
          await items.delete(f.id);
          selected.delete(f.id);
          sheet.close();
          ctx.refresh();
        },
      }, 'Löschen') : h('button', { class: 'btn', onclick: () => sheet.close() }, 'Abbrechen'),
      h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          const t = title.value.trim();
          if (!t) { toast('Bitte einen Titel eingeben'); return; }
          const existing = f ? await items.get(f.id) : null;
          if (existing && !existing.catalogId && existing.title !== t) await forgetPoster(existing);   // neuer Titel → Bild neu suchen
          await items.put({
            ...(existing || { kind: 'film', watched: false }),
            title: t, runtime: readNum(runtime), genres: [...genres], moods: [...moods], intensity: Number(intensity), note: note.value.trim(),
          });
          sheet.close();
          toast(f ? 'Gespeichert' : `„${t}“ hinzugefügt`);
          ctx.refresh();
        },
      }, f ? 'Speichern' : 'Hinzufügen'),
    ],
  });
  if (!f) setTimeout(() => title.focus(), 250);
}

// ---------- Entscheidungshilfe ----------
/** Gewicht eines Films für die Antworten + Begründungen. */
export function scoreFilm(f, a) {
  let w = 1;
  const why = [];
  if (a.mood !== 'egal') {
    if (f.moods.includes(a.mood)) { w *= 4; why.push(`passt zur Stimmung „${MOODS[a.mood].label}“`); } else w *= 0.5;
  }
  if (a.time === 'kurz' && f.runtime) {
    if (f.runtime <= 120) { w *= 2; why.push(`unter 2 Stunden (${minutes(f)})`); } else w *= 0.25;
  }
  if (a.energy === 'muede' && f.intensity) {
    if (f.intensity === 1) { w *= 3; why.push('leichte Kost für einen müden Abend'); } else if (f.intensity === 3) w *= 0.25;
  }
  if (a.energy === 'wach' && f.intensity === 3) { w *= 2; why.push('darf heute ruhig heftig sein'); }
  return { w, why };
}

function pickWeighted(scored) {
  const sum = scored.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * sum;
  for (const x of scored) { r -= x.w; if (r <= 0) return x; }
  return scored[scored.length - 1];
}

function choiceRow(label, options, value, onChange) {
  return field(label, segmented(options, value, onChange));
}

function openDecider(films, ctx) {
  const a = { mood: 'egal', time: 'egal', energy: 'egal' };
  const moodsHere = Object.keys(MOODS).filter((m) => films.some((f) => f.moods.includes(m)));
  const moodChips = h('div', { class: 'chips' });
  const renderMood = () => moodChips.replaceChildren(...[['egal', '🤷 Egal'], ...moodsHere.map((m) => [m, `${MOODS[m].emoji} ${MOODS[m].label}`])].map(([k, l]) => h('button', {
    type: 'button', class: 'chip' + (a.mood === k ? ' active' : ''), onclick: () => { a.mood = k; renderMood(); },
  }, l)));
  renderMood();

  const body = h('div', { class: 'decide-body' },
    h('p', { class: 'small muted' }, `Zur Wahl: ${films.map((f) => f.title).join(', ')}`),
    field('Worauf habt ihr Lust?', moodChips),
    choiceRow('Wie viel Zeit?', [{ value: 'egal', label: 'Egal' }, { value: 'kurz', label: 'Max. 2 Std.' }], a.time, (v) => { a.time = v; }),
    choiceRow('Wie wach seid ihr?', [{ value: 'egal', label: 'Egal' }, { value: 'muede', label: 'Eher müde' }, { value: 'wach', label: 'Hellwach' }], a.energy, (v) => { a.energy = v; }));

  const foot = h('div', { class: 'sheet-foot-inner' });
  const sheet = openSheet({ title: 'Hilf mir zu entscheiden!', body, footer: foot });
  const showQuestions = () => {
    foot.replaceChildren(
      h('button', { class: 'btn', onclick: () => run(true) }, '🎲 Zufall'),
      h('button', { class: 'btn btn-primary', onclick: () => run(false) }, 'Entscheiden'));
  };
  showQuestions();

  function run(pureRandom) {
    const scored = films.map((f) => ({ f, ...(pureRandom ? { w: 1, why: [] } : scoreFilm(f, a)) }));
    // Nur Filme, die mindestens halb so gut passen wie der beste, kommen in die Lostrommel.
    const max = Math.max(...scored.map((x) => x.w));
    const pool = scored.filter((x) => x.w >= max * 0.5);
    const rest = scored.filter((x) => x.w < max * 0.5);
    const sum = pool.reduce((s, x) => s + x.w, 0);
    const winner = pickWeighted(pool);
    const stage = h('div', { class: 'spin-stage' });
    body.replaceChildren(stage);
    foot.replaceChildren();
    const show = (f, final = false) => stage.replaceChildren(h('div', { class: 'spin-card' + (final ? ' final' : '') }, poster(f, 'lg'), h('strong', null, f.title)));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = reduce ? [] : [60, 60, 70, 80, 90, 110, 130, 160, 200, 250, 320, 400];
    let i = Math.floor(Math.random() * films.length);
    const tick = (k) => {
      if (k >= steps.length) return finish();
      i = (i + 1) % films.length;
      if (films.length > 1 && k === steps.length - 1 && films[i].id === winner.f.id) i = (i + 1) % films.length;
      show(films[i]);
      setTimeout(() => tick(k + 1), steps[k]);
    };
    const finish = () => {
      show(winner.f, true);
      const others = pool.filter((x) => x !== winner).sort((x, y) => y.w - x.w);
      const pct = (x) => `${Math.round((x.w / sum) * 100)} %`;
      stage.append(...[
        h('p', { class: 'center' }, '🍿 Heute Abend läuft ', h('strong', null, winner.f.title), '!'),
        winner.why.length ? h('ul', { class: 'caution-list' }, winner.why.map((w) => h('li', null, w))) : null,
        h('p', { class: 'small muted center' }, pureRandom
          ? 'Reiner Zufall – alle hatten die gleiche Chance.'
          : [`Chance: ${pct(winner)}`, ...others.map((x) => `${x.f.title} ${pct(x)}`)].join(' · ')),
        rest.length ? h('p', { class: 'small muted center' }, `Passt heute weniger: ${rest.map((x) => x.f.title).join(', ')}`) : null,
      ].filter(Boolean));
      foot.replaceChildren(
        h('button', { class: 'btn', onclick: () => run(pureRandom) }, icon('refresh', 18), ' Nochmal'),
        h('button', {
          class: 'btn btn-primary',
          onclick: async () => {
            await kv.set('filme:heute', { date: today(), filmId: winner.f.id });
            selected.clear();
            sheet.close();
            ctx.refresh();
          },
        }, 'Den schauen wir!'));
    };
    tick(0);
  }
}

// ---------- Seite ----------
async function tonightPick(films) {
  const t = await kv.get('filme:heute', null);
  if (!t || t.date !== today()) return null;
  return films.find((f) => f.id === t.filmId && !f.watched) || null;
}

function tonightCard(f, ctx) {
  return card('Heute Abend', { iconName: 'film', cls: 'tonight' },
    h('div', { class: 'film-head' }, poster(f, 'lg'),
      h('div', null, h('strong', { class: 'tonight-title' }, f.title), h('div', { class: 'small muted' }, [f.year, minutes(f)].filter(Boolean).join(' · ')))),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: async () => { await kv.set('filme:heute', null); ctx.refresh(); } }, 'Doch nicht'),
      h('button', { class: 'btn btn-primary', onclick: () => markWatched(f, () => ctx.refresh()) }, icon('check', 18), ' Gesehen')));
}

async function render(el, ctx) {
  const films = await loadFilms();
  for (const id of [...selected]) if (!films.some((f) => f.id === id && !f.watched)) selected.delete(id);
  const open = films.filter((f) => !f.watched);
  const seen = films.filter((f) => f.watched).sort((a, b) => String(b.watchedAt || '').localeCompare(String(a.watchedAt || '')));

  el.append(pageHeader('Filme', {
    eyebrow: 'Filmabend',
    actions: h('button', { class: 'icon-btn', 'aria-label': 'Film hinzufügen', onclick: () => openEditor(null, ctx) }, icon('plus')),
  }));

  const tonight = await tonightPick(films);
  if (tonight) el.append(tonightCard(tonight, ctx));

  const genresHere = Object.keys(GENRES).filter((g) => open.some((f) => f.genres.includes(g)));
  const g = genresHere.includes(ctx.query.g) ? ctx.query.g : null;
  const shown = g ? open.filter((f) => f.genres.includes(g)) : open;
  if (genresHere.length > 1) {
    el.append(h('div', { class: 'chips scroll' },
      [[null, 'Alle'], ...genresHere.map((x) => [x, GENRES[x]])].map(([k, label]) => h('button', {
        type: 'button', class: 'chip' + (g === k ? ' active' : ''),
        onclick: () => ctx.navigate('/filme', { g: k || undefined }, { replace: true }),
      }, label))));
  }

  const bar = decideBar(open, ctx);
  const allSel = shown.length && shown.every((f) => selected.has(f.id));
  el.append(card(g ? `${GENRES[g]} (${shown.length})` : `Noch nicht gesehen (${open.length})`, {
    iconName: 'film',
    actions: shown.length > 1 ? h('button', {
      class: 'link',
      onclick: () => { if (allSel) shown.forEach((f) => selected.delete(f.id)); else shown.forEach((f) => selected.add(f.id)); ctx.refresh(); },
    }, allSel ? 'Keine' : 'Alle wählen') : null,
  }, shown.length
    ? h('div', { class: 'list' }, shown.map((f) => filmRow(f, ctx, bar)))
    : emptyState('Alles gesehen! Füge neue Filme hinzu.', h('button', { class: 'btn', onclick: () => openEditor(null, ctx) }, 'Film hinzufügen'))));
  if (open.length >= 2) el.append(bar.el);

  if (seen.length) {
    el.append(card(`Schon gesehen (${seen.length})`, { iconName: 'check' }, h('div', { class: 'list' }, seen.map((f) => watchedRow(f, ctx)))));
  }
}

// ---------- Heute & Kalender ----------
async function todayCard(date, data, ctx) {
  if (date !== today()) return null;
  const t = await kv.get('filme:heute', null);
  if (!t || t.date !== date) return null;
  const it = data.itemsOf('film').find((f) => f.id === t.filmId && !f.watched);
  return it ? tonightCard(view(it), ctx) : null;
}

function summarizeDay(date, data) {
  return data.itemsOf('film').filter((f) => f.watched && f.watchedAt === date).map((f) => `🎬 „${f.title}“ gesehen${f.stars ? ' ' + '★'.repeat(f.stars) : ''}`);
}

registerModule({
  id: 'filme',
  area: 'freizeit',
  title: 'Filme',
  description: 'Merkliste & Entscheidungshilfe für den Filmabend',
  order: 70,
  nav: { tab: 5, label: 'Filme', icon: 'film' },
  routes: [{ path: '/filme', render }],
  todayCard, summarizeDay,
});

