# Changelog

## 0.5.0 – 2026-11-17

- **Ernährung komplett neu – ohne manuelle Eingabe:** statt Mahlzeiten zu tracken gibt es jetzt
  - **Rezepte:** 51 Rezepte (33 vegan) mit illustrierten Bildern, Zutaten, Schritten, Portionsrechner und geschätzten Nährwerten. Filter: Suche (auch nach Zutaten), Mahlzeit, Vegan/Vegetarisch/Ohne Fleisch, Zeit, Kalorien, Protein, Küche, Eigenschaften (Meal-Prep, One-Pot, Günstig, Ohne Kochen …), Favoriten, Sortierung.
  - **Wochenplan:** generiert Frühstück, Mittag, Abend und Snacks passend zum Kalorien- und Proteinziel. An Bürotagen (Standard Di–Do) ist mittags die Kantine (Salatbowl + Dessert ≈ 850 kcal) eingeplant, an Remote-Tagen schnelle Rezepte oder Reste vom Vorabend. Mahlzeiten tauschen, auswählen, fixieren.
  - **Einkaufsliste** aus dem Wochenplan, nach Supermarkt-Bereichen sortiert, zum Abhaken und Teilen.
  - Rezepte bewerten: gute kommen öfter, schlechte nicht mehr in den Plan.
- „Heute“ zeigt die Mahlzeiten des Tages mit geschätzten Kalorien; die Morgen-Erinnerung nennt Mittag- und Abendessen.
- **Schlaf** ist jetzt ein eigener Bereich (Mehr → Schlaf), Daten unverändert.
- Kalorien/Protein sind keine Tagesziele mehr (nichts einzugeben); Fortschritt zeigt die geschätzten Werte laut Plan.
- Alte Ernährungseinträge bleiben gespeichert, werden aber nicht mehr angezeigt.

## 0.4.0 – 2026-11-17

- **Wassertracking entfernt** (Karte, Tagesziel, Diagramm, Einstellung). Früher eingetragene Werte bleiben gespeichert, werden aber nicht mehr angezeigt.
- **Wiegen ist optional:** kein tägliches Tagesziel mehr. Gewicht kann weiterhin auf „Heute“ und unter Körperwerte eingetragen werden; als Ziel lässt es sich in den Einstellungen wieder einschalten.
- Bereich heißt jetzt „Ernährung & Schlaf“.
- Datenmigration 2: übernimmt die beiden Änderungen in bestehende Einstellungen.

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
