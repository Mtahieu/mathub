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
  hub/          bereichsübergreifend: today, progress, calendar (Monatsübersicht), more, settings
  termine/      termine (Google Kalender: Agenda, Heute-Karte), google-api (Anmeldung & Abgleich)
  fitness/      Bereich „Gesundheit“: nutrition (Rezepte/Wochenplan/Einkauf), food-data (Zutaten & Rezepte),
                sleep, body, supplements, supplement-data, ratings (Bewertungen)
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
| `exercise` | `{exerciseId, sets:[…], done, pain, note}` – **nicht mehr genutzt** seit 0.8.0 (Training entfernt, Altdaten bleiben erhalten) |
| `food` (1/Tag) | `{items:[{id, name, kcal, protein, t}]}` |
| `water` (1/Tag) | `{ml}` – **nicht mehr genutzt** seit 0.3.0 (Altdaten bleiben erhalten) |
| `sleep` (1/Tag) | `{hours, quality}` – Nacht *vor* dem Datum |
| `job` (1/Tag) | `{leistung, zufriedenheit, gebraucht, highlight, lowlight}` – Werte 1–10 oder `null` |
| item `exercise` | **nicht mehr genutzt** seit 0.8.0 |
| `mealplan` (1/Woche, date = Montag) | `{days:{0–6:{fruehstueck, mittag, abend, snack[]}}, checked, extras, shopDays?}` – Slot `{r: rezeptId|'kantine'|'auswaerts', rest?, locked?}` |
| `food` (1/Tag) | **nicht mehr genutzt** seit 0.5.0 |
| item `food-fav` | **nicht mehr genutzt** seit 0.5.0 |
| `supplements` (1/Tag) | `{taken:{itemId: Zeitstempel}}` |
| item `supplement` | `{catalogId?, name, dose, slot, days[0–6], mode:'plan'|'bedarf'}` |
| item `rating` | `{key, stars, history:[{date, stars}]}` – key = Rezept (früher auch Übungen) |
| kv `gcal` | Google Kalender: `{clientId, account, calendars:[{id, name, color, on, primary}], lastSync, lastError, needsLogin}` |
| kv `gcal:events` | zuletzt geladene Termine `{from, to, syncedAt, list:[{id, cal, title, start, end, allDay, loc, link, desc}]}` |
| kv `tmp:…` | kurzlebig, **nicht im Backup** (z. B. `tmp:gcal:token` = Zugriffs-Token, ca. 1 h gültig) |
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

## Google Kalender

```
Mathub ──Weiterleitung (Client-ID, scope calendar.readonly)──▶ accounts.google.com
   ▲                                                              │
   └──────── #access_token=… (ca. 1 h gültig) ◀───────────────────┘
Mathub ──fetch mit Bearer-Token──▶ www.googleapis.com/calendar/v3 ──▶ kv 'gcal:events'
```
- Kein Server, keine Bibliothek: OAuth-„Token“-Ablauf per Weiterleitung. `launch()` des Moduls liest das Token aus dem URL-Fragment, bevor der Router startet; `state` schützt vor fremden Weiterleitungen.
- Die **Client-ID** legt der Nutzer in seiner eigenen Google Cloud Console an (Anleitung in der App) und gibt sie in der App ein – sie steht nicht im Repo. Autorisierte Quelle `https://mtahieu.github.io`, Weiterleitungs-URI `https://mtahieu.github.io/mathub/`.
- Ohne Server gibt es kein Refresh-Token. Ist das Token abgelaufen, meldet die Seite „Termine“ still neu an (`prompt=none`, höchstens alle 5 Min.); verlangt Google eine Eingabe, erscheint „Anmelden“.
- Abgleich: 30 Tage zurück bis 120 Tage voraus, alle 10 Min. beim Öffnen von „Termine“ oder „Heute“ (solange das Token gilt). Termine stehen danach offline, in der Monatsübersicht und in der Morgen-Erinnerung zur Verfügung.

## Ideen für Erweiterungen
- **Termine anlegen** direkt in Mathub (Scope `calendar.events`) – aktuell öffnet „+“ den Google Kalender.
- **Erinnerungen:** Notification API (nur bei geöffneter/installierter App zuverlässig).
- **Weitere Bereiche:** eigener Ordner `js/modules/<bereich>/`, eigener `registerArea`.
