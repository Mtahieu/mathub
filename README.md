# Mathub

Persönlicher Hub als installierbare Web-App (PWA): Termine aus dem Google Kalender, Ernährung, Schlaf, Supplements, Körperwerte, Job-Check-in, Filme-Merkliste, Serien und Verlaufsdiagramme.

**Datenschutz:** Mathub hat keinen Server und kein Konto. Alle Einträge liegen ausschließlich im Speicher deines Browsers auf deinem Handy (IndexedDB). Termine holt die App direkt bei Google (nur Lesezugriff) und speichert sie ebenfalls nur lokal. Dieses Repository enthält nur den Programmcode, niemals deine Daten.

## Auf dem Handy installieren (Android)

1. In Chrome öffnen: **https://mtahieu.github.io/mathub/**
2. Menü (⋮) → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.
3. Mathub erscheint als App-Symbol und funktioniert danach auch **offline**.

> Wichtig: Immer über das installierte App-Symbol öffnen. Daten in einem anderen Browser oder Inkognito-Tab sind getrennt.

## Updates

Neue Versionen werden automatisch erkannt. Beim Öffnen erscheint oben **„Neue Version verfügbar“** → *Aktualisieren*. Deine Daten bleiben erhalten.

## Backup

*Mehr → Einstellungen → Daten & Backup*:
- **Backup teilen** öffnet den Android-Teilen-Dialog (z. B. „In Drive speichern“).
- **Backup wiederherstellen** spielt eine Datei wieder ein (zusammenführen oder ersetzen).

Die App erinnert dich nach 14 Tagen an ein neues Backup. Ohne Backup gehen die Daten verloren, wenn du die Browserdaten löschst oder das Handy wechselst.

## Funktionen (Version 0.9)

| Bereich | Was du machen kannst |
|---|---|
| **Heute** | Tagesziele auf einen Blick, Termine des Tages, Essensplan, Schlaf und (optional) Gewicht; frühere Tage nachtragen |
| **Termine** | Google Kalender (nur Lesen): Agenda für 7/30/90 Tage, Kalender auswählen, Details mit Ort & Link, offline verfügbar. Einrichtung einmalig in der App (eigene Client-ID) |
| **Erinnerungen** | Push um 7:30 und 20:30 Uhr mit deinen offenen Tageszielen, morgens inkl. Terminen |
| **Ernährung** | Rezepte mit Bildern & vielen Filtern (vegan, Heißluftfritteuse …), Wochenplan für Intervallfasten mit Kantine an Bürotagen und Auswärts-Essen, variable Einkaufsliste – ohne Eingeben, Kalorien geschätzt |
| **Schlaf** | Stunden & Qualität der letzten Nacht |
| **Supplements** | Arsenal & Einnahmeplan, tägliches Abhaken, Kombi-Check mit Wirkung & Wechselwirkungen, recherchiertes Wissen |
| **Körperwerte** | Gewicht, Körperfett, frei wählbare Umfänge, Trend (Ø 7 Tage, kg/Woche) |
| **Fortschritt** | Serien, 16-Wochen-Übersicht, Zielquoten, Meilensteine, Diagramme |
| **Filme** | Merkliste mit „gesehen“-Haken, Bewertung und eigenen Filmen; mehrere auswählen → „Hilf mir zu entscheiden!“ fragt Stimmung, Zeit und Energie ab und lost den Film für heute Abend aus |
| **Monatsübersicht** | Monatsansicht mit Zielerfüllung, Tagesdetails und Terminen |
| **Einstellungen** | Profil, Ziele inkl. Richtwert-Rechner, Serien-Schwelle, Hell/Dunkel, Backup |

## Entwicklung

Kein Build-Schritt, keine Abhängigkeiten – reines HTML/CSS/JavaScript (ES-Module).

```bash
python3 -m http.server 8000      # lokal starten → http://localhost:8000
node tools/check.mjs             # Syntax, Versionen, Offline-Cache prüfen
node tools/bump-version.mjs 0.2.0 "Was ist neu"
```

Aufbau und Erweiterung: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)
