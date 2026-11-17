# Architektur

Mathub ist bewusst **modular** gebaut: Jede Funktion ist ein Modul, das sich in einer Registry anmeldet. Der Kern (Startseite, Navigation, Serien, Kalender, Fortschritt) fragt die Module ab, statt sie zu kennen. Neue Bereiche – Kalender-Termine, Finanzen, Lernen, … – kommen als neue Module dazu, ohne bestehenden Code umzubauen.

```
index.html, manifest.webmanifest, sw.js   PWA-Hülle + Offline-Cache
css/app.css                                Design (CSS-Variablen, Hell/Dunkel)
js/app.js                                  Start: DB → Migrationen → Einstellungen → Router
js/version.js                              App-Version (synchron mit sw.js)
js/core/
  db.js         IndexedDB: entries / items / kv, Migrationen, Export/Import
  registry.js   Bereiche + Module, loadDays(), goalsForDay(), summarizeDay()
  streaks.js    Serien-Berechnung aus den Tageszielen aller Module
  router.js     Hash-Router (#/pfad?d=YYYY-MM-DD)
  ui.js         h()-Helfer, Icons, Sheets, Toasts, Formularfelder, Ring, Balken
  charts.js     SVG-Linien-/Balkendiagramme (offline, ohne Bibliothek)
  settings.js   Einstellungen mit Defaults
  dates.js      Datums-Helfer (lokale Tages-Schlüssel)
  backup.js     Backup-Datei erstellen/teilen/einlesen
  update.js     Service-Worker-Registrierung + Update-Banner
  push.js       Push einrichten (VAPID-Schlüssel lokal erzeugen, Abo, Code für GitHub-Secret)
  reminders.js  Text der Erinnerungen aus den Tageszielen (läuft im Service Worker)
js/modules/
  index.js      ← hier werden Bereiche und Module eingebunden
  hub/          bereichsübergreifend: today, progress, calendar, more, settings
  fitness/      training, nutrition (Rezepte/Wochenplan/Einkauf), food-data (Zutaten & Rezepte),
                sleep, body, physio-catalog (Daten), ratings (Bewertungen)
  job/          checkin (täglicher Job-Check-in)
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
| `body` (1/Tag) | `{weight, bodyFat, measures:{chest,…}, note}` |
| `exercise` | `{exerciseId, sets:[{reps, weight, seconds}], done, pain, note}` |
| `food` (1/Tag) | `{items:[{id, name, kcal, protein, t}]}` |
| `water` (1/Tag) | `{ml}` – **nicht mehr genutzt** seit 0.3.0 (Altdaten bleiben erhalten) |
| `sleep` (1/Tag) | `{hours, quality}` – Nacht *vor* dem Datum |
| `job` (1/Tag) | `{leistung, zufriedenheit, gebraucht, highlight, lowlight}` – Werte 1–10 oder `null` |
| item `exercise` | `{name, category, mode, weighted, targetSets, targetReps, targetSeconds, days[0–6], trackPain, notes, archived}` |
| `mealplan` (1/Woche, date = Montag) | `{days:{0–6:{fruehstueck, mittag, abend, snack[]}}, checked, extras, shopDays?}` – Slot `{r: rezeptId|'kantine'|'auswaerts', rest?, locked?}` |
| `food` (1/Tag) | **nicht mehr genutzt** seit 0.5.0 |
| item `food-fav` | **nicht mehr genutzt** seit 0.5.0 |
| `supplements` (1/Tag) | `{taken:{itemId: Zeitstempel}}` |
| item `supplement` | `{catalogId?, name, dose, slot, days[0–6], mode:'plan'|'bedarf'}` |
| item `rating` | `{key, stars, history:[{date, stars}]}` – key = `catalogId` oder Übungs-id |
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
  charts: [{ id, title, render(el, { from, to, data }) {} }],  // Seite „Fortschritt“
});
```

`ctx` in `render`: `{ path, query, date, navigate(path, query, {replace}), refresh() }`.
`data` (aus `loadDays`): `{ get(date, type), first(date, type), byDay, exercises, itemsOf(kind), settings }`.

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

## Ideen für Erweiterungen
- **Kalender/Termine:** `entries` type `event` (`{title, time, note}`) bzw. items kind `event` für Serien; Modul liefert `summarizeDay` + eigene Ansicht. Die Monatsansicht in `hub/calendar.js` zeigt Zusammenfassungen schon an.
- **Erinnerungen:** Notification API (nur bei geöffneter/installierter App zuverlässig).
- **Weitere Bereiche:** eigener Ordner `js/modules/<bereich>/`, eigener `registerArea`.
