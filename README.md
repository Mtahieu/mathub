# Mathub

Persönlicher Hub als installierbare Web-App (PWA). Erster Bereich: **Fitness** – Physio- und Krafttraining, Körperwerte, Ernährung, Schlaf, Serien und Verlaufsdiagramme.

**Datenschutz:** Mathub hat keinen Server und kein Konto. Alle Einträge liegen ausschließlich im Speicher deines Browsers auf deinem Handy (IndexedDB). Dieses Repository enthält nur den Programmcode, niemals deine Daten.

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

## Funktionen (Version 0.5)

| Bereich | Was du machen kannst |
|---|---|
| **Heute** | Tagesziele auf einen Blick, Training, Essensplan des Tages, Schlaf und (optional) Gewicht; frühere Tage nachtragen |
| **Training** | Übungen (Physio, Kraft, Mobilität, Cardio) mit Sätzen/Wiederholungen/Gewicht oder Zeit, Beschwerden 0–10, Wochenplan, Vorlagen |
| **Physio-Katalog** | Übungen für die Hüfte nach FAI-OP mit Anleitung, Filtern und Sterne-Bewertung |
| **Erinnerungen** | Push um 7:30 und 20:30 Uhr mit deinen offenen Tageszielen |
| **Ernährung** | Rezepte mit Bildern & vielen Filtern (inkl. vegan), Wochenplan mit Kantine an Bürotagen, Einkaufsliste – alles ohne Eingeben, Kalorien geschätzt |
| **Schlaf** | Stunden & Qualität der letzten Nacht |
| **Körperwerte** | Gewicht, Körperfett, frei wählbare Umfänge, Trend (Ø 7 Tage, kg/Woche) |
| **Fortschritt** | Serien, 16-Wochen-Übersicht, Zielquoten, Meilensteine, Diagramme |
| **Kalender** | Monatsansicht mit Zielerfüllung und Tagesdetails |
| **Einstellungen** | Profil, Ziele inkl. Richtwert-Rechner, Serien-Schwelle, Hell/Dunkel, Backup |

## Entwicklung

Kein Build-Schritt, keine Abhängigkeiten – reines HTML/CSS/JavaScript (ES-Module).

```bash
python3 -m http.server 8000      # lokal starten → http://localhost:8000
node tools/check.mjs             # Syntax, Versionen, Offline-Cache prüfen
node tools/bump-version.mjs 0.2.0 "Was ist neu"
```

Aufbau und Erweiterung: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)
