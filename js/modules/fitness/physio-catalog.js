// Übungskatalog: Hüfte nach Arthroskopie bei FAI (femoroacetabuläres Impingement).
// Allgemeine, verbreitete Reha-Übungen – kein Ersatz für den individuellen Plan von Physio/Ärztin.
// Felder: id (stabil, nie ändern – Bewertungen hängen daran), name, focus[], level 1–3, mode, sets, reps|seconds,
//         perSide, freq ('daily'|'3x'), steps[], tip, caution.

export const CATALOG_INFO = {
  title: 'Hüfte nach FAI-OP',
  note: 'Allgemeine Übungen, wie sie in Reha-Programmen nach Hüftarthroskopie üblich sind. Stimme sie mit deiner Physiotherapie ab. '
    + 'Grundregel: Leichte Anstrengung ist okay, stechender Schmerz in der Leiste oder ein Einklemmgefühl nicht – dann abbrechen oder Bewegungsumfang verkleinern. '
    + 'Tiefe Beugung kombiniert mit Einwärtsdrehen und Beinkreuzen ist die typische Impingement-Position.',
};

export const FOCUS = {
  mobil: 'Beweglichkeit',
  aktiv: 'Aktivierung',
  kraft: 'Kraft',
  stabil: 'Stabilität & Balance',
  rumpf: 'Rumpf',
  sport: 'Sportvorbereitung',
};

export const LEVELS = { 1: 'Einstieg', 2: 'Aufbau', 3: 'Fortgeschritten' };

export const CATALOG = [
  // ---------- Beweglichkeit ----------
  {
    id: 'fai-ergometer', name: 'Ergometer locker', focus: ['mobil'], level: 1, mode: 'time', sets: 1, seconds: 900, freq: 'daily',
    steps: ['Sattel eher hoch einstellen, damit die Hüfte nicht zu stark beugt.', 'Locker mit wenig Widerstand treten.'],
    tip: 'Gutes Aufwärmen vor dem Programm.',
    caution: 'Sattel nicht zu tief – keine tiefe Hüftbeugung.',
  },
  {
    id: 'fai-vierfuessler-schaukel', name: 'Vierfüßler-Schaukeln', focus: ['mobil'], level: 1, mode: 'reps', sets: 2, reps: 12, freq: 'daily',
    steps: ['Vierfüßlerstand, Hände unter den Schultern, Knie unter der Hüfte.', 'Rücken neutral halten und das Gesäß langsam Richtung Fersen schieben.', 'Nur so weit, wie es angenehm bleibt, dann zurück.'],
    tip: 'Langsam und gleichmäßig atmen.',
    caution: 'Stoppen, bevor ein Druckgefühl vorne in der Leiste entsteht.',
  },
  {
    id: 'fai-zirkumduktion', name: 'Hüftkreisen im Vierfüßlerstand', focus: ['mobil'], level: 1, mode: 'reps', sets: 2, reps: 10, perSide: true, freq: 'daily',
    steps: ['Vierfüßlerstand.', 'Ein Knie leicht vom Boden lösen und kleine, kontrollierte Kreise mit dem Knie beschreiben.', 'Richtung wechseln.'],
    tip: 'Becken bleibt ruhig – die Bewegung kommt aus der Hüfte.',
    caution: 'Kreise klein halten, schmerzfreier Bereich.',
  },
  {
    id: 'fai-bauchlage', name: 'Bauchlage (Hüftstreckung)', focus: ['mobil'], level: 1, mode: 'time', sets: 2, seconds: 120, freq: 'daily',
    steps: ['Flach auf den Bauch legen, Stirn auf die Hände.', 'Entspannt liegen und die Hüftvorderseite sanft dehnen lassen.'],
    tip: 'Fortgeschritten: auf die Unterarme aufstützen.',
    caution: 'Bei Ziehen im unteren Rücken ein Kissen unter den Bauch.',
  },
  {
    id: 'fai-hueftbeuger-dehnung', name: 'Hüftbeuger-Dehnung im Halbkniestand', focus: ['mobil'], level: 2, mode: 'time', sets: 3, seconds: 30, perSide: true, freq: '3x',
    steps: ['Halbkniestand, operiertes Bein hinten auf einer weichen Unterlage.', 'Gesäß anspannen und das Becken leicht aufrichten (Steißbein nach unten).', 'Minimal nach vorn schieben, bis vorne an der Hüfte eine Dehnung spürbar ist.'],
    tip: 'Die Beckenaufrichtung ist wichtiger als die Weite.',
    caution: 'Dehnung ja, Schmerz nein. Kein Hohlkreuz.',
  },
  {
    id: 'fai-9090', name: '90/90-Hüftwechsel', focus: ['mobil'], level: 2, mode: 'reps', sets: 2, reps: 8, freq: '3x',
    steps: ['Aufrecht sitzen, beide Knie ca. 90° gebeugt, Füße breit aufgestellt.', 'Beide Knie gemeinsam zu einer Seite ablegen, dann zur anderen.', 'Mit den Händen hinter dem Körper abstützen.'],
    tip: 'Langsam, ohne Schwung.',
    caution: 'Die Einwärtsdrehung nur im schmerzfreien Bereich – im Zweifel Knie nicht ganz ablegen.',
  },
  {
    id: 'fai-gesaess-dehnung', name: 'Gesäß-Dehnung in Rückenlage', focus: ['mobil'], level: 2, mode: 'time', sets: 2, seconds: 30, perSide: true, freq: '3x',
    steps: ['Rückenlage, beide Füße aufgestellt.', 'Den Knöchel der Dehnseite aufs andere Knie legen (Zahl 4).', 'Dehnseite-Knie sanft nach außen sinken lassen; bei Bedarf das untere Bein leicht anheben.'],
    tip: 'Ruhig weiteratmen.',
    caution: 'Nicht stark zur Brust ziehen – Leistenschmerz ist ein Stoppsignal.',
  },

  // ---------- Aktivierung ----------
  {
    id: 'fai-gesaess-iso', name: 'Gesäß anspannen (isometrisch)', focus: ['aktiv'], level: 1, mode: 'reps', sets: 2, reps: 10, freq: 'daily',
    steps: ['Rückenlage oder Stand.', 'Gesäßmuskeln fest zusammenziehen, 5 Sekunden halten.', 'Lösen und kurz pausieren.'],
    tip: 'Funktioniert auch nebenbei im Alltag.',
  },
  {
    id: 'fai-bruecke', name: 'Brücke', focus: ['aktiv', 'kraft'], level: 1, mode: 'reps', sets: 3, reps: 12, freq: '3x',
    steps: ['Rückenlage, Füße hüftbreit aufgestellt.', 'Gesäß anspannen und das Becken anheben, bis Knie, Hüfte und Schultern eine Linie bilden.', 'Kurz halten, langsam absenken.'],
    tip: 'Druck über die Fersen, nicht über die Zehen.',
    caution: 'Kein Hohlkreuz oben – Bauch leicht fest.',
  },
  {
    id: 'fai-muschel', name: 'Muschel (Clamshell)', focus: ['aktiv'], level: 1, mode: 'reps', sets: 3, reps: 15, perSide: true, freq: '3x',
    steps: ['Seitlage, Knie gebeugt, Fersen aufeinander.', 'Oberes Knie öffnen, Fersen bleiben zusammen.', 'Langsam zurück.'],
    tip: 'Steigerung: Mini-Band oberhalb der Knie.',
    caution: 'Becken nicht nach hinten kippen lassen.',
  },
  {
    id: 'fai-abduktion-seitlage', name: 'Bein seitlich heben (Seitlage)', focus: ['aktiv'], level: 1, mode: 'reps', sets: 3, reps: 12, perSide: true, freq: '3x',
    steps: ['Seitlage, unteres Bein gebeugt, oberes gestreckt.', 'Oberes Bein leicht nach hinten und mit Ferse voran anheben.', 'Langsam absenken.'],
    tip: 'Zehen zeigen nach vorn, nicht zur Decke.',
    caution: 'Nicht zu hoch – sonst arbeitet der Hüftbeuger statt des Gesäßes.',
  },
  {
    id: 'fai-bauchlage-beinheben', name: 'Bein heben in Bauchlage', focus: ['aktiv'], level: 1, mode: 'reps', sets: 3, reps: 10, perSide: true, freq: '3x',
    steps: ['Bauchlage, Stirn auf den Händen.', 'Gesäß anspannen und ein gestrecktes Bein wenige Zentimeter anheben.', '2 Sekunden halten, absenken.'],
    tip: 'Kleine Bewegung, große Spannung.',
    caution: 'Becken bleibt am Boden, kein Hohlkreuz.',
  },

  // ---------- Rumpf ----------
  {
    id: 'fai-deadbug', name: 'Dead Bug', focus: ['rumpf'], level: 1, mode: 'reps', sets: 3, reps: 8, perSide: true, freq: '3x',
    steps: ['Rückenlage, Arme zur Decke, Beine angewinkelt in der Luft (90°).', 'Unteren Rücken in den Boden drücken.', 'Gegenüberliegenden Arm und Bein langsam strecken, zurück, Seite wechseln.'],
    tip: 'Ausatmen beim Strecken.',
    caution: 'Ist das Halten der Beine in der Luft unangenehm: Füße abwechselnd am Boden abtippen.',
  },
  {
    id: 'fai-seitstuetz', name: 'Seitstütz', focus: ['rumpf', 'kraft'], level: 2, mode: 'time', sets: 3, seconds: 30, perSide: true, freq: '3x',
    steps: ['Seitlage auf dem Unterarm, Ellbogen unter der Schulter.', 'Becken anheben, Körper bildet eine Linie.', 'Einfacher: Knie am Boden lassen.'],
    tip: 'Kräftigt auch die seitliche Hüftmuskulatur.',
  },
  {
    id: 'fai-pallof', name: 'Pallof Press (Band)', focus: ['rumpf', 'stabil'], level: 2, mode: 'reps', sets: 3, reps: 10, perSide: true, freq: '3x',
    steps: ['Seitlich zu einem befestigten Band stehen, Griff mit beiden Händen vor der Brust.', 'Arme gerade nach vorn drücken, ohne dass der Oberkörper mitdreht.', '2 Sekunden halten, zurück.'],
    tip: 'Hüftbreit stehen, Knie leicht gebeugt.',
  },
  {
    id: 'fai-plank', name: 'Unterarmstütz', focus: ['rumpf'], level: 2, mode: 'time', sets: 3, seconds: 30, freq: '3x',
    steps: ['Unterarme unter den Schultern, Körper in einer Linie.', 'Bauch und Gesäß fest.'],
    tip: 'Lieber kürzer und sauber.',
  },

  // ---------- Kraft ----------
  {
    id: 'fai-bruecke-einbeinig', name: 'Einbeinige Brücke', focus: ['kraft'], level: 2, mode: 'reps', sets: 3, reps: 10, perSide: true, freq: '3x',
    steps: ['Wie die Brücke, aber ein Bein gestreckt in der Luft.', 'Becken bleibt waagerecht.', 'Langsam absenken.'],
    tip: 'Erst die beidbeinige Brücke sicher beherrschen.',
    caution: 'Becken kippt zur Seite? Zurück zur beidbeinigen Variante.',
  },
  {
    id: 'fai-monster-walk', name: 'Seitwärtsgehen mit Band', focus: ['kraft', 'stabil'], level: 2, mode: 'reps', sets: 3, reps: 12, perSide: true, freq: '3x',
    steps: ['Mini-Band um die Unterschenkel oder oberhalb der Knie.', 'Leicht in die Knie, Oberkörper aufrecht.', 'Kontrollierte Schritte zur Seite, Band bleibt gespannt.'],
    tip: 'Knie zeigen über die Zehen, nicht nach innen.',
  },
  {
    id: 'fai-box-squat', name: 'Kniebeuge zur Box', focus: ['kraft'], level: 2, mode: 'reps', sets: 3, reps: 10, weighted: true, freq: '3x',
    steps: ['Vor eine Bank/Box stellen, Füße etwa schulterbreit, Zehen leicht nach außen.', 'Gesäß nach hinten schieben und kontrolliert absitzen bis zum leichten Kontakt.', 'Über die Fersen wieder aufstehen.'],
    tip: 'Box anfangs höher wählen und mit der Zeit absenken.',
    caution: 'Tiefe nur so weit, wie es in der Leiste schmerzfrei bleibt. Knie nicht nach innen.',
  },
  {
    id: 'fai-step-up', name: 'Step-up auf Stufe', focus: ['kraft', 'stabil'], level: 2, mode: 'reps', sets: 3, reps: 10, perSide: true, weighted: true, freq: '3x',
    steps: ['Ganzen Fuß auf eine Stufe (anfangs niedrig) stellen.', 'Über dieses Bein hochdrücken, ohne mit dem hinteren Bein abzustoßen.', 'Langsam wieder absteigen.'],
    tip: 'Becken bleibt waagerecht.',
    caution: 'Stufe nur so hoch, dass die Hüfte nicht tief beugen muss.',
  },
  {
    id: 'fai-rdl', name: 'Rumänisches Kreuzheben', focus: ['kraft'], level: 2, mode: 'reps', sets: 3, reps: 10, weighted: true, freq: '3x',
    steps: ['Hüftbreit stehen, Gewicht vor den Oberschenkeln.', 'Knie leicht gebeugt, Gesäß nach hinten schieben, Rücken gerade.', 'Bis zur Mitte der Unterschenkel absenken, über das Gesäß wieder aufrichten.'],
    tip: 'Dehnung hinten in den Oberschenkeln ist erwünscht.',
    caution: 'Rücken bleibt neutral; Bewegungsumfang schmerzfrei halten.',
  },
  {
    id: 'fai-ausfallschritt-rueck', name: 'Ausfallschritt rückwärts', focus: ['kraft', 'stabil'], level: 3, mode: 'reps', sets: 3, reps: 8, perSide: true, weighted: true, freq: '3x',
    steps: ['Aufrecht stehen.', 'Großen Schritt nach hinten, hinteres Knie Richtung Boden senken.', 'Über die vordere Ferse zurück in den Stand.'],
    tip: 'Rückwärts ist meist hüftfreundlicher als vorwärts.',
    caution: 'Vorderes Knie bleibt über dem Fuß.',
  },
  {
    id: 'fai-hip-thrust', name: 'Hip Thrust an der Bank', focus: ['kraft'], level: 3, mode: 'reps', sets: 3, reps: 10, weighted: true, freq: '3x',
    steps: ['Oberer Rücken an einer Bank, Füße aufgestellt.', 'Becken kraftvoll anheben bis zur Linie Knie–Hüfte–Schulter.', 'Oben 1 Sekunde halten, kontrolliert ab.'],
    tip: 'Gewicht (Hantel/Kurzhantel) auf der Hüfte mit Polster.',
  },
  {
    id: 'fai-copenhagen', name: 'Copenhagen-Adduktoren (kurzer Hebel)', focus: ['kraft', 'rumpf'], level: 3, mode: 'time', sets: 3, seconds: 20, perSide: true, freq: '3x',
    steps: ['Seitstütz, das obere Knie liegt auf einer Bank.', 'Becken anheben, unteres Bein hängt locker oder hebt mit an.', 'Halten.'],
    tip: 'Kräftigt die Innenseite der Oberschenkel.',
    caution: 'Nur ohne Leistenschmerz. Erst mit Physio absprechen.',
  },

  // ---------- Stabilität & Balance ----------
  {
    id: 'fai-einbeinstand', name: 'Einbeinstand', focus: ['stabil'], level: 1, mode: 'time', sets: 3, seconds: 30, perSide: true, freq: 'daily',
    steps: ['Auf einem Bein stehen, Knie minimal gebeugt.', 'Becken waagerecht halten.', 'Steigerung: Augen zu oder weiche Unterlage.'],
    tip: 'Ideal beim Zähneputzen.',
  },
  {
    id: 'fai-mini-squat-einbeinig', name: 'Einbeinige Mini-Kniebeuge', focus: ['stabil', 'kraft'], level: 2, mode: 'reps', sets: 3, reps: 8, perSide: true, freq: '3x',
    steps: ['Einbeinstand.', 'Langsam leicht in die Knie gehen (ca. 30–45°).', 'Wieder strecken.'],
    tip: 'Vor dem Spiegel: Knie bleibt über dem Fuß.',
    caution: 'Becken kippt nicht, Knie fällt nicht nach innen.',
  },
  {
    id: 'fai-ybalance', name: 'Stern-Reichweite (Y-Balance)', focus: ['stabil'], level: 3, mode: 'reps', sets: 2, reps: 6, perSide: true, freq: '3x',
    steps: ['Einbeinstand.', 'Mit dem freien Fuß nacheinander nach vorn, hinten-außen und hinten-innen tippen.', 'Jedes Mal zurück in die Mitte.'],
    tip: 'Reichweite langsam steigern.',
    caution: 'Hinten-innen (Richtung Beinkreuzen) nur so weit, wie es angenehm ist.',
  },

  // ---------- Sportvorbereitung ----------
  {
    id: 'fai-squat-jump', name: 'Kniebeugesprünge (leicht)', focus: ['sport'], level: 3, mode: 'reps', sets: 3, reps: 6, freq: '3x',
    steps: ['Halbe Kniebeuge.', 'Explosiv nach oben springen.', 'Leise und weich landen, Knie über den Füßen.'],
    tip: 'Qualität vor Höhe.',
    caution: 'Erst nach Freigabe für Sprünge durch Physio/Ärztin.',
  },
  {
    id: 'fai-skater', name: 'Seitliche Sprünge (Skater)', focus: ['sport', 'stabil'], level: 3, mode: 'reps', sets: 3, reps: 8, perSide: true, freq: '3x',
    steps: ['Von einem Bein seitlich auf das andere springen.', 'Landung stabil halten (1 Sekunde).', 'Zurückspringen.'],
    tip: 'Klein anfangen, Weite langsam steigern.',
    caution: 'Erst nach Freigabe für Sprünge.',
  },
  {
    id: 'fai-seitlicher-ausfallschritt', name: 'Seitlicher Ausfallschritt', focus: ['sport', 'kraft'], level: 3, mode: 'reps', sets: 3, reps: 8, perSide: true, freq: '3x',
    steps: ['Breiter Schritt zur Seite.', 'Gesäß nach hinten, ein Knie beugen, anderes Bein gestreckt.', 'Kräftig zurückdrücken.'],
    tip: 'Fuß des gebeugten Beins zeigt nach vorn.',
    caution: 'Tiefe schmerzfrei wählen.',
  },
];

export const catalogItem = (id) => CATALOG.find((c) => c.id === id) || null;

/** Wandelt einen Katalogeintrag in die Felder einer eigenen Übung um. */
export function toExercise(c) {
  return {
    name: c.name,
    category: 'physio',
    mode: c.mode,
    weighted: !!c.weighted,
    targetSets: c.sets,
    targetReps: c.reps ?? 10,
    targetSeconds: c.seconds ?? 30,
    days: c.freq === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [0, 2, 4],
    trackPain: true,
    notes: [c.perSide ? 'Pro Seite.' : null, ...c.steps, c.tip ? `Tipp: ${c.tip}` : null, c.caution ? `Achtung: ${c.caution}` : null].filter(Boolean).join('\n'),
    catalogId: c.id,
    archived: false,
  };
}
