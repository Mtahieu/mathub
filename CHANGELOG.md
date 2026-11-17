# Changelog

## 0.3.0 – 2026-11-17

- **Neuer Bereich „Job“** (Mehr → Job): täglicher Check-in mit drei Fragen auf einer 1–10-Skala mit Emojis – „Wie viel habe ich geleistet?“, „Wie zufrieden bin ich heute mit meinem Job?“, „Fühle ich mich gebraucht?“ – plus Highlight und Lowlight des Tages.
- Überblick mit Ø 7 und 30 Tagen, Verlauf je Frage (30 Tage / 90 Tage / 1 Jahr), Liste der letzten Highlights & Lowlights.
- **Schlaf & Zufriedenheit:** vergleicht die Job-Zufriedenheit nach genug und nach zu wenig Schlaf (ab 5 Tagen mit beiden Einträgen).
- Auf „Heute“: Job-Kachel mit Schnellzugriff; an Werktagen zählt der Check-in ab heute als Tagesziel (frühere Tage und Serien bleiben unverändert). Diagramme auch unter „Fortschritt“, Tageszusammenfassung im Kalender.
- Keine Datenmigration nötig: neuer Eintragstyp `job`.

## 0.2.0 – 2026-11-17

- **Physio-Katalog „Hüfte nach FAI-OP“** (Training → Katalog): 29 Übungen für Beweglichkeit, Aktivierung, Rumpf, Kraft, Stabilität und Sportvorbereitung, mit Anleitung, Tipps und Hinweisen; Filter nach Schwerpunkt und Level; mit einem Tipp in die eigenen Übungen übernehmen.
- **Bewertungen:** 1–5 Sterne im Katalog und beim Eintragen einer Übung. Favoriten stehen oben, schlecht bewertete Übungen rutschen nach unten; Verlauf der Bewertungen wird gespeichert.
- **Push-Erinnerungen** um 7:30 und 20:30 Uhr: GitHub-Workflow sendet ein leeres Wecksignal, der Text entsteht lokal aus den Tageszielen. Einrichtung unter Einstellungen → Erinnerungen.
- Service Worker läuft jetzt als ES-Modul; kein unnötiges Neuladen beim ersten Start.

## 0.1.0 – 2026-11-17

- Erste Version von Mathub mit dem Bereich **Fitness**.
- Startseite „Heute“ mit Tageszielen, Serie und Schnell-Eingaben; Tage nachtragen.
- Training: Übungsbibliothek (Physio, Kraft, Mobilität, Cardio), Sätze/Wiederholungen/Gewicht/Zeit, Beschwerden 0–10, Wochenplan, Kraft-Vorlagen.
- Ernährung & Alltag: Mahlzeiten mit Kalorien/Protein, Favoriten, Wasser, Schlaf.
- Körperwerte: Gewicht, Körperfett, Umfänge, Trend.
- Fortschritt: Serien, 16-Wochen-Übersicht, Zielquoten, Meilensteine, Diagramme.
- Kalender-Monatsansicht, Einstellungen mit Richtwert-Rechner, Backup/Wiederherstellung.
- Offline-fähige PWA mit Update-Hinweis.
