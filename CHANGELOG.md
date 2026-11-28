# Changelog

## 0.13.0 – 2026-11-28

- **Mathub neu aufgestellt:** Unten gibt es nur noch **Home, Filme und Kochen**. Schlaf, Körperwerte, Supplements, Job, Fortschritt, Monatsübersicht und „Mehr“ sind entfernt – früher eingetragene Daten bleiben in der Datenbank und im Backup erhalten, werden aber nicht mehr angezeigt.
- **Neue Startseite:** Begrüßung je nach Tageszeit und bei jedem App-Start ein neues englisches Filmzitat oder ein alberner Spruch (nie zweimal hintereinander derselbe). Zahnrad oben rechts → Einstellungen.
- **Design frei wählbar** (Einstellungen → Design): 9 Farbschemata als Vorschläge – Mint, Kino, Popcorn, Ozean, Lavendel, Neon, Retro, Wald, Tomate – oder eine eigene Akzentfarbe; dazu Hell/Dunkel/System, Form (rund, extra weich, kantig) und Schrift (modern, klassisch, Schreibmaschine, verspielt). Änderungen wirken sofort.
- **Ernährung heißt jetzt „Kochen“.** Rezepte zeigen **echte Fotos der Gerichte** von Wikipedia/Wikimedia Commons (frei lizenziert, gebündelt geladen und offline gespeichert); ohne Netz bleibt die Illustration. Die Quelle steht im Rezept.
- **Erinnerungen** zeigen morgens das Essen des Tages und den Film für heute Abend, sonst einen Spruch.
- Einstellungen aufgeräumt: Gewicht fürs Profil (für den Kalorien-Richtwert), Ziele nur noch Kalorien & Protein fürs Kochen.
- Keine Datenmigration nötig.

## 0.12.0 – 2026-11-28

- **Gemeinsame Filmliste über Google Drive:** Jede Person meldet sich in ihrer App mit dem eigenen Google-Konto an; die Liste liegt als Datei in einem geteilten Drive-Ordner. Neue Filme, Gesehen-Haken, Bewertungen, Notizen, Löschungen und „Heute Abend“ sind nach wenigen Sekunden bei allen. Einrichtung unter Filme → ☁️: einmalig Client-ID anlegen, Liste erstellen, Einladungslink teilen – die anderen öffnen nur den Link.
- Beim Beitreten werden vorhandene Filme übernommen, ohne doppelt zu erscheinen. Ohne Netz geht nichts verloren – Änderungen werden später abgeglichen. Neue Film-Eigenschaften künftiger Versionen werden automatisch mitgeteilt.
- **Neue Filme werden automatisch mit Wikipedia abgeglichen:** Jahr, Laufzeit, Regie, Besetzung, Land, Kategorien, deutsche Beschreibung, Titelbild; Stimmung und Intensität werden vorgeschlagen. Knopf „Mit Wikipedia abgleichen“ im Bearbeiten-Dialog.
- In den Film-Details steht, wer zuletzt etwas geändert hat.
- Intern: Löschen von Filmen als Markierung, feste IDs für Katalogfilme (keine Dopplungen über Geräte hinweg), Zeitstempel für „Heute Abend“. Keine Datenmigration nötig.

## 0.11.1 – 2026-11-28

- **Filme: „Smile 2“** (2024, Parker Finn) aufgenommen – Horror/Thriller, Stimmung Gruseln & Spannung, Intensität „heftig“, mit Beschreibung und Titelbild von Wikipedia.
- Datenmigration 5 ergänzt den Film auf Geräten mit bestehender Liste (gesehene Filme und Bewertungen bleiben unverändert).

## 0.11.0 – 2026-11-25

- **Filme: „Puss in Boots: The Last Wish“** (Der gestiefelte Kater: Der letzte Wunsch, 2022) aufgenommen. Datenmigration 4 ergänzt ihn auf Geräten mit bestehender Liste.
- **Echte Titelbilder:** Die App lädt die Filmposter auf dem Handy von Wikipedia und speichert sie für offline. Auch für eigene Filme wird automatisch ein Bild gesucht. Ohne Netz erscheint wie bisher die Emoji-Kachel. Die Bilder liegen nicht im Repo (Urheberrecht).
- **Ausführliche Infos:** neue Beschreibungen (spoilerfrei), „Warum anschauen?“, Land, Besetzung, deutscher Titel und Link zum Wikipedia-Artikel.
- **Kategorien:** Komödie, Drama, Horror, Science-Fiction, Fantasy, Animation, Abenteuer, Action, Superhelden, Satire, Romantik, Krimi, Familie, Thriller – in der Liste, in den Details, als Filter oben auf der Filme-Seite und beim Anlegen eigener Filme.

## 0.10.1 – 2026-11-23

- **Filme:** „Sinners“ von der Liste genommen, **„Watchmen“** (2009, Zack Snyder) aufgenommen – mit Infos, Stimmung (Spannung, Nachdenken) und Intensität „heftig“.
- Datenmigration 3 übernimmt das auf Geräten, auf denen die Startliste schon angelegt ist (gesehene Filme, Bewertungen und eigene Filme bleiben unverändert).

## 0.10.0 – 2026-11-18

- **Termine (Google Kalender) entfernt:** Tab, Heute-Karte, Termine in Monatsübersicht und Morgen-Erinnerung sind weg. Tab-Leiste: Heute, Ernährung, Filme, Mehr.
- Früher geladene Termine bleiben ungenutzt in der lokalen Datenbank liegen; keine Datenmigration nötig.

## 0.9.1 – 2026-11-18

- **Fortschritt** ist jetzt unter **Mehr → Allgemein** statt als eigener Tab; die Tab-Leiste hat wieder 5 Einträge (Heute, Termine, Ernährung, Filme, Mehr).
- Die Serien-Flamme oben auf „Heute“ führt direkt zum Fortschritt.

## 0.9.0 – 2026-11-18

- **Neuer Tab „Filme“** (Bereich Freizeit):
  - Startliste: The Lobster, Poor Things, Lammbock, Sinners, The Substance – mit Jahr, Laufzeit, Regie, Besetzung, Kurzbeschreibung, Stimmung und Intensität. Eigene Filme hinzufügen, bearbeiten, löschen.
  - **Gesehen** mit einem Tipp abhaken (mit „Rückgängig“); gesehene Filme wandern nach unten, mit Datum und Sterne-Bewertung.
  - **„Hilf mir zu entscheiden!“** ab 2 ausgewählten Filmen: Stimmung (Lachen, Gruseln, Nachdenken, Skurril, Spannung), Zeit (max. 2 Std.) und Energie (müde/hellwach) abfragen, dann wird unter den passendsten Filmen ausgelost – mit Begründung und Chancen. Oder reiner Zufall.
  - Der Gewinner steht als „Heute Abend“ auf der Filme-Seite und auf „Heute“; gesehene Filme erscheinen in der Monatsübersicht.

## 0.8.1 – 2026-11-18

- **Supplements: Vitamin B6** im Katalog (Gesundheit → Supplements): Wirkung, Lebensmittelquellen, Studienlage, Bedarf (DGE 1,4/1,6 mg), aktuelle BfR-Höchstmenge 0,9 mg/Tag aus Nahrungsergänzung (2024, früher 3,5 mg), EFSA-Obergrenze 12 mg/Tag und Warnung vor Nervenschäden bei Überdosierung.
- Kombi-Check kennt B6 mit Magnesium (Vorsicht: viele Mg+B6-Präparate über der BfR-Höchstmenge), B12, Zink und Biotin; neuer Wirkungsbereich „Nerven“.
- Quellen ergänzt in docs/SUPPLEMENTS.md.

## 0.8.0 – 2026-11-18

- **Neues Modul „Termine“ – dein Google Kalender in Mathub** (Tab unten, ersetzt „Training“):
  - Agenda für die nächsten 7, 30 oder 90 Tage, nach Tagen gruppiert, mit Kalenderfarbe, Uhrzeit, Ort; ganztägige und mehrtägige Termine.
  - Termin antippen: Details, Ort in Karten öffnen, „In Google Kalender“. „+“ legt einen neuen Termin in Google Kalender an.
  - „Termine heute“ auf der Startseite, Termine in den Tagesdetails der Monatsübersicht und in der Morgen-Erinnerung.
  - Kalender einzeln ein-/ausblenden; Termine werden lokal gespeichert und sind offline verfügbar.
  - Nur Lesezugriff, kein Server: Einrichtung einmalig in der App mit einer eigenen Client-ID aus der Google Cloud Console (Schritt-für-Schritt-Anleitung unter Termine). Läuft der ca. 1-stündige Zugang ab, meldet Mathub beim Öffnen der Termine automatisch kurz neu an.
- **Training entfernt:** Training, Übungen, Physio-Katalog, Trainings-Wochenplan und Trainings-Diagramme sind weg. Früher eingetragene Übungen bleiben in der Datenbank und im Backup erhalten, werden aber nicht mehr angezeigt. Trainings-Ziele zählen nicht mehr für Serien und Fortschritt (auch rückwirkend).
- Bereich „Fitness“ heißt jetzt **„Gesundheit“**; der bisherige „Kalender“ heißt **„Monatsübersicht“**.
- Anmelde-Token landen nie im Backup (neu: kv-Schlüssel mit `tmp:` werden nicht exportiert).
- Keine Datenmigration nötig.

## 0.7.0 – 2026-11-17

- **Neues Modul „Supplements“** (Mehr → Supplements):
  - **Arsenal:** Mittel aus dem Katalog oder eigene anlegen – werktags, täglich, eigene Tage oder „bei Bedarf“, mit Zeitpunkt (vor der 1. Mahlzeit, zur Mahlzeit, abends, jederzeit) und Dosis.
  - **Heute:** nach Zeitpunkt gruppiert abhaken, Bedarfs-Mittel mit einem Tipp nachtragen; Hinweise, wenn heute etwas zeitlich getrennt werden sollte.
  - **Kombi-Check:** Mittel an-/abwählen – Wirkungsbereiche, Zeitplan (passend zum Intervallfasten), Kombinationshinweise und Höchstmengen passen sich live an.
  - **Wissen:** 9 Mittel mit Wirkung, Studienlage (gut/teilweise/schwach belegt), Dosierung, BfR-Höchstmengen und Warnhinweisen; Empfehlungen zu den Zielen (Kreatin, B12, Omega-3, Vitamin D, Magnesium) und was eher verzichtbar ist.
- Supplements zählen als Tagesziel, stehen auf „Heute“, in der Morgen-Erinnerung, im Kalender und als Diagramm im Fortschritt.
- Quellen der Wissensbasis: docs/SUPPLEMENTS.md.

## 0.6.0 – 2026-11-17

- **Intervallfasten:** Der Wochenplan enthält standardmäßig kein Frühstück mehr; die Kalorien verteilen sich auf Mittag, Abend und bis zu 3 Snacks (abschaltbar in den Plan-Einstellungen).
- **Küchengeräte:** Jedes Rezept kennt seine Geräte (Herd, Backofen, Heißluftfritteuse). 14 Rezepte haben eine Heißluftfritteusen-Variante, dazu 6 neue Rezepte speziell für die Heißluftfritteuse (jetzt 57 Rezepte). Neuer Filter „Küchengerät“; im Plan werden nur Rezepte mit vorhandenen Geräten genutzt, Heißluftfritteuse wird bevorzugt.
- **Auswärts essen:** Jede Mahlzeit lässt sich als „auswärts“ markieren (Schätzung ≈ 1.000 kcal), dazu ein Schnellschalter „🍽️ auswärts“ pro Tag und optional feste Auswärts-Abende.
- **Variable Einkaufsliste:** Tage auswählen, für die eingekauft wird (ab heute, ganze Woche, nur 2 Tage oder einzeln). Auswärts-Mahlzeiten und Kantine landen nie auf der Liste.
- Snacks wiederholen sich im Wochenplan seltener.

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
