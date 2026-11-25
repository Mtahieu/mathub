# Hinweise für Claude (Arbeit an Mathub)

Mathub ist eine persönliche PWA des Repo-Besitzers (GitHub: Mtahieu), gehostet über GitHub Pages unter https://mtahieu.github.io/mathub/. Sprache der App, Doku und Commits: **Deutsch**.

## Grundsätze
- **Keine persönlichen Daten ins Repo.** Werte (Gewicht, Ziele, Übungen) gibt der Nutzer in der App ein; sie liegen nur in IndexedDB auf dem Handy.
- **Kein Build, keine Abhängigkeiten, keine CDNs.** Alles muss offline funktionieren (Vanilla JS, ES-Module). Einzige Ausnahme: optionale Filmposter von Wikipedia (siehe ARCHITEKTUR.md) – ohne Netz gibt es eine Ersatzkachel.
- **Modular erweitern:** neue Funktionen als Modul (siehe `docs/ARCHITEKTUR.md`), nicht in den Kern schreiben.
- **Daten nie brechen:** Struktur-Änderungen nur mit Migration (`db.js`: `DATA_VERSION` + `MIGRATIONS`). Bestehende `type`/`kind`-Formate rückwärtskompatibel halten.
- Mobile first (Android/Chrome), große Touch-Ziele, Hell/Dunkel über CSS-Variablen.

## Ablauf bei jeder Änderung
1. Code ändern / Modul ergänzen (neue Dateien in `sw.js` → `PRECACHE`).
2. `node tools/check.mjs` muss grün sein.
3. Optional testen: `python3 -m http.server 8000` + Headless-Chrome mit Handy-Viewport (390×844).
4. `node tools/bump-version.mjs X.Y.Z "Kurzbeschreibung"` – **ohne Versionssprung sieht das Handy kein Update.**
5. CHANGELOG-Eintrag ausformulieren, committen, pushen. GitHub Pages veröffentlicht automatisch.
6. Bei Datenmigrationen dem Nutzer vorher ein Backup empfehlen.
