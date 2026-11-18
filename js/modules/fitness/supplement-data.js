// Wissensbasis Nahrungsergänzungsmittel – allgemeine Informationen, keine medizinische Beratung.
// Stand der Recherche: November 2026. Quellen u. a.: BfR-Höchstmengenvorschläge (2024, inkl. Vitamin B6), EFSA-UL Vitamin B6 (2023), FDA-Sicherheitshinweis Biotin,
// ISSN Position Stand Kreatin, Meta-Analysen zu Alpha-Liponsäure, L-Theanin und Omega-3 (siehe docs/SUPPLEMENTS.md).
// IDs nie ändern – das Arsenal (items kind 'supplement') verweist darauf.

export const EVIDENCE = {
  3: { label: 'Gut belegt', cls: 'ev3' },
  2: { label: 'Teilweise belegt', cls: 'ev2' },
  1: { label: 'Schwach belegt', cls: 'ev1' },
};

// Einnahmezeitpunkte – passend zu Intervallfasten
export const SLOTS = {
  nuechtern: { label: 'Vor der 1. Mahlzeit', short: 'Nüchtern', order: 0 },
  mahlzeit: { label: 'Zur Mahlzeit', short: 'Mahlzeit', order: 1 },
  abends: { label: 'Abends', short: 'Abends', order: 2 },
  flexibel: { label: 'Jederzeit', short: 'Jederzeit', order: 3 },
};

export const SUPPLEMENTS = [
  {
    id: 'magnesium', name: 'Magnesiumcitrat', emoji: '⚡', evidence: 2, slot: 'abends',
    dose: 'max. 250 mg Magnesium pro Tag aus Nahrungsergänzung, auf 2 Einnahmen verteilt',
    effect: 'Wichtig für Muskel- und Nervenfunktion und den Energiestoffwechsel. Ein Nutzen ist vor allem bei niedriger Zufuhr zu erwarten (z. B. viel Training und Schwitzen). Citrat wird gut aufgenommen, wirkt aber eher abführend.',
    timing: 'Gern abends oder nach dem Training; größere Mengen auf zwei Portionen aufteilen.',
    cautions: [
      'Mehr als 250 mg/Tag aus Nahrungsergänzung kann zu Durchfall führen (BfR-Höchstmenge).',
      'Mindestens 2 Stunden Abstand zu bestimmten Antibiotika und Schilddrüsenmedikamenten.',
      'Bei eingeschränkter Nierenfunktion nur nach ärztlicher Rücksprache.',
    ],
    tags: ['muskel', 'schlaf'],
  },
  {
    id: 'ala', name: 'Alpha-Liponsäure', emoji: '🧪', evidence: 1, slot: 'nuechtern',
    dose: 'in Studien meist 300–600 mg pro Tag',
    effect: 'Körpereigenes Antioxidans. Am besten belegt ist die Linderung diabetischer Nervenschmerzen (in Deutschland dafür als Arzneimittel zugelassen). Effekte auf Blutzucker und Gewicht sind klein und uneinheitlich (im Schnitt etwa 1 kg). Für gesunde Menschen ist ein Nutzen kaum belegt.',
    timing: 'Nüchtern, 30–60 Min. vor der ersten Mahlzeit – mit Essen sinkt die Aufnahme. Passt gut ins Intervallfasten (vor dem Fastenbrechen).',
    cautions: [
      'Kann den Blutzucker senken – bei Diabetes-Medikamenten ärztlich abklären.',
      'Selten: Insulin-Autoimmunsyndrom mit schweren Unterzuckerungen (häufiger bei ostasiatischer Herkunft beschrieben).',
      'Nutzt denselben Aufnahmeweg wie Biotin – nicht gleichzeitig nehmen.',
      'Nüchtern kann sie Übelkeit oder Magendrücken auslösen.',
    ],
    tags: ['stoffwechsel'],
  },
  {
    id: 'theanin', name: 'L-Theanin', emoji: '🍵', evidence: 2, slot: 'abends',
    dose: 'üblich 100–400 mg pro Tag (Studien meist 200–400 mg)',
    effect: 'Aminosäure aus Tee. Kleinere Studien zeigen weniger Stressempfinden und subjektiv besseres Einschlafen – ohne müde zu machen („ruhige Konzentration“). Die Belege sind vielversprechend, aber nicht abschließend. Zusammen mit Koffein (etwa 2:1) für Fokus genutzt.',
    timing: 'Abends zur Entspannung oder morgens zum Kaffee für ruhigen Fokus. Wirkt nach ca. 30–60 Min.',
    cautions: [
      'Vorsicht zusammen mit blutdrucksenkenden Mitteln oder Beruhigungs-/Schlafmitteln.',
    ],
    tags: ['schlaf', 'stress', 'fokus'],
  },
  {
    id: 'biotin', name: 'Biotin', emoji: '💇', evidence: 1, slot: 'mahlzeit',
    dose: 'Bedarf ca. 40 µg/Tag – Präparate enthalten oft 5.000–10.000 µg',
    effect: 'Vitamin B7 für Haut, Haare und Nägel. Ein Mangel ist bei normaler Ernährung selten; ohne Mangel ist ein Nutzen kaum belegt.',
    timing: 'Zur Mahlzeit – mit Abstand zur Alpha-Liponsäure.',
    cautions: [
      'Hoch dosiert verfälscht Biotin Laborwerte (z. B. Schilddrüse TSH/T3/T4, Troponin für den Herzinfarkt-Test). Vor Blutabnahmen pausieren (mind. 8 Std., bei hohen Dosen länger) und Praxis/Labor informieren.',
      'Konkurriert mit Alpha-Liponsäure um die Aufnahme.',
    ],
    tags: ['haut'],
  },
  {
    id: 'zink', name: 'Zink', emoji: '🛡️', evidence: 2, slot: 'mahlzeit',
    dose: 'BfR: max. 6,5 mg pro Tag aus Nahrungsergänzung',
    effect: 'Für Immunsystem, Haut und Wundheilung. Ein Nutzen ist vor allem bei Mangel belegt; bei pflanzenbasierter Ernährung ist die Zufuhr wegen Phytaten (Vollkorn, Hülsenfrüchte) öfter knapp.',
    timing: 'Zur Mahlzeit (nüchtern oft Übelkeit), mit 2 Std. Abstand zu Magnesium.',
    cautions: [
      'Langfristig hohe Dosen (ab etwa 25–40 mg/Tag) können einen Kupfermangel auslösen – mit Blutarmut und Nervenproblemen.',
      'Konkurriert mit Magnesium, Eisen und Kalzium um die Aufnahme.',
      'Präparate mit 15–25 mg liegen deutlich über der BfR-Empfehlung – lieber nur kurmäßig.',
    ],
    tags: ['immun', 'haut'],
  },
  {
    id: 'b6', name: 'Vitamin B6', emoji: '🥔', evidence: 1, slot: 'mahlzeit',
    dose: 'Bedarf 1,4 mg (Frauen) bzw. 1,6 mg (Männer) pro Tag (DGE) – BfR: max. 0,9 mg pro Tag aus Nahrungsergänzung',
    effect: 'Wasserlösliches B-Vitamin für den Eiweiß- und Aminosäurestoffwechsel, Nerven, Blutbildung und das Immunsystem. Steckt in Hülsenfrüchten, Vollkorn, Kartoffeln, Nüssen, Bananen, Fisch und Fleisch – auch bei veganer Ernährung wird der Bedarf meist gut gedeckt. Ein Nutzen von Präparaten ist ohne nachgewiesenen Mangel kaum belegt.',
    timing: 'Zur Mahlzeit oder jederzeit. Meist schon in Magnesium-, Zink- oder B-Komplex-Präparaten enthalten – Gesamtmenge zusammenrechnen.',
    cautions: [
      'Zu viel über längere Zeit kann Nerven schädigen (Kribbeln, Taubheit in Händen und Füßen) – auch schon bei Mengen deutlich unter 50 mg/Tag beschrieben. Beschwerden bilden sich nach dem Absetzen meist zurück.',
      'BfR empfiehlt seit 2024 höchstens 0,9 mg pro Tag aus Nahrungsergänzung; die EFSA setzt die tolerierbare Gesamtzufuhr bei 12 mg/Tag an. Viele Kombipräparate liegen darüber.',
      'Hochdosiert Wechselwirkungen möglich, u. a. mit Levodopa (Parkinson) und einigen Mitteln gegen Epilepsie – ärztlich abklären.',
      'Ein Mangel ist selten; gefährdet sind z. B. Menschen mit hohem Alkoholkonsum, Nierenerkrankungen oder bestimmten Medikamenten (z. B. Isoniazid).',
    ],
    tags: ['nerven', 'stoffwechsel'],
  },
  {
    id: 'omega3', name: 'Omega-3 (EPA/DHA)', emoji: '🐟', evidence: 2, slot: 'mahlzeit',
    dose: 'üblich 250–1.000 mg EPA+DHA pro Tag',
    effect: 'Für Herz, Gehirn und Entzündungsprozesse. Wer selten fetten Seefisch isst (oder vegan lebt), erreicht kaum Mengen wie Fischesser – Algenöl ist die pflanzliche Alternative.',
    timing: 'Zu einer fetthaltigen Mahlzeit – bei Intervallfasten zur ersten Mahlzeit.',
    cautions: [
      'Sehr hohe Dosen (über 1,5 g/Tag) gehen mit einem leicht erhöhten Risiko für Vorhofflimmern einher; übliche Dosen laut neuer Meta-Analyse nicht.',
      'Leicht blutverdünnend – bei Gerinnungshemmern und vor Operationen ärztlich abklären.',
    ],
    tags: ['herz', 'gehirn'],
  },
  // ---------- Vorschläge passend zu Zielen ----------
  {
    id: 'kreatin', name: 'Kreatin-Monohydrat', emoji: '💪', evidence: 3, slot: 'flexibel', suggestion: 'Muskelaufbau',
    dose: '3–5 g pro Tag (Ladephase nicht nötig)',
    effect: 'Eines der am besten untersuchten Supplements: mehr Kraft und Leistung bei kurzen, intensiven Belastungen und dadurch bessere Trainingsanpassung. Vegetarier und Veganer haben meist niedrigere Speicher und profitieren oft stärker. Auch langfristig bei Gesunden gut verträglich.',
    timing: 'Täglich, Zeitpunkt egal – Regelmäßigkeit zählt. Volle Speicher nach etwa 3–4 Wochen.',
    cautions: [
      'Anfangs 0,5–1 kg mehr auf der Waage durch Wasser in der Muskulatur.',
      'Bei Nierenerkrankungen nur nach ärztlicher Rücksprache.',
    ],
    tags: ['muskel'],
  },
  {
    id: 'vitd', name: 'Vitamin D3', emoji: '☀️', evidence: 2, slot: 'mahlzeit', suggestion: 'Winter',
    dose: 'BfR: max. 20 µg (800 I.E.) pro Tag aus Nahrungsergänzung',
    effect: 'Für Knochen, Muskeln und Immunsystem. In Deutschland ist der Spiegel im Winterhalbjahr oft niedrig; sinnvoll vor allem bei nachgewiesenem Mangel oder wenig Sonne.',
    timing: 'Zu einer fetthaltigen Mahlzeit (fettlöslich).',
    cautions: ['Höher dosiert nur nach Blutwert und ärztlicher Absprache – Überdosierung möglich.'],
    tags: ['knochen', 'immun'],
  },
  {
    id: 'b12', name: 'Vitamin B12', emoji: '🔴', evidence: 3, slot: 'flexibel', suggestion: 'vegane Ernährung',
    dose: 'BfR: max. 25 µg pro Tag aus Nahrungsergänzung',
    effect: 'Für Blutbildung und Nerven. Kommt fast nur in tierischen Lebensmitteln vor – bei veganer Ernährung ist eine Ergänzung notwendig.',
    timing: 'Jederzeit, gern täglich.',
    cautions: ['Bei überwiegend veganer Ernährung den Spiegel gelegentlich prüfen lassen.'],
    tags: ['vegan'],
  },
];

export const supplementById = (id) => SUPPLEMENTS.find((s) => s.id === id) || null;

// ---------- Kombinationen ----------
// type: good (passt gut) · timing (zeitlich trennen) · warn (Vorsicht)
export const PAIRS = [
  { a: 'magnesium', b: 'theanin', type: 'good', text: 'Beliebte Abend-Kombi für Entspannung und Schlaf. Keine bekannten Probleme; die Belege sind jeweils begrenzt.' },
  { a: 'magnesium', b: 'zink', type: 'timing', text: 'Konkurrieren um die Aufnahme – mit etwa 2 Std. Abstand nehmen (z. B. Zink zur Mahlzeit, Magnesium abends).' },
  { a: 'ala', b: 'biotin', type: 'timing', text: 'Gleicher Aufnahmeweg im Darm (SMVT): Hohe Dosen Alpha-Liponsäure können die Biotin-Aufnahme hemmen. Zeitversetzt nehmen – ALA nüchtern, Biotin zur Mahlzeit.' },
  { a: 'ala', b: 'omega3', type: 'timing', text: 'Alpha-Liponsäure wirkt nüchtern am besten, Omega-3 braucht Fett – zu unterschiedlichen Zeiten nehmen.' },
  { a: 'ala', b: 'vitd', type: 'timing', text: 'ALA nüchtern, Vitamin D zur fetthaltigen Mahlzeit.' },
  { a: 'omega3', b: 'vitd', type: 'good', text: 'Beide fettlöslich – praktisch zusammen zur ersten Mahlzeit.' },
  { a: 'biotin', b: 'zink', type: 'good', text: 'Häufige „Haut & Haare“-Kombi; ohne Mangel ist der Nutzen allerdings kaum belegt.' },
  { a: 'kreatin', b: 'magnesium', type: 'good', text: 'Passen zum Muskelaufbau-Ziel und vertragen sich problemlos.' },
  { a: 'theanin', b: 'kreatin', type: 'good', text: 'Keine Wechselwirkungen bekannt.' },
  { a: 'magnesium', b: 'b6', type: 'warn', text: 'Klassische Kombi (oft in einem Präparat) – ein Zusatznutzen ist kaum belegt. Auf die B6-Menge achten: BfR empfiehlt max. 0,9 mg/Tag aus Nahrungsergänzung, viele Magnesium+B6-Produkte liegen darüber.' },
  { a: 'b12', b: 'b6', type: 'good', text: 'Vertragen sich problemlos; B12 ist bei veganer Ernährung wichtig, B6 meist schon über das Essen gedeckt. Bei B-Komplex-Präparaten die B6-Menge prüfen.' },
  { a: 'zink', b: 'b6', type: 'good', text: 'Keine Wechselwirkungen bekannt – bei Kombipräparaten die Gesamtmengen beider Stoffe prüfen.' },
  { a: 'biotin', b: 'b6', type: 'good', text: 'Keine Wechselwirkungen; stecken oft zusammen in „Haut & Haare“- oder B-Komplex-Präparaten – Mengen addieren.' },
];

/** Analyse einer Auswahl: Wirkungen, Zeitplan, Hinweise. */
export function analyzeCombo(ids, { fasting = true } = {}) {
  const list = ids.map(supplementById).filter(Boolean);
  const set = new Set(ids);
  const pairs = PAIRS.filter((p) => set.has(p.a) && set.has(p.b));
  const schedule = {};
  for (const s of list) (schedule[s.slot] ||= []).push(s);
  const effects = [];
  const tagText = {
    muskel: 'Muskel & Training', schlaf: 'Entspannung & Schlaf', stress: 'Stress', fokus: 'Fokus', stoffwechsel: 'Stoffwechsel',
    nerven: 'Nerven', haut: 'Haut & Haare', immun: 'Immunsystem', herz: 'Herz', gehirn: 'Gehirn', knochen: 'Knochen', vegan: 'Versorgung bei veganer Ernährung',
  };
  const tags = new Map();
  for (const s of list) for (const t of s.tags) tags.set(t, [...(tags.get(t) || []), s.name]);
  for (const [t, names] of tags) effects.push({ area: tagText[t] || t, names });
  const notes = [];
  if (set.has('biotin')) notes.push({ type: 'warn', text: 'Biotin vor Blutabnahmen pausieren und das Labor informieren (Schilddrüse, Troponin u. a. können verfälscht sein).' });
  if (set.has('zink')) notes.push({ type: 'warn', text: 'Zink: max. 6,5 mg/Tag aus Nahrungsergänzung (BfR); dauerhaft höher dosiert droht Kupfermangel.' });
  if (set.has('b6')) notes.push({ type: 'warn', text: 'Vitamin B6: max. 0,9 mg/Tag aus Nahrungsergänzung (BfR 2024); B6 aus allen Präparaten zusammenrechnen – zu viel kann Nerven schädigen.' });
  if (set.has('magnesium')) notes.push({ type: 'info', text: 'Magnesium: max. 250 mg/Tag aus Nahrungsergänzung (BfR), auf 2 Einnahmen verteilen.' });
  if (fasting && set.has('omega3')) notes.push({ type: 'info', text: 'Omega-3 und andere fettlösliche Mittel zur ersten Mahlzeit nach dem Fasten.' });
  if (fasting && set.has('ala')) notes.push({ type: 'good', text: 'Alpha-Liponsäure passt ins Fastenfenster: kurz vor dem Fastenbrechen nehmen.' });
  return { list, pairs, schedule, effects, notes };
}
