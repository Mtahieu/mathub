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
  settings.js   Einstellungen mit Defaults
  theme.js      Farbschemata (Vorschläge), eigene Akzentfarbe, Form, Schrift → CSS-Variablen
  dates.js      Datums-Helfer (lokale Tages-Schlüssel)
  update.js     Service-Worker-Registrierung + Update-Banner
  push.js       Push einrichten (VAPID-Schlüssel lokal erzeugen, Abo, Code für GitHub-Secret)
  reminders.js  Text der Erinnerungen aus reminderNote() der Module, sonst ein Spruch (läuft im Service Worker)
js/modules/
  index.js      ← hier werden Bereiche und Module eingebunden
  hub/          home (Startseite mit Begrüßung & Spruch), home-quotes, settings (inkl. Design)
  fitness/      Bereich „Kochen“ (Ordnername historisch): kochen (Rezeptliste wie Filme, Einkaufsliste),
                food-data (Zutaten & Rezepte; angezeigt nur vegane), rezept-bild (gezeichnete Rezeptbilder aus den Zutaten),
                rezept-log (gegessen), ratings (Bewertungen) – gegessen & Bewertungen werden geteilt
  freizeit/     karlsruhe (Veranstaltungen von keepkarlsruheboring.org), filme (Seite), filme-data (Startliste & Infos), filme-store (Datenzugriff), teilen (Teilen per
                WhatsApp-Link), filme-wiki (Wikipedia/Wikidata-Abgleich), filme-poster (Titelbilder)
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
| `mealplan` (1/Woche) — **nicht mehr genutzt** seit 0.17.0 (Wochenplan entfernt) | `{days:{0–6:{fruehstueck, mittag, abend, snack[]}}, checked, extras, shopDays?}` – Slot `{r: rezeptId|'kantine'|'auswaerts', rest?, locked?}` |
| `food` (1/Tag) | **nicht mehr genutzt** seit 0.5.0 |
| item `food-fav` | **nicht mehr genutzt** seit 0.5.0 |
| `supplements` (1/Tag) — **nicht mehr genutzt** seit 0.13.0 | `{taken:{itemId: Zeitstempel}}` |
| item `supplement` — **nicht mehr genutzt** seit 0.13.0 | `{catalogId?, name, dose, slot, days[0–6], mode:'plan'|'bedarf'}` |
| item `rating` | `{key, stars, history:[{date, stars, by}], updatedBy, deleted?}` – key = Rezept; wird geteilt |
| item `gegessen` | `{id:'gegessen:<datum>:<rezeptId>', recipeId, date, slot?, updatedBy, deleted?}` – wird geteilt |
| kv `kochen:fotos2` / `kochen:fotoAus` | gemerkte Foto-Treffer je Rezept / ausgeblendete Fotos (nur Gerät) |
| item `film` | `{catalogId?, title, year?, runtime?, genres:[], moods:[], intensity 1–3, emoji?, note?, watched, watchedAt?, stars?, wiki?, wikidata?, deTitle?, origTitle?, director?, cast?, country?, desc?, wikiCheckedAt?, wikiNeedsChoice?, deleted?}` |
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
  launch() {},                                          // beim Start vor dem Router (z. B. geteilter WhatsApp-Link)
  homeCard() { return card(…) },                        // Karte auf der Startseite (async ok, lädt im Hintergrund)
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

## Teilen per WhatsApp

```
Handy A: Änderung → Banner „Jetzt teilen“ → whatsapp://send?phone=…&text=<Nachricht mit Link>
Link:    https://mtahieu.github.io/mathub/#/teilen?d=<komprimierte Datensätze>
Handy B: Link in WhatsApp antippen → Mathub öffnet sich → übernimmt automatisch → #/filme
```
- Kein Konto, kein Server. Der Link enthält die Datensätze (JSON, `deflate-raw`, Base64url; Präfix `z`, ohne Kompression `j`).
- Inhalt: Film-Datensätze (inkl. `deleted`), weitere Arten aus `EXTRA_SYNC_KINDS` (Rezept-Bewertungen `rating`, `gegessen`) und Werte aus `SHARED_KV` („Heute Abend“). **Alle Felder werden unverändert übertragen** – neue Attribute brauchen keine Anpassung.
- Standard: nur Datensätze mit `updatedAt` nach dem letzten Teilen (`teilen.lastSharedAt`); „Alles senden“ schickt alles.
- Übernehmen: pro id gewinnt der neuere `updatedAt`; danach werden gleiche Filme mit unterschiedlicher id (gleicher Katalogfilm oder Titel) zusammengeführt. Übernommene Daten lösen kein neues Banner aus (`source: 'import'`).
- Alle Änderungen an diesen Daten laufen über `filme-store.js`, `ratings.js`, `rezept-log.js` (setzen `updatedAt`, `updatedBy` = Profil-Name, Löschen als Markierung).
- Eine Web-App kann nicht selbst in den WhatsApp-Download-Ordner schauen – deshalb Link statt Datei.

## Wikipedia-Abgleich neuer Filme

`filme-wiki.js` findet Filme auch, wenn der Titel nicht 1:1 passt:
1. **Kandidaten** (`findCandidates`): parallel Wikidata-Suche (de + en, inkl. Alternativtitel) sowie Volltextsuche in der deutschen und englischen Wikipedia; bei 0 Treffern der Tippfehler-Vorschlag von Wikipedia. Jahreszahl im Titel („Dune 2021“) wird erkannt.
2. **Nur Filme**: Wikidata „ist ein“ (P31) Film/Animationsfilm/Fernsehfilm …; Serien, Filmreihen, Bücher fliegen raus.
3. **Rangfolge**: exakter Titel (de/en/Alternativtitel, ohne Artikel/Sonderzeichen) > Titelanfang > Suchrang; passende Jahreszahl +, falsche −.
4. **Entscheidung** (`lookupFilm`): genau ein exakter Treffer → still übernehmen; sonst Auswahl „Welcher Film ist gemeint?“ mit Postern, Jahr, Kurzbeschreibung und eigenem Suchfeld; „Ohne Wikipedia“ möglich. Im Hintergrund (offline hinzugefügt) wird ein unsicherer Fall als `wikiNeedsChoice` markiert → Banner „Film zuordnen“.
5. **Infos** (`infoFor`): deutsche Wikipedia-Einleitung (6 Sätze, sonst englisch), deutscher & Originaltitel, Jahr, Laufzeit, Regie, Besetzung, Land, Kategorien; Poster über den englischen Artikel (`wiki`). Nach der Wahl heißt der Film wie im deutschen Wikipedia-Artikel.
„Mit Wikipedia abgleichen / anderen Treffer wählen“ im Bearbeiten-Dialog öffnet immer die Auswahl.

## Design

`prefs.design = {preset, accent, shape, font}` (Einstellungen → Design). `core/theme.js` berechnet daraus für Hell bzw. Dunkel alle Farb-Variablen (Hintergrund leicht in Richtung des Schemas getönt, Akzent im hellen Modus abgedunkelt für Kontrast), `--rs` (Faktor für alle Rundungen) und `--font`. Neues Schema = Eintrag in `PRESETS`.

## Rezeptbilder

`rezept-bild.js` zeichnet jedes Rezept als SVG aus seinen Zutaten (offline, ohne Netz): Gefäß nach Rezepttyp (Schüssel, Teller, Brett, Glas), Grundfarbe aus der Hauptzutat (`LOOK`: Farbe + Form je Zutat), Toppings als Röschen, Stücke, Scheiben, Blätter, Streusel, Soßen-Schwung; Anordnung mit festem Zufall pro Rezept-id. Neue Zutat → Eintrag in `LOOK`.

## Kochen

`kochen.js`: bildbetonte Übersicht – Rezept des Tages (passend zur Tageszeit, bevorzugt noch nicht gegessen), Themen-Karussells (`SHELVES`), Raster „Alle Rezepte“ und eingeklappt „Schon gegessen“ (mind. ein Eintrag in `gegessen`). Kurztexte: `rezept-texte.js` (neues Rezept → Eintrag in `TEASER`). Bewertung erscheint wie bei Filmen erst nach dem Essen. Personenzahl: `prefs.food.servings` (Startwert im Rezept, dort änderbar). Einkaufsliste: kv `kochen:einkauf` `{recipes:[{r, n}], checked}`. `food-data.js` enthält weiterhin alle Rezepte, exportiert als `RECIPES` nur vegane.

## Backup

Seit 0.14 gibt es keine Backup-Funktion mehr – Filme und Rezept-Daten liegen durch das Teilen auch bei den anderen. `exportAll`/`importAll` in db.js bleiben für Notfälle bestehen, sind aber nicht mehr in der App erreichbar.

## Veranstaltungen Karlsruhe

`karlsruhe.js` lädt Termine von [Keep Karlsruhe Boring](https://keepkarlsruheboring.org) (Gancio): `GET /api/events?start=<unix>&end=<unix>` für heute bzw. morgen, ohne Anmeldung. Startseite (`homeCard`): die noch kommenden Termine von heute (max. 4); Seite `#/karlsruhe`: ganzer Tag, Umschalter Heute/Morgen. Ergebnis 15 Min. gemerkt (kv `ka:events2`), ohne Netz der letzte Stand. Ein Tipp öffnet den Termin auf keepkarlsruheboring.org.

## Filmposter

Poster sind urheberrechtlich geschützt und liegen deshalb **nicht im Repo**. Das Handy fragt die Wikipedia-API (`en.wikipedia.org`, `origin=*`, `pilicense=any`) nach dem Bild des hinterlegten Artikels (`wiki` im Katalog) bzw. sucht bei eigenen Filmen nach „<Titel> film“. Der Service Worker speichert die Bilder von `upload.wikimedia.org` im Cache `posters-v1` (max. 200, bleibt über Updates erhalten). Ohne Netz oder Treffer zeigt die App die Emoji-Kachel – das ist die einzige bewusste Ausnahme von „alles offline“ und rein optional.

## Ideen für Erweiterungen
- **Kalender/Termine:** neues Modul mit `summarizeDay` (Monatsübersicht) und `reminderNote` (Morgen-Erinnerung). Die Hooks `loadData()` und `launch()` sind dafür schon vorhanden.
- **Erinnerungen:** Notification API (nur bei geöffneter/installierter App zuverlässig).
- **Weitere Bereiche:** eigener Ordner `js/modules/<bereich>/`, eigener `registerArea`.
