// Filme: Merkliste mit „gesehen“-Haken, „Hilf mir zu entscheiden!“ und optional gemeinsamer Liste (Google Drive).
// items kind 'film': {catalogId?, title, year?, runtime?, genres:[], moods:[], intensity?, emoji?, note?, watched, watchedAt?,
//   stars?, wiki?, deTitle?, director?, cast?, country?, desc?, updatedBy?, deleted?} – alle Felder werden geteilt.
//   catalogId verweist auf FILM_CATALOG (filme-data.js) für Beschreibung, Regie usw.
// kv 'filme:seeded'  Startliste angelegt (danach nie wieder, auch wenn Filme gelöscht werden)
// kv 'filme:heute'   {value:{date, filmId}, updatedAt, updatedBy} – Entscheidung für den heutigen Abend (geteilt)
// Datenzugriff: filme-store.js · Abgleich: filme-sync.js · Wikipedia-Infos: filme-wiki.js · Titelbilder: filme-poster.js

import { registerModule } from '../../core/registry.js';
import { parseHash } from '../../core/router.js';
import { on } from '../../core/events.js';
import {
  h, icon, card, pageHeader, openSheet, toast, field, textInput, intInput, readNum, textarea, segmented, confirmDialog,
  starRating, emptyState,
} from '../../core/ui.js';
import { today, formatDate } from '../../core/dates.js';
import { MOODS, INTENSITY, GENRES, catalogFilm } from './filme-data.js';
import { findPoster, forgetPoster } from './filme-poster.js';
import { seedOnce, allFilms, getFilm, saveFilm, patchFilm, deleteFilm, getShared, setShared } from './filme-store.js';
import { lookupFilm, applyLookup } from './filme-wiki.js';
import {
  getSyncConfig, saveSyncConfig, isLinked, getToken, login, launch, mayAutoLogin, syncNow, finishPending, unlink,
  inviteLink, parseInvite, parseDriveLink, redirectUri,
} from './filme-sync.js';

const selected = new Set();   // Auswahl für die Entscheidung (bleibt beim Neuzeichnen erhalten)

// ---------- Daten ----------
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
  const list = (await allFilms()).map(view);
  list.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  return list;
}

async function setWatched(f, watched) {
  const it = await getFilm(f.id);
  if (!it) return;
  await patchFilm(f.id, { watched, watchedAt: watched ? (it.watchedAt || today()) : null });
  selected.delete(f.id);
  const tonight = await getShared('filme:heute');
  if (watched && tonight?.filmId === f.id) await setShared('filme:heute', null);
}

// ---------- Wikipedia-Abgleich ----------
const enriching = new Set();
const triedThisSession = new Set();   // automatischer Abgleich: höchstens ein Versuch pro Film und App-Start
/** Infos von Wikipedia holen und am Film speichern (wird geteilt). overwrite: Wikipedia-Felder ersetzen. */
async function enrich(id, { overwrite = false, quiet = true } = {}) {
  if (enriching.has(id) || navigator.onLine === false) return false;
  enriching.add(id);
  try {
    const it = await getFilm(id);
    if (!it || it.deleted) return false;
    const info = await lookupFilm(it.title);
    const fresh = await getFilm(id);   // inzwischen geändert?
    await saveFilm(applyLookup(fresh, info, { overwrite }));
    if (!quiet) toast(info ? `Infos zu „${it.title}“ von Wikipedia übernommen` : `Zu „${it.title}“ nichts auf Wikipedia gefunden`);
    return true;
  } catch {
    if (!quiet) toast('Wikipedia gerade nicht erreichbar');
    return false;
  } finally {
    enriching.delete(id);
  }
}

/** Eigene Filme, die noch nie abgeglichen wurden (z. B. offline hinzugefügt), nachholen. */
async function enrichPending(films, after) {
  const todo = films.filter((f) => !f.catalogId && !f.wikiCheckedAt && !triedThisSession.has(f.id)).slice(0, 3);
  let changed = false;
  for (const f of todo) {
    triedThisSession.add(f.id);
    if (await enrich(f.id)) changed = true;
  }
  if (changed) after();
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
    f.desc && f.descLang === 'en' ? h('p', { class: 'small muted' }, 'Beschreibung aus der englischen Wikipedia.') : null,
    f.note ? h('p', { class: 'small muted pre' }, f.note) : null,
    f.moods.length || f.intensity ? h('div', { class: 'chips' },
      f.moods.map((m) => h('span', { class: 'tag' }, `${MOODS[m]?.emoji || ''} ${MOODS[m]?.label || m}`)),
      f.intensity ? h('span', { class: 'tag' }, `Intensität: ${INTENSITY[f.intensity]}`) : null) : null,
    source,
    f.updatedBy ? h('p', { class: 'small muted' }, `Zuletzt geändert von ${f.updatedBy}${f.updatedAt ? ' · ' + formatDate(new Date(f.updatedAt).toISOString().slice(0, 10)) : ''}`) : null,
  ];
  if (f.watched) {
    body.push(field(`Gesehen${f.watchedAt ? ' am ' + formatDate(f.watchedAt) : ''} – deine Bewertung`, starRating(f.stars, async (v) => {
      await patchFilm(f.id, { stars: v });
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
  let intensityTouched = false;
  const sheet = openSheet({
    title: f ? 'Film bearbeiten' : 'Film hinzufügen',
    body: [
      field('Titel', title),
      field('Laufzeit (Minuten)', runtime, 'Optional – hilft bei „max. 2 Stunden“.'),
      field('Kategorien', genreChips),
      field('Stimmung', moodChips),
      field('Intensität', segmented(Object.entries(INTENSITY).map(([v, l]) => ({ value: v, label: l })), intensity, (v) => { intensity = v; intensityTouched = true; })),
      field('Notiz', note),
      f ? h('button', {
        type: 'button', class: 'btn small',
        onclick: async () => {
          sheet.close();
          toast('Suche auf Wikipedia …');
          await enrich(f.id, { overwrite: true, quiet: false });
          ctx.refresh();
        },
      }, icon('refresh', 16), ' Mit Wikipedia abgleichen') : h('p', { class: 'small muted' }, 'Jahr, Laufzeit, Regie, Besetzung, Kategorien, Beschreibung und Titelbild holt Mathub automatisch von Wikipedia.'),
    ],
    footer: [
      f ? h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (!await confirmDialog(`„${f.title}“ von der Liste löschen?`, { okLabel: 'Löschen', danger: true })) return;
          await deleteFilm(f.id);
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
          const existing = f ? await getFilm(f.id) : null;
          const renamed = existing && !existing.catalogId && existing.title !== t;
          const base = { ...(existing || { kind: 'film', watched: false }) };
          if (renamed) {   // anderer Film → Wikipedia-Infos neu holen
            await forgetPoster(existing);
            for (const k of ['wiki', 'deTitle', 'desc', 'descLang', 'year', 'director', 'cast', 'country', 'wikiCheckedAt', 'wikiMiss']) delete base[k];
          }
          const saved = await saveFilm({
            ...base,
            title: t, runtime: readNum(runtime), genres: [...genres], moods: [...moods], intensity: Number(intensity), note: note.value.trim(),
            ...(intensityTouched ? { intensityManual: true } : {}),
          });
          sheet.close();
          toast(f ? 'Gespeichert' : `„${t}“ hinzugefügt – suche Infos auf Wikipedia …`);
          ctx.refresh();
          if (!saved.catalogId && (!f || renamed)) enrich(saved.id).then((ok) => { if (ok) ctx.refresh(); });
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
            await setShared('filme:heute', { date: today(), filmId: winner.f.id });
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
  const t = await getShared('filme:heute');
  if (!t || t.date !== today()) return null;
  return films.find((f) => f.id === t.filmId && !f.watched) || null;
}

function tonightCard(f, ctx) {
  return card('Heute Abend', { iconName: 'film', cls: 'tonight' },
    h('div', { class: 'film-head' }, poster(f, 'lg'),
      h('div', null, h('strong', { class: 'tonight-title' }, f.title), h('div', { class: 'small muted' }, [f.year, minutes(f)].filter(Boolean).join(' · ')))),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: async () => { await setShared('filme:heute', null); ctx.refresh(); } }, 'Doch nicht'),
      h('button', { class: 'btn btn-primary', onclick: () => markWatched(f, () => ctx.refresh()) }, icon('check', 18), ' Gesehen')));
}

// ---------- Aktualisieren, wenn andere etwas geändert haben ----------
let current = null;   // {ctx} der angezeigten Seite, die Filme zeigt
on('filme:sync', (e) => {
  if (!current) return;
  const still = parseHash().path === current.ctx.path;
  if (!still) { current = null; return; }
  if ((e.status === 'done' && e.changedLocal) || ['auth', 'error', 'unlinked'].includes(e.status)) current.ctx.refresh();
});
const watchPage = (ctx) => { current = { ctx }; };

function agoText(t) {
  if (!t) return 'noch nie';
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'gerade eben' : s < 3600 ? `vor ${Math.round(s / 60)} Min.` : `vor ${Math.round(s / 3600)} Std.`;
}

async function syncStatus(ctx, cfg) {
  if (!isLinked(cfg)) return null;
  const token = await getToken();
  const problem = cfg.needsLogin || !token || cfg.lastError;
  return h('a', { class: 'sync-pill' + (problem ? ' warn' : ''), href: '#/filme?v=teilen' },
    icon('cloud', 16),
    h('span', null, cfg.lastError ? 'Gemeinsame Liste: Problem – tippen'
      : !token ? 'Gemeinsame Liste: Anmeldung nötig'
        : `Gemeinsam · abgeglichen ${agoText(cfg.lastSync)}`));
}

async function render(el, ctx) {
  watchPage(ctx);
  if (ctx.query.v === 'teilen') return renderShare(el, ctx);
  const cfg = await getSyncConfig();
  const films = await loadFilms();
  for (const id of [...selected]) if (!films.some((f) => f.id === id && !f.watched)) selected.delete(id);
  const open = films.filter((f) => !f.watched);
  const seen = films.filter((f) => f.watched).sort((a, b) => String(b.watchedAt || '').localeCompare(String(a.watchedAt || '')));

  el.append(pageHeader('Filme', {
    eyebrow: 'Filmabend',
    actions: [
      h('a', { class: 'icon-btn', 'aria-label': 'Gemeinsame Liste', href: '#/filme?v=teilen' }, icon('cloud')),
      h('button', { class: 'icon-btn', 'aria-label': 'Film hinzufügen', onclick: () => openEditor(null, ctx) }, icon('plus')),
    ],
  }));
  const status = await syncStatus(ctx, cfg);
  if (status) el.append(status);

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

  // Hintergrund: offline hinzugefügte Filme mit Wikipedia abgleichen, gemeinsame Liste abgleichen
  const refreshIfHere = () => { if (parseHash().path === ctx.path && !ctx.query.v) ctx.refresh(); };
  enrichPending(films, refreshIfHere);
  if (isLinked(cfg)) {
    if (await getToken()) syncNow();
    else if (await mayAutoLogin(cfg)) login({ silent: true, returnHash: '#/filme' });
  }
}

// ---------- Gemeinsame Liste: Einrichtung ----------
const CONSOLE_URL = 'https://console.cloud.google.com/';

function copyRow(text) {
  return h('div', { class: 'copy-row' }, h('code', null, text), h('button', {
    class: 'btn small', type: 'button',
    onclick: async () => { try { await navigator.clipboard.writeText(text); toast('Kopiert'); } catch { toast('Bitte manuell kopieren'); } },
  }, 'Kopieren'));
}

async function shareInvite(cfg) {
  const url = inviteLink(cfg);
  const text = 'Hier ist der Link zu unserer gemeinsamen Filmliste in Mathub – öffnen und mit deinem Google-Konto anmelden:';
  if (navigator.share) {
    try { await navigator.share({ title: 'Mathub – gemeinsame Filmliste', text, url }); return; } catch { /* abgebrochen */ }
  }
  try { await navigator.clipboard.writeText(url); toast('Einladungslink kopiert'); } catch { toast('Bitte Link manuell kopieren'); }
}

async function renderShare(el, ctx) {
  let cfg = await getSyncConfig();
  el.append(pageHeader('Gemeinsame Liste', {
    eyebrow: 'Filme',
    actions: h('a', { class: 'icon-btn', 'aria-label': 'Zurück zu den Filmen', href: '#/filme' }, icon('x')),
  }));

  // Einladungslink geöffnet?
  if (ctx.query.e) {
    const inv = parseInvite(ctx.query.e);
    if (!inv) {
      el.append(h('div', { class: 'banner warn' }, icon('info'), h('div', null, h('strong', null, 'Einladungslink ungültig'), h('div', { class: 'small muted' }, 'Bitte den Link erneut schicken lassen.'))));
    } else if (cfg.fileId === inv.fileId) {
      ctx.navigate('/filme', { v: 'teilen' }, { replace: true });
      return;
    } else {
      await saveSyncConfig({ clientId: inv.clientId, pending: { action: 'join', fileId: inv.fileId, fileName: inv.fileName }, lastError: null, needsLogin: false });
      ctx.navigate('/filme', { v: 'teilen' }, { replace: true });
      return;
    }
  }

  // Nach der Google-Anmeldung: angefangene Aktion abschließen
  if (cfg.pending && await getToken()) {
    el.append(card(null, {}, h('p', { class: 'muted center' }, cfg.pending.action === 'create' ? 'Gemeinsame Liste wird angelegt …' : 'Gemeinsame Liste wird verbunden …')));
    const r = await finishPending();
    if (r?.result === 'ok') toast(r.action === 'create' ? 'Gemeinsame Liste angelegt' : 'Mit der gemeinsamen Liste verbunden');
    if (parseHash().path === ctx.path) ctx.refresh();
    return;
  }

  if (cfg.lastError || cfg.needsLogin) {
    el.append(h('div', { class: 'banner warn' }, icon('info'),
      h('div', { style: { flex: 1 } }, h('strong', null, cfg.needsLogin ? 'Anmeldung nötig' : 'Problem beim Abgleich'), h('div', { class: 'small muted' }, cfg.lastError || '')),
      cfg.clientId ? h('button', { class: 'btn small', onclick: () => login({ returnHash: '#/filme?v=teilen' }) }, 'Anmelden') : null));
  }

  if (isLinked(cfg)) return renderLinked(el, ctx, cfg);

  if (cfg.pending?.action === 'join') {
    el.append(card('Einladung zur gemeinsamen Filmliste', { iconName: 'cloud' },
      h('p', null, 'Du wurdest zu einer gemeinsamen Filmliste eingeladen', cfg.pending.fileName ? ` („${cfg.pending.fileName}“)` : '', '. Melde dich mit dem Google-Konto an, mit dem die Liste in Google Drive geteilt wurde.'),
      h('p', { class: 'small muted' }, 'Deine bisherigen Filme werden übernommen – was es in der gemeinsamen Liste schon gibt, wird nicht doppelt angelegt. Google fragt nach Zugriff auf Google Drive; Mathub liest und schreibt dort nur diese eine Datei.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: async () => { await saveSyncConfig({ pending: null }); ctx.refresh(); } }, 'Abbrechen'),
        h('button', { class: 'btn btn-primary', onclick: () => login({ returnHash: '#/filme?v=teilen' }) }, 'Mit Google anmelden'))));
    return;
  }

  // Nicht verbunden: Einladung nutzen, neu anlegen oder bestehende Datei verknüpfen
  el.append(card('So funktioniert’s', { iconName: 'cloud' },
    h('p', { class: 'small' }, 'Eure Filmliste liegt als Datei in Google Drive. Jede Person meldet sich in ihrer App mit dem eigenen Google-Konto an – Änderungen (neue Filme, gesehen, Bewertungen, „Heute Abend“) sind nach wenigen Sekunden bei allen.'),
    h('p', { class: 'small muted' }, 'Du hast einen Einladungslink bekommen? Einfach auf dem Handy öffnen.')));

  const cid = textInput({ value: cfg.clientId, placeholder: '…apps.googleusercontent.com' });
  cid.setAttribute('autocapitalize', 'off');
  const folder = textInput({ placeholder: 'Link zum geteilten Drive-Ordner (optional)' });
  const fileLink = textInput({ placeholder: 'Link zur bestehenden Listendatei' });
  let mode = 'neu';
  const modeBox = h('div');
  const renderMode = () => modeBox.replaceChildren(mode === 'neu'
    ? field('Ordner in Google Drive', folder, 'Ordner oder geteilte Ablage, die du mit den anderen teilst. Leer = „Meine Ablage“ (dann die Datei danach selbst teilen).')
    : field('Bestehende Datei', fileLink, 'Link aus Google Drive („Link kopieren“) zur Datei Mathub-Filme.json.'));
  renderMode();

  el.append(card('Gemeinsame Liste einrichten', { iconName: 'settings' },
    field('Client-ID', cid, 'Aus deinem Google-Cloud-Projekt (Anleitung unten). Nur einmal nötig – die anderen bekommen sie mit dem Einladungslink.'),
    segmented([{ value: 'neu', label: 'Neue Liste' }, { value: 'datei', label: 'Datei verknüpfen' }], mode, (v) => { mode = v; renderMode(); }),
    modeBox,
    h('button', {
      class: 'btn btn-primary block',
      onclick: async () => {
        const c = cid.value.trim();
        if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(c)) { toast('Das sieht nicht wie eine Client-ID aus'); return; }
        if (mode === 'neu') {
          const fo = folder.value.trim() ? parseDriveLink(folder.value) : null;
          if (folder.value.trim() && !fo) { toast('Ordner-Link nicht erkannt'); return; }
          await saveSyncConfig({ clientId: c, pending: { action: 'create', folderId: fo?.id || null, name: 'Mathub-Filme.json' }, lastError: null, needsLogin: false });
        } else {
          const fi = parseDriveLink(fileLink.value);
          if (!fi || fi.type === 'folder') { toast('Bitte den Link zur Datei einfügen'); return; }
          await saveSyncConfig({ clientId: c, pending: { action: 'join', fileId: fi.id }, lastError: null, needsLogin: false });
        }
        login({ returnHash: '#/filme?v=teilen' });
      },
    }, 'Mit Google anmelden & verbinden')));

  el.append(h('details', { class: 'card info-box', open: !cfg.clientId },
    h('summary', null, icon('info'), h('strong', null, 'Anleitung: Client-ID erstellen (einmalig, nur du)')),
    h('ol', { class: 'steps small' },
      h('li', null, 'Am Computer ', h('a', { class: 'link', href: CONSOLE_URL, target: '_blank', rel: 'noopener' }, 'console.cloud.google.com'), ' öffnen, ein neues Projekt „Mathub“ anlegen.'),
      h('li', null, h('strong', null, 'APIs & Dienste → Bibliothek'), ': „Google Drive API“ ', h('strong', null, 'aktivieren'), '.'),
      h('li', null, h('strong', null, 'OAuth-Zustimmungsbildschirm'), ' bzw. „Google Auth Platform“: Typ ', h('strong', null, 'Extern'), ', App-Name „Mathub“. Status „Test“ lassen.'),
      h('li', null, 'Unter ', h('strong', null, 'Zielgruppe → Testnutzer'), ' die Google-Konten ', h('strong', null, 'aller Personen'), ' eintragen, die mitmachen (bis 100).'),
      h('li', null, h('strong', null, 'Anmeldedaten → OAuth-Client-ID → Webanwendung'), '. Autorisierte JavaScript-Quelle:', copyRow(location.origin)),
      h('li', null, 'Autorisierte Weiterleitungs-URI:', copyRow(redirectUri())),
      h('li', null, 'Client-ID kopieren und oben einfügen. Das Client-Secret wird nicht gebraucht.'),
      h('li', null, 'Google zeigt beim Anmelden „App nicht überprüft“ – das ist eure eigene App: ', h('strong', null, 'Weiter'), '.')),
    h('p', { class: 'small muted' }, 'Gut zu wissen: Google gibt Web-Apps ohne Server nur einen Zugang für ca. 1 Stunde. Danach meldet Mathub beim Öffnen der Filme kurz neu an (Sprung zu Google und zurück). Änderungen ohne Netz oder Anmeldung werden gemerkt und später abgeglichen.')));
}

function renderLinked(el, ctx, cfg) {
  el.append(card('Verbunden', { iconName: 'cloud' },
    h('div', { class: 'list' },
      h('div', { class: 'list-item static' }, icon('film', 20), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, cfg.fileName || 'Mathub-Filme.json'), h('span', { class: 'list-sub' }, `Abgeglichen ${agoText(cfg.lastSync)}`))),
      h('div', { class: 'list-item static' }, icon('shield', 20), h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, cfg.me || 'Google-Konto'), h('span', { class: 'list-sub' }, cfg.account || '')))),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn',
        onclick: async () => {
          if (!(await getToken())) { login({ returnHash: '#/filme?v=teilen' }); return; }
          toast('Gleiche ab …');
          const r = await syncNow({ force: true });
          toast(r === 'ok' ? 'Liste ist aktuell' : r === 'offline' ? 'Keine Verbindung' : 'Abgleich fehlgeschlagen');
          ctx.refresh();
        },
      }, icon('refresh', 18), ' Jetzt abgleichen'))));

  el.append(card('Andere einladen', { iconName: 'share' },
    h('ol', { class: 'steps small' },
      h('li', null, 'Den Ordner bzw. die Datei in Google Drive mit der Person teilen (Rolle: ', h('strong', null, 'Bearbeiter'), ').'),
      h('li', null, 'Ihr Google-Konto im Cloud-Projekt als ', h('strong', null, 'Testnutzer'), ' eintragen.'),
      h('li', null, 'Einladungslink schicken – auf dem Handy öffnen, mit Google anmelden, fertig.')),
    h('button', { class: 'btn btn-primary block', onclick: () => shareInvite(cfg) }, icon('share', 18), ' Einladungslink teilen')));

  el.append(card('Verknüpfung', { iconName: 'settings' },
    h('p', { class: 'small muted' }, 'Die Datei sollte nur über Mathub geändert werden. Trennst du die Verknüpfung, bleibt deine Filmliste auf diesem Handy erhalten, wird aber nicht mehr abgeglichen.'),
    h('button', {
      class: 'btn btn-danger',
      onclick: async () => {
        if (!await confirmDialog('Verknüpfung mit der gemeinsamen Liste trennen? Die Datei in Google Drive bleibt bestehen.', { okLabel: 'Trennen', danger: true })) return;
        await unlink();
        toast('Verknüpfung getrennt');
        ctx.refresh();
      },
    }, 'Verknüpfung trennen')));
}

// ---------- Heute & Kalender ----------
async function todayCard(date, data, ctx) {
  if (date !== today()) return null;
  const t = await getShared('filme:heute');
  if (!t || t.date !== date) return null;
  const it = data.itemsOf('film').find((f) => f.id === t.filmId && !f.watched && !f.deleted);
  return it ? tonightCard(view(it), ctx) : null;
}

/** Zeile für Erinnerungen: Film für heute Abend. */
async function reminderNote(slot, date) {
  const t = await getShared('filme:heute');
  if (!t || t.date !== date) return null;
  const f = await getFilm(t.filmId);
  if (!f || f.deleted || f.watched) return null;
  return `🎬 Heute Abend: ${f.title}`;
}

function summarizeDay(date, data) {
  return data.itemsOf('film').filter((f) => !f.deleted && f.watched && f.watchedAt === date).map((f) => `🎬 „${f.title}“ gesehen${f.stars ? ' ' + '★'.repeat(f.stars) : ''}`);
}

registerModule({
  id: 'filme',
  area: 'freizeit',
  title: 'Filme',
  description: 'Merkliste & Entscheidungshilfe für den Filmabend',
  order: 70,
  nav: { tab: 2, label: 'Filme', icon: 'film' },
  routes: [{ path: '/filme', render }],
  launch,
  todayCard, summarizeDay, reminderNote,
});

