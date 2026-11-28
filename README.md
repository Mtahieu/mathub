# Mathub

Persönlicher Hub als installierbare Web-App (PWA) mit zwei Bereichen: **Filme** (gemeinsame Merkliste & Entscheidungshilfe für den Filmabend) und **Kochen** (Rezepte, Wochenplan, Einkaufsliste). Design frei wählbar.

**Datenschutz:** Mathub hat keinen Server und kein Konto. Alle Einträge liegen ausschließlich im Speicher deines Browsers auf deinem Handy (IndexedDB). Dieses Repository enthält nur den Programmcode, niemals deine Daten.

## Auf dem Handy installieren (Android)

1. In Chrome öffnen: **https://mtahieu.github.io/mathub/**
2. Menü (⋮) → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.
3. Mathub erscheint als App-Symbol und funktioniert danach auch **offline**.

> Wichtig: Immer über das installierte App-Symbol öffnen. Daten in einem anderen Browser oder Inkognito-Tab sind getrennt.

## Updates

Neue Versionen werden automatisch erkannt. Beim Öffnen erscheint oben **„Neue Version verfügbar“** → *Aktualisieren*. Deine Daten bleiben erhalten.

## Daten sichern

Alle Daten liegen nur auf dem Handy. Filme sowie gegessene und bewertete Rezepte teilst du **per WhatsApp** (Link antippen = übernehmen) – so liegen sie auch bei den anderen. Einkaufsliste und Einstellungen gehen verloren, wenn die Browserdaten gelöscht werden.

## Funktionen (Version 0.19)

| Bereich | Was du machen kannst |
|---|---|
| **Home** | Begrüßung, bei jedem Start ein neues englisches Filmzitat oder ein alberner Spruch, darunter „Heute in Karlsruhe“ (Veranstaltungen von keepkarlsruheboring.de, heute & morgen, offline mit letztem Stand); Zahnrad → Einstellungen |
| **Filme** | neue Filme automatisch mit Wikipedia-Infos; Merkliste mit Titelbildern (von Wikipedia, offline gespeichert), Kategorien & Filter, ausführlichen Infos, „gesehen“-Haken, Bewertung und eigenen Filmen; mehrere auswählen → „Hilf mir zu entscheiden!“ fragt Stimmung, Zeit und Energie ab und lost den Film für heute Abend aus |
| **Kochen** | Appetitliche Rezeptübersicht: „Lust auf …?“-Rezept des Tages, Themen-Karussells (Schnell, Wohlfühlessen, Proteinbomben, Heißluftfritteuse, Frühstück, Snacks), großes Bildraster mit Kurztexten; gezeichnete Bilder mit Licht & Dampf; „Gegessen“ per ✓ (schon gegessene eingeklappt), danach bewerten; Personenzahl wählbar; Einkaufsliste |
| **Teilen** | Nach jeder Änderung Banner „Jetzt teilen“ → WhatsApp öffnet sich (auf Wunsch direkt im Chat) mit Link; die andere Person tippt ihn an und Mathub übernimmt Filme, Gesehen, Bewertungen, „Heute Abend“ und gegessene Rezepte – ohne Konto |
| **Design** | 9 Farbschemata (Mint, Kino, Popcorn, Ozean, Lavendel, Neon, Retro, Wald, Tomate) oder eigene Akzentfarbe, Hell/Dunkel/System, Form (rund, extra weich, kantig), Schrift (modern, klassisch, Schreibmaschine, verspielt) |
| **Erinnerungen** | Push um 7:30 und 20:30 Uhr: Film für heute Abend, sonst ein Spruch |
| **Einstellungen** | Design, Name, Erinnerungen |

## Entwicklung

Kein Build-Schritt, keine Abhängigkeiten – reines HTML/CSS/JavaScript (ES-Module).

```bash
python3 -m http.server 8000      # lokal starten → http://localhost:8000
node tools/check.mjs             # Syntax, Versionen, Offline-Cache prüfen
node tools/bump-version.mjs 0.2.0 "Was ist neu"
```

Aufbau und Erweiterung: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)
