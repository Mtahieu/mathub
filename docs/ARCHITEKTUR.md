# Architektur

Mathub ist bewusst **modular** gebaut: Jede Funktion ist ein Modul, das sich in einer Registry anmeldet. Der Kern (Navigation, Design, Backup, Erinnerungen) fragt die Module ab, statt sie zu kennen. Aktuell gibt es drei Tabs: Home, Filme, Kochen. Neue Bereiche kommen als neue Module dazu, ohne bestehenden Code umzubauen.

```
index.html, manifest.webmanifest, sw.js   PWA-Hülle + Offline-Cache
css/app.css                                Design (CSS-Variablen; Farben/Form/Schrift setzt core/theme.js)
js/app.js                                  Start: DB → Migrationen → Einstellungen → Router
js/version.js                              App-Version (synchron mit sw.js)
js/core/
  db.js         IndexedDB: entries / items / kv, Migrationen, Export/Import
  registry.js   Bereiche + Module, loadDays(), goalsForDay(), summarizeDay()
  router.js     Hash-Router (#/pfad?d=YYYY-MM-DD)
  ui.js         h()-Helfer, Icons, Sheets, Toasts, Formularfelder, Ring, Balken
  charts.js     SVG-Linien-/Balkendiagramme (offline, ohne Bibliothek)
  settings.js   Einstellungen mit Defaults
  theme.js      Farbschemata (Vorschläge), eigene Akzentfarbe, Form, Schrift → CSS-Variablen
  dates.js      Datums-Helfer (lokale Tages-Schlüssel)
  backup.js     Backup-Datei erstellen/teilen/einlesen
  update.js     Service-Worker-Registrierung + Update-Banner
  push.js       Push einrichten (VAPID-Schlüssel lokal erzeugen, Abo, Code für GitHub-Secret)
  reminders.js  Text der Erinnerungen aus reminderNote() der Module, sonst ein Spruch (läuft im Service Worker)
js/modules/
  index.js      ← hier werden Bereiche und Module eingebunden
  hub/          home (Startseite mit Begrüßung & Spruch), home-quotes, settings (inkl. Design)
  fitness/      Bereich „Kochen“ (Ordnername historisch): nutrition (Rezepte/Wochenplan/Einkauf),
                food-data (Zutaten & Rezepte), rezept-fotos (echte Fotos über Wikipedia), ratings (Bewertungen)
  freizeit/     filme (Seite), filme-data (Startliste & Infos), filme-store (Datenzugriff), filme-sync (gemeinsame Liste
                über Google Drive), filme-wiki (Wikipedia/Wikidata-Abgleich), filme-poster (Titelbilder)
tools/          check.mjs, bump-version.mjs, send-push.mjs (für den Workflow)
.github/workflows/reminders.yml   Zeitplan der Push-Erinnerungen
```

## Datenmodell

| Store | Inhalt | Beispiel |
|---|---|---|
| `entries` | alles, was zu einem **Tag** gehört: `{id, type, date, data, createdAt, updatedAt}` | `type:'body'`, `type:'exercise'`, `type:'sleep'` |
| `items` | **Stammdaten**: `{id, kind, …}` | `kind:'exercise'`, `kind:'food-fav'` |
| `kv` | Schlüssel/Wert | `settings`, `installedAt`, `dataVersion` |

Indizes auf `entries`: `type`, `date`, `[type, date]`. Ein neues Feature braucht in der Regel **nur einen neuen `type`/`kind`** – keine Schema-Änderung.

Aktuelle Typen:

| type / kind | data |
|---|---|
| `body` (1/Tag) — **nicht mehr genutzt** seit 0.13.0 | `{weight, bodyFat, measures:{chest,…}, note}` |
| `exercise` | `{exerciseId, sets:[…], done, pain, note}` – **nicht mehr genutzt** seit 0.8.0 (Training entfernt, Altdaten bleiben erhalten) |
| `food` (1/Tag) | `{items:[{id, name, kcal, protein, t}]}` |
| `water` (1/Tag) | `{ml}` – **nicht mehr genutzt** seit 0.3.0 (Altdaten bleiben erhalten) |
| `sleep` (1/Tag) — **nicht mehr genutzt** seit 0.13.0 | `{hours, quality}` – Nacht *vor* dem Datum |
| `job` (1/Tag) — **nicht mehr genutzt** seit 0.13.0 | `{leistung, zufriedenheit, gebraucht, highlight, lowlight}` – Werte 1–10 oder `null` |
| item `exercise` | **nicht mehr genutzt** seit 0.8.0 |
| `mealplan` (1/Woche, date = Montag) | `{days:{0–6:{fruehstueck, mittag, abend, snack[]}}, checked, extras, shopDays?}` – Slot `{r: rezeptId|'kantine'|'auswaerts', rest?, locked?}` |
| `food` (1/Tag) | **nicht mehr genutzt** seit 0.5.0 |
| item `food-fav` | **nicht mehr genutzt** seit 0.5.0 |
| `supplements` (1/Tag) — **nicht mehr genutzt** seit 0.13.0 | `{taken:{itemId: Zeitstempel}}` |
| item `supplement` — **nicht mehr genutzt** seit 0.13.0 | `{catalogId?, name, dose, slot, days[0–6], mode:'plan'|'bedarf'}` |
| item `rating` | `{key, stars, history:[{date, stars}]}` – key = Rezept (früher auch Übungen) |
| item `film` | `{catalogId?, title, year?, runtime?, genres:[], moods:[], intensity 1–3, emoji?, note?, watched, watchedAt?, stars?}` |
| kv `filme:poster` | gemerkte Wikipedia-Treffer `{<schlüssel>: {url, page, pageTitle, at}}` – Bilddateien im SW-Cache `posters-v1` |
| kv `filme:heute` | `{value:{date, filmId}, updatedAt, updatedBy}` – Entscheidung für den Abend (geteilt); kv `filme:seeded` = Startliste angelegt |
| kv `filme:sync` | gemeinsame Liste: `{clientId, fileId, fileName, account, me, version, lastSync, lastError, pending}`; `tmp:filme:token` nicht im Backup |
| kv `gcal`, `gcal:events` | **nicht mehr genutzt** seit 0.10.0 (Google Kalender entfernt; Altdaten bleiben liegen) |
| kv `tmp:…` | kurzlebig, **nicht im Backup** (z. B. Anmelde-Token) |
| kv `push` | Push-Abo + lokal erzeugter VAPID-Schlüssel (verlässt das Gerät nur als GitHub-Secret) |

### Schema & Migrationen
- Neuer Store/Index → `DB_VERSION` in `db.js` erhöhen und Block in `upgradeSchema()` ergänzen.
- Daten umbauen → `DATA_VERSION` erhöhen und Eintrag in `MIGRATIONS` (`{to, run}`). Läuft beim Start und nach Backup-Import automatisch.
- Niemals Felder stillschweigend umdeuten – immer per Migration.

## Ein Modul

```js
import { registerModule } from '../../core/registry.js';

registerModule({
  id: 'beispiel',              // eindeutig
  area: 'fitness',             // Bereich (siehe modules/index.js)
  title: 'Beispiel',
  description: 'Kurzbeschreibung für „Mehr“',
  order: 40,                   // Reihenfolge auf der Startseite
  nav: { tab: 3, label: 'Beispiel', icon: 'chart' }   // Tab unten (max. 5) – oder:
  // nav: { more: 3, icon: 'chart' }                   // Eintrag unter „Mehr“
  routes: [{ path: '/beispiel', render: async (el, ctx) => { … } }],

  // alles optional:
  todayCard(date, data, ctx) { return card(…) },       // Schnell-Eingabe auf „Heute“
  goals(date, data) { return [{ id, label, detail, done, progress, route }] },  // zählt für Serien
  summarizeDay(date, data) { return ['Kurzer Text'] }, // Kalender-Tagesdetails
  reminderNote(slot, date) { return 'Zeile' },         // Zusatzzeile in Push-Erinnerungen (async ok)
  charts: [{ id, title, render(el, { from, to, data }) {} }],  // Diagramme (derzeit ohne eigene Seite)
  loadData(from, to) { return … },                     // Zusatzdaten außerhalb von entries → data.ext[id] (async ok)
  launch() {},                                          // beim Start vor dem Router (z. B. Rückkehr von Google-Anmeldung)
});
```

`ctx` in `render`: `{ path, query, date, navigate(path, query, {replace}), refresh() }`.
`data` (aus `loadDays`): `{ get(date, type), first(date, type), byDay, itemsOf(kind), ext, settings }`.

### Neues Modul hinzufügen – Checkliste
1. Datei unter `js/modules/<bereich>/` anlegen.
2. In `js/modules/index.js` importieren (ggf. `registerArea` für neuen Bereich).
3. Datei in `PRECACHE` in `sw.js` eintragen.
4. `node tools/check.mjs`
5. `node tools/bump-version.mjs X.Y.Z "Beschreibung"` → committen → pushen.

## Push-Erinnerungen

```
GitHub Actions (cron, UTC) ──leeres Signal (VAPID)──▶ Push-Dienst ──▶ Service Worker auf dem Handy
                                                                      └─ reminders.js liest IndexedDB → Text
```
- Zeiten: `REMINDER_TIMES` und cron-Zeilen in `.github/workflows/reminders.yml` (je Zeit eine Winter- und eine Sommerzeit-Zeile).
- Secret `PUSH_CONFIG` = Code aus der App (Einstellungen → Erinnerungen). Mehrere Geräte: JSON-Array.
- Abo abgelaufen → Workflow schlägt fehl (GitHub schickt eine Mail) → in der App neu einrichten.
- GitHub pausiert Zeitpläne in Repos ohne Commits nach 60 Tagen – dann im Actions-Tab wieder aktivieren.

## Gemeinsame Filmliste (Google Drive)

```
Handy A ─┐                                         ┌─ Handy B
 eigenes Google-Konto ── Drive API ── Mathub-Filme.json (geteilter Ordner) ── Drive API ── eigenes Google-Konto
```
- Jede Person meldet sich in ihrer App mit dem eigenen Google-Konto an (OAuth-Token-Weiterleitung, Scope `drive`, ca. 1 h gültig, danach stille Neu-Anmeldung beim Öffnen der Filme). Die Client-ID legt der Besitzer einmal an; die anderen bekommen sie per Einladungslink (`#/filme?v=teilen&e=…`), nicht über das Repo.
- Datei: `{app:'mathub-filme', schema, films:[…], shared:{…}}`. **Alle Felder eines Films werden unverändert geteilt** – neue Film-Attribute brauchen keine Sync-Anpassung. Weitere geteilte Werte rund um Filme: Schlüssel in `SHARED_KV` (filme-store.js) eintragen.
- Zusammenführen: pro Film gewinnt der neuere `updatedAt`; Löschen setzt `deleted:true` (bleibt als Markierung stehen); doppelte Katalogfilme werden zu einem. Beim Beitreten werden lokale Filme, die es in der Liste schon gibt, verworfen (Gesehen-Haken wird übernommen).
- Abgleich: 1,5 s nach jeder Änderung, alle 30 s solange die App sichtbar ist (nur Metadaten, Download nur bei neuer Version), beim Zurückkehren in die App. Ohne Netz/Anmeldung wird gemerkt (`filme:sync:dirty`) und später nachgeholt.
- Alle Film-Änderungen laufen über `filme-store.js` – nie direkt `items.put` auf `kind:'film'`, sonst fehlt der Abgleich-Auslöser bzw. der Zeitstempel. Neue Katalogfilme per Migration mit fester id `film:<catalogId>` und altem Zeitstempel (`addCatalogFilm` in db.js).

## Wikipedia-Abgleich neuer Filme

Beim Hinzufügen sucht `filme-wiki.js` den Film auf der englischen Wikipedia (Kurzbeschreibung muss „film“ enthalten), holt über Wikidata Jahr, Laufzeit, Regie, Besetzung, Land, Genres (→ Mathub-Kategorien) und den deutschen Artikel, daraus die Beschreibung. Stimmung/Intensität werden aus den Kategorien abgeleitet. Nur leere Felder werden gefüllt; „Mit Wikipedia abgleichen“ im Bearbeiten-Dialog ersetzt die Wikipedia-Felder. Offline hinzugefügte Filme werden beim nächsten Öffnen nachgeholt.

## Design

`prefs.design = {preset, accent, shape, font}` (Einstellungen → Design). `core/theme.js` berechnet daraus für Hell bzw. Dunkel alle Farb-Variablen (Hintergrund leicht in Richtung des Schemas getönt, Akzent im hellen Modus abgedunkelt für Kontrast), `--rs` (Faktor für alle Rundungen) und `--font`. Neues Schema = Eintrag in `PRESETS`.

## Rezeptfotos

`rezept-fotos.js` ordnet jedem Rezept einen Wikipedia-Artikel des Gerichts zu (`PHOTO_TITLES`, „de:“ = deutsche Wikipedia) und lädt die Titelbilder gebündelt (bis 45 Titel pro Abfrage, nur frei lizenzierte Bilder: `pilicense=free`). Es sind Symbolfotos des Gerichts; die Quelle steht im Rezept. Chefkoch & Co. sind nicht möglich (keine offene Schnittstelle, Browser-Abrufe gesperrt, Bildrechte). Neues Rezept → Eintrag in `PHOTO_TITLES`.

## Filmposter

Poster sind urheberrechtlich geschützt und liegen deshalb **nicht im Repo**. Das Handy fragt die Wikipedia-API (`en.wikipedia.org`, `origin=*`, `pilicense=any`) nach dem Bild des hinterlegten Artikels (`wiki` im Katalog) bzw. sucht bei eigenen Filmen nach „<Titel> film“. Der Service Worker speichert die Bilder von `upload.wikimedia.org` im Cache `posters-v1` (max. 200, bleibt über Updates erhalten). Ohne Netz oder Treffer zeigt die App die Emoji-Kachel – das ist die einzige bewusste Ausnahme von „alles offline“ und rein optional.

## Ideen für Erweiterungen
- **Kalender/Termine:** neues Modul mit `summarizeDay` (Monatsübersicht) und `reminderNote` (Morgen-Erinnerung). Die Hooks `loadData()` und `launch()` sind dafür schon vorhanden.
- **Erinnerungen:** Notification API (nur bei geöffneter/installierter App zuverlässig).
- **Weitere Bereiche:** eigener Ordner `js/modules/<bereich>/`, eigener `registerArea`.
