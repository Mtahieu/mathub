// Zutaten- und Rezeptdatenbank für Ernährung (Rezepte, Wochenplan, Einkaufsliste).
// Nährwerte sind Richtwerte pro 100 g bzw. 100 ml (gerundete Durchschnittswerte) – Kalorien der Rezepte werden daraus geschätzt.
// IDs nie ändern: Wochenpläne und Bewertungen hängen daran. Neue Rezepte einfach anhängen.

// ---------- Einkaufs-Kategorien (Reihenfolge = Reihenfolge in der Einkaufsliste) ----------
export const CATEGORIES = [
  { id: 'obst', label: 'Obst & Gemüse' },
  { id: 'kuehl', label: 'Kühlregal' },
  { id: 'fleisch', label: 'Fleisch & Fisch' },
  { id: 'brot', label: 'Brot & Backwaren' },
  { id: 'trocken', label: 'Nudeln, Reis & Getreide' },
  { id: 'konserve', label: 'Konserven & Gläser' },
  { id: 'tk', label: 'Tiefkühl' },
  { id: 'nuss', label: 'Nüsse, Saaten & Süßes' },
  { id: 'vorrat', label: 'Vorrat & Gewürze' },
];

// ---------- Zutaten ----------
// id: [Name, kcal, Protein, Kohlenhydrate, Fett, Kategorie, Emoji, Optionen]
// Optionen: pc = Gramm pro Stück, pcName = Einheit (Standard 'Stk'), ml = Flüssigkeit, pantry = meist vorrätig
const I = {
  haferflocken: ['Haferflocken', 370, 13.5, 59, 7, 'trocken', '🌾'],
  reis: ['Reis (Basmati/Vollkorn)', 350, 7.5, 77, 1, 'trocken', '🍚'],
  risottoreis: ['Risottoreis', 350, 7, 78, 0.6, 'trocken', '🍚'],
  vollkornnudeln: ['Vollkornnudeln', 350, 13, 64, 2.5, 'trocken', '🍝'],
  nudeln: ['Nudeln', 355, 12.5, 71, 1.5, 'trocken', '🍝'],
  reisnudeln: ['Reisnudeln', 360, 6, 80, 1, 'trocken', '🍜'],
  quinoa: ['Quinoa', 368, 14, 64, 6, 'trocken', '🌾'],
  couscous: ['Couscous', 360, 12.8, 72, 0.6, 'trocken', '🌾'],
  bulgur: ['Bulgur', 340, 12, 69, 1.3, 'trocken', '🌾'],
  rote_linsen: ['Rote Linsen', 340, 24, 50, 1.5, 'trocken', '🫘'],
  sojagranulat: ['Sojagranulat', 340, 48, 30, 1.5, 'trocken', '🫘'],
  gnocchi: ['Gnocchi', 140, 3.5, 30, 0.5, 'kuehl', '🥔'],
  kartoffeln: ['Kartoffeln', 77, 2, 17, 0.1, 'obst', '🥔'],
  suesskartoffel: ['Süßkartoffel', 86, 1.6, 20, 0.1, 'obst', '🍠', { pc: 300 }],
  vollkornbrot: ['Vollkornbrot', 220, 7.5, 38, 1.5, 'brot', '🍞', { pc: 50, pcName: 'Scheibe' }],
  tortilla: ['Weizen-Tortillas', 300, 8, 50, 7, 'brot', '🫓', { pc: 60 }],
  kichererbsen: ['Kichererbsen (Dose)', 120, 7, 16, 2.5, 'konserve', '🫘'],
  kidneybohnen: ['Kidneybohnen (Dose)', 105, 7.5, 14, 0.5, 'konserve', '🫘'],
  schwarze_bohnen: ['Schwarze Bohnen (Dose)', 110, 7, 15, 0.5, 'konserve', '🫘'],
  weisse_bohnen: ['Weiße Bohnen (Dose)', 100, 7, 13, 0.5, 'konserve', '🫘'],
  mais: ['Mais (Dose)', 86, 3.2, 19, 1.2, 'konserve', '🌽'],
  passierte_tomaten: ['Passierte Tomaten', 32, 1.5, 6, 0.2, 'konserve', '🍅', { ml: true }],
  gehackte_tomaten: ['Gehackte Tomaten (Dose)', 22, 1.2, 4, 0.2, 'konserve', '🍅'],
  kokosmilch: ['Kokosmilch', 180, 2, 3, 18, 'konserve', '🥥', { ml: true }],
  thunfisch: ['Thunfisch (Dose, naturell)', 110, 25, 0, 1, 'konserve', '🐟'],
  hummus: ['Hummus', 250, 7, 14, 19, 'kuehl', '🫘'],
  currypaste: ['Rote Currypaste', 120, 2, 12, 6, 'vorrat', '🌶️'],
  pesto: ['Pesto', 450, 5, 6, 45, 'konserve', '🌿'],
  edamame: ['Edamame (TK)', 120, 11, 9, 5, 'tk', '🫛'],
  erbsen: ['Erbsen (TK)', 81, 5.4, 14, 0.4, 'tk', '🫛'],
  beeren: ['Beeren (TK)', 45, 1, 9, 0.3, 'tk', '🫐'],
  tofu: ['Tofu natur', 125, 13, 1.5, 7.5, 'kuehl', '🧊'],
  raeuchertofu: ['Räuchertofu', 160, 16, 2, 10, 'kuehl', '🧊'],
  tempeh: ['Tempeh', 190, 19, 9, 11, 'kuehl', '🟫'],
  seitan: ['Seitan', 140, 25, 5, 2, 'kuehl', '🟫'],
  sojajoghurt: ['Sojajoghurt natur', 50, 4, 2.5, 2.3, 'kuehl', '🥛'],
  sojadrink: ['Sojadrink', 39, 3.3, 2.5, 1.8, 'kuehl', '🥛', { ml: true }],
  proteinpulver: ['Proteinpulver (vegan)', 380, 80, 3, 6, 'vorrat', '💪'],
  haehnchen: ['Hähnchenbrust', 110, 23, 0, 1.5, 'fleisch', '🍗'],
  putenhack: ['Putenhack', 150, 20, 0, 7.5, 'fleisch', '🥩'],
  rinderhack: ['Rinderhack (mager)', 170, 21, 0, 9.5, 'fleisch', '🥩'],
  lachs: ['Lachsfilet', 200, 20, 0, 13, 'fleisch', '🐟'],
  garnelen: ['Garnelen', 85, 19, 0, 1, 'tk', '🦐'],
  eier: ['Eier', 150, 13, 0.7, 10, 'kuehl', '🥚', { pc: 60 }],
  skyr: ['Skyr', 63, 11, 4, 0.2, 'kuehl', '🥛'],
  magerquark: ['Magerquark', 67, 12, 4, 0.3, 'kuehl', '🥛'],
  joghurt: ['Joghurt 1,5 %', 47, 4, 4.5, 1.5, 'kuehl', '🥛'],
  huettenkaese: ['Hüttenkäse', 98, 12, 3, 4.3, 'kuehl', '🧀'],
  feta: ['Feta', 260, 16, 0.7, 21, 'kuehl', '🧀'],
  parmesan: ['Parmesan', 390, 35, 0, 28, 'kuehl', '🧀'],
  milch: ['Milch 1,5 %', 47, 3.4, 4.8, 1.5, 'kuehl', '🥛', { ml: true }],
  brokkoli: ['Brokkoli', 34, 2.8, 7, 0.4, 'obst', '🥦', { pc: 400, pcName: 'Kopf' }],
  blumenkohl: ['Blumenkohl', 25, 1.9, 5, 0.3, 'obst', '🥦'],
  spinat: ['Babyspinat', 23, 2.9, 3.6, 0.4, 'obst', '🥬'],
  paprika: ['Paprika', 31, 1, 6, 0.3, 'obst', '🫑', { pc: 150 }],
  zucchini: ['Zucchini', 17, 1.2, 3, 0.3, 'obst', '🥒', { pc: 250 }],
  tomaten: ['Tomaten', 18, 0.9, 3.9, 0.2, 'obst', '🍅', { pc: 100 }],
  kirschtomaten: ['Kirschtomaten', 20, 0.9, 4, 0.2, 'obst', '🍅'],
  zwiebel: ['Zwiebeln', 40, 1.1, 9, 0.1, 'obst', '🧅', { pc: 80 }],
  rote_zwiebel: ['Rote Zwiebeln', 40, 1.1, 9, 0.1, 'obst', '🧅', { pc: 80 }],
  fruehlingszwiebel: ['Frühlingszwiebeln', 32, 1.8, 7, 0.2, 'obst', '🌱', { pc: 15 }],
  knoblauch: ['Knoblauch', 149, 6.4, 33, 0.5, 'obst', '🧄', { pc: 4, pcName: 'Zehe' }],
  ingwer: ['Ingwer', 80, 1.8, 18, 0.8, 'obst', '🫚'],
  karotten: ['Karotten', 41, 0.9, 10, 0.2, 'obst', '🥕', { pc: 80 }],
  gurke: ['Gurke', 15, 0.7, 3.6, 0.1, 'obst', '🥒', { pc: 400 }],
  salat: ['Romanasalat', 17, 1.2, 3, 0.3, 'obst', '🥬'],
  rucola: ['Rucola', 25, 2.6, 3.7, 0.7, 'obst', '🥬'],
  champignons: ['Champignons', 22, 3.1, 3.3, 0.3, 'obst', '🍄'],
  aubergine: ['Aubergine', 25, 1, 6, 0.2, 'obst', '🍆', { pc: 300 }],
  rotkohl: ['Rotkohl', 29, 1.4, 7, 0.2, 'obst', '🥬'],
  kuerbis: ['Hokkaido-Kürbis', 26, 1, 6.5, 0.1, 'obst', '🎃'],
  avocado: ['Avocado', 160, 2, 9, 15, 'obst', '🥑', { pc: 150 }],
  banane: ['Bananen', 89, 1.1, 23, 0.3, 'obst', '🍌', { pc: 120 }],
  apfel: ['Äpfel', 52, 0.3, 14, 0.2, 'obst', '🍎', { pc: 150 }],
  mango: ['Mango', 60, 0.8, 15, 0.4, 'obst', '🥭', { pc: 300 }],
  zitrone: ['Zitronen', 29, 1.1, 9, 0.3, 'obst', '🍋', { pc: 80 }],
  limette: ['Limetten', 30, 0.7, 10, 0.2, 'obst', '🍋', { pc: 60 }],
  olivenoel: ['Olivenöl', 884, 0, 0, 100, 'vorrat', '🫒', { ml: true, pantry: true }],
  rapsoel: ['Rapsöl', 884, 0, 0, 100, 'vorrat', '🫒', { ml: true, pantry: true }],
  leinoel: ['Leinöl', 884, 0, 0, 100, 'vorrat', '🫒', { ml: true }],
  erdnussbutter: ['Erdnussmus', 600, 25, 16, 50, 'nuss', '🥜'],
  mandeln: ['Mandeln', 600, 21, 22, 50, 'nuss', '🌰'],
  walnuesse: ['Walnüsse', 650, 15, 14, 65, 'nuss', '🌰'],
  kuerbiskerne: ['Kürbiskerne', 560, 30, 15, 45, 'nuss', '🌰'],
  chiasamen: ['Chiasamen', 486, 17, 42, 31, 'nuss', '⚫'],
  leinsamen: ['Leinsamen (geschrotet)', 534, 18, 29, 42, 'nuss', '🌰'],
  sesam: ['Sesam', 573, 18, 23, 50, 'nuss', '⚪', { pantry: true }],
  tahini: ['Tahini', 595, 17, 21, 54, 'nuss', '🥜'],
  datteln: ['Datteln', 280, 2.5, 75, 0.4, 'nuss', '🟤'],
  kakao: ['Backkakao', 228, 20, 58, 14, 'nuss', '🍫', { pantry: true }],
  ahornsirup: ['Ahornsirup', 260, 0, 67, 0, 'vorrat', '🍯', { pantry: true }],
  hefeflocken: ['Hefeflocken', 350, 50, 30, 5, 'vorrat', '✨', { pantry: true }],
  sojasauce: ['Sojasauce', 53, 8, 5, 0, 'vorrat', '🥢', { ml: true, pantry: true }],
  miso: ['Misopaste', 200, 12, 26, 6, 'kuehl', '🥣'],
  bruehe: ['Gemüsebrühe', 5, 0.2, 0.5, 0.2, 'vorrat', '🥣', { ml: true, pantry: true, buyAs: 'Gemüsebrühe (Pulver)' }],
  gewuerze: ['Gewürze', 0, 0, 0, 0, 'vorrat', '🧂', { pantry: true }],
};

export const INGREDIENTS = Object.fromEntries(Object.entries(I).map(([id, [name, kcal, p, c, f, cat, emoji, o = {}]]) =>
  [id, { id, name, kcal, p, c, f, cat, emoji, ...o }]));

// ---------- Rezepte ----------
// meals: fruehstueck | mittag | abend | snack · diet: vegan | vegetarisch | pesc | fleisch
// ing: [zutat, Gramm/ml pro Portion, optional Hinweis] · spice: Gewürze (nur Text, Vorrat)
// tags: mealprep (hält 2–3 Tage), onepot, guenstig, ohnekochen, kalt
export const RECIPES = [
  // ---------- Frühstück ----------
  {
    id: 'overnight-oats-protein', name: 'Protein-Overnight-Oats mit Beeren', emoji: '🥣', hue: 265,
    meals: ['fruehstueck'], diet: 'vegan', time: 5, cuisine: 'international', tags: ['ohnekochen', 'mealprep', 'kalt'],
    ing: [['haferflocken', 70], ['sojadrink', 200], ['sojajoghurt', 100], ['proteinpulver', 20], ['chiasamen', 10], ['beeren', 100]],
    steps: ['Haferflocken, Chiasamen und Proteinpulver mischen.', 'Sojadrink und Sojajoghurt unterrühren.', 'Über Nacht abgedeckt in den Kühlschrank stellen.', 'Morgens mit den (aufgetauten) Beeren toppen.'],
  },
  {
    id: 'skyr-bowl', name: 'Skyr-Bowl mit Beeren & Walnüssen', emoji: '🫐', hue: 230,
    meals: ['fruehstueck', 'snack'], diet: 'vegetarisch', time: 5, cuisine: 'international', tags: ['ohnekochen', 'kalt'],
    ing: [['skyr', 300], ['beeren', 120], ['haferflocken', 30], ['walnuesse', 15], ['ahornsirup', 10]],
    steps: ['Skyr in eine Schale geben.', 'Beeren, Haferflocken und grob gehackte Walnüsse darüber.', 'Mit etwas Ahornsirup beträufeln.'],
  },
  {
    id: 'tofu-ruehrei', name: 'Tofu-Rührei mit Spinat auf Vollkornbrot', emoji: '🍳', hue: 48,
    meals: ['fruehstueck', 'mittag'], diet: 'vegan', time: 15, cuisine: 'international', tags: [],
    ing: [['tofu', 200], ['spinat', 50], ['tomaten', 100], ['hefeflocken', 10], ['vollkornbrot', 100], ['rapsoel', 5]],
    spice: 'Kurkuma, Salz, Pfeffer (optional Kala Namak)',
    steps: ['Tofu mit der Gabel zerdrücken.', 'Im Öl 5 Min. anbraten, mit Kurkuma, Salz und Pfeffer würzen.', 'Spinat und gewürfelte Tomaten kurz mitgaren, Hefeflocken unterrühren.', 'Auf dem Brot servieren.'],
  },
  {
    id: 'ruehrei-brot', name: 'Rührei mit Vollkornbrot & Tomate', emoji: '🍳', hue: 40,
    meals: ['fruehstueck'], diet: 'vegetarisch', time: 10, cuisine: 'deutsch', tags: ['guenstig'],
    ing: [['eier', 180, '3 Eier'], ['milch', 30], ['vollkornbrot', 100], ['tomaten', 150], ['rapsoel', 5]],
    spice: 'Salz, Pfeffer, Schnittlauch',
    steps: ['Eier mit Milch, Salz und Pfeffer verquirlen.', 'In der Pfanne bei mittlerer Hitze stocken lassen.', 'Mit Brot und Tomatenscheiben servieren.'],
  },
  {
    id: 'pb-porridge', name: 'Erdnuss-Bananen-Porridge', emoji: '🥜', hue: 30,
    meals: ['fruehstueck'], diet: 'vegan', time: 10, cuisine: 'international', tags: ['guenstig'],
    ing: [['haferflocken', 80], ['sojadrink', 250], ['banane', 120], ['erdnussbutter', 20], ['proteinpulver', 15]],
    spice: 'Zimt, Prise Salz',
    steps: ['Haferflocken mit Sojadrink aufkochen und 3–4 Min. köcheln.', 'Vom Herd nehmen, Proteinpulver einrühren.', 'Mit Bananenscheiben, Erdnussmus und Zimt toppen.'],
  },
  {
    id: 'quark-apfel', name: 'Quark-Apfel-Zimt-Bowl', emoji: '🍎', hue: 5,
    meals: ['fruehstueck', 'snack'], diet: 'vegetarisch', time: 5, cuisine: 'deutsch', tags: ['ohnekochen', 'guenstig', 'kalt'],
    ing: [['magerquark', 250], ['apfel', 150], ['haferflocken', 30], ['mandeln', 15]],
    spice: 'Zimt',
    steps: ['Quark mit einem Schuss Wasser cremig rühren.', 'Apfel würfeln und mit Haferflocken unterheben.', 'Mit gehackten Mandeln und Zimt bestreuen.'],
  },
  {
    id: 'protein-pancakes', name: 'Protein-Pancakes mit Beeren', emoji: '🥞', hue: 35,
    meals: ['fruehstueck'], diet: 'vegetarisch', time: 20, cuisine: 'international', tags: [],
    ing: [['haferflocken', 60], ['eier', 120, '2 Eier'], ['banane', 120], ['magerquark', 100], ['beeren', 80], ['rapsoel', 5]],
    spice: 'Backpulver (1 TL), Zimt',
    steps: ['Haferflocken, Eier, Banane, Quark und Backpulver pürieren.', 'In wenig Öl kleine Pancakes von beiden Seiten goldbraun backen.', 'Mit warmen Beeren servieren.'],
  },
  {
    id: 'smoothie-bowl', name: 'Mango-Spinat-Smoothie-Bowl', emoji: '🥭', hue: 85,
    meals: ['fruehstueck', 'snack'], diet: 'vegan', time: 5, cuisine: 'international', tags: ['ohnekochen', 'kalt'],
    ing: [['mango', 150], ['banane', 100], ['spinat', 40], ['sojajoghurt', 150], ['proteinpulver', 25], ['leinsamen', 10]],
    steps: ['Mango, Banane, Spinat, Sojajoghurt und Proteinpulver cremig mixen.', 'In eine Schale füllen.', 'Mit Leinsamen bestreuen.'],
  },
  {
    id: 'avocado-toast', name: 'Avocado-Kichererbsen-Toast', emoji: '🥑', hue: 95,
    meals: ['fruehstueck', 'mittag'], diet: 'vegan', time: 10, cuisine: 'international', tags: ['ohnekochen'],
    ing: [['vollkornbrot', 100], ['avocado', 75], ['kichererbsen', 80], ['zitrone', 10], ['kirschtomaten', 80]],
    spice: 'Chiliflocken, Salz, Pfeffer',
    steps: ['Avocado und Kichererbsen mit Zitronensaft grob zerdrücken.', 'Mit Salz, Pfeffer und Chili abschmecken.', 'Auf geröstetes Brot streichen, halbierte Tomaten darauf.'],
  },
  {
    id: 'chia-pudding', name: 'Kokos-Chia-Pudding mit Mango', emoji: '🥥', hue: 50,
    meals: ['fruehstueck', 'snack'], diet: 'vegan', time: 5, cuisine: 'international', tags: ['ohnekochen', 'mealprep', 'kalt'],
    ing: [['chiasamen', 25], ['sojadrink', 180], ['kokosmilch', 20], ['sojajoghurt', 60], ['mango', 80]],
    steps: ['Chiasamen mit Sojadrink und Kokosmilch verrühren.', 'Nach 10 Min. nochmal umrühren, über Nacht quellen lassen.', 'Mit Sojajoghurt und Mangowürfeln servieren.'],
  },

  // ---------- Mittag & Abend ----------
  {
    id: 'linsen-dal', name: 'Linsen-Dal mit Spinat & Reis', emoji: '🍛', hue: 38,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'indisch', tags: ['mealprep', 'onepot', 'guenstig'],
    ing: [['rote_linsen', 80], ['reis', 60], ['kokosmilch', 50], ['passierte_tomaten', 150], ['spinat', 80], ['zwiebel', 80], ['knoblauch', 8], ['ingwer', 10], ['bruehe', 250], ['rapsoel', 5]],
    spice: 'Curry, Kurkuma, Kreuzkümmel, Salz',
    steps: ['Reis nach Packung kochen.', 'Zwiebel, Knoblauch und Ingwer im Öl anschwitzen, Gewürze kurz mitrösten.', 'Linsen, Tomaten, Brühe und Kokosmilch zugeben, 15 Min. köcheln.', 'Spinat unterrühren, abschmecken und mit Reis servieren.'],
  },
  {
    id: 'chili-sin-carne', name: 'Chili sin Carne mit Reis', emoji: '🌶️', hue: 8,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 35, cuisine: 'mexikanisch', tags: ['mealprep', 'onepot', 'guenstig'],
    ing: [['sojagranulat', 40], ['kidneybohnen', 120], ['mais', 60], ['gehackte_tomaten', 200], ['paprika', 150], ['zwiebel', 80], ['knoblauch', 8], ['reis', 60], ['rapsoel', 5]],
    spice: 'Paprikapulver, Kreuzkümmel, Chili, Salz',
    steps: ['Sojagranulat 10 Min. in heißer Brühe/Wasser einweichen, ausdrücken.', 'Zwiebel, Knoblauch und Granulat anbraten, Gewürze zugeben.', 'Paprika, Tomaten, Bohnen und Mais zugeben, 20 Min. köcheln.', 'Mit Reis servieren.'],
  },
  {
    id: 'chili-con-carne', name: 'Chili con Carne mit Reis', emoji: '🌶️', hue: 2,
    meals: ['mittag', 'abend'], diet: 'fleisch', time: 35, cuisine: 'mexikanisch', tags: ['mealprep', 'onepot'],
    ing: [['rinderhack', 150], ['kidneybohnen', 120], ['mais', 60], ['gehackte_tomaten', 200], ['paprika', 150], ['zwiebel', 80], ['knoblauch', 8], ['reis', 60]],
    spice: 'Paprikapulver, Kreuzkümmel, Chili, Salz',
    steps: ['Hack krümelig anbraten, Zwiebel und Knoblauch mitbraten.', 'Gewürze, Paprika, Tomaten, Bohnen und Mais zugeben.', '20 Min. köcheln, mit Reis servieren.'],
  },
  {
    id: 'tofu-brokkoli', name: 'Knuspertofu mit Brokkoli & Reis', emoji: '🥦', hue: 120,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 25, cuisine: 'asiatisch', tags: [],
    ing: [['tofu', 200], ['brokkoli', 200], ['paprika', 100], ['reis', 75], ['sojasauce', 20], ['ingwer', 10], ['knoblauch', 8], ['sesam', 5], ['rapsoel', 10]],
    spice: 'Speisestärke (1 EL), Chili',
    steps: ['Reis kochen.', 'Tofu würfeln, in Stärke wenden und im Öl knusprig braten.', 'Brokkoli, Paprika, Knoblauch und Ingwer 5 Min. mitbraten.', 'Mit Sojasauce ablöschen, mit Sesam bestreuen.'],
  },
  {
    id: 'haehnchen-pfanne', name: 'Hähnchen-Gemüse-Pfanne mit Reis', emoji: '🍗', hue: 28,
    meals: ['mittag', 'abend'], diet: 'fleisch', time: 25, cuisine: 'asiatisch', tags: ['mealprep'],
    ing: [['haehnchen', 180], ['paprika', 150], ['zucchini', 150], ['reis', 75], ['sojasauce', 15], ['knoblauch', 4], ['rapsoel', 10]],
    spice: 'Paprikapulver, Pfeffer',
    steps: ['Reis kochen.', 'Hähnchen in Streifen schneiden und scharf anbraten.', 'Gemüse zugeben und 6–8 Min. braten.', 'Mit Sojasauce und Gewürzen abschmecken.'],
  },
  {
    id: 'linsen-bolognese', name: 'Vollkornpasta mit Linsen-Bolognese', emoji: '🍝', hue: 12,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'italienisch', tags: ['mealprep', 'guenstig'],
    ing: [['vollkornnudeln', 100], ['rote_linsen', 50], ['passierte_tomaten', 250], ['karotten', 80], ['zwiebel', 80], ['knoblauch', 8], ['olivenoel', 10], ['hefeflocken', 10]],
    spice: 'Oregano, Basilikum, Salz, Pfeffer',
    steps: ['Zwiebel, Karotte und Knoblauch fein würfeln und im Öl anschwitzen.', 'Linsen und Tomaten mit 150 ml Wasser zugeben, 15 Min. köcheln.', 'Nudeln kochen.', 'Sauce würzen, mit Hefeflocken über die Pasta geben.'],
  },
  {
    id: 'pasta-putenhack', name: 'Pasta mit Putenhack-Zucchini-Sauce', emoji: '🍝', hue: 18,
    meals: ['mittag', 'abend'], diet: 'fleisch', time: 25, cuisine: 'italienisch', tags: ['mealprep'],
    ing: [['nudeln', 100], ['putenhack', 150], ['passierte_tomaten', 250], ['zwiebel', 80], ['zucchini', 150], ['parmesan', 15], ['olivenoel', 5]],
    spice: 'Oregano, Salz, Pfeffer',
    steps: ['Nudeln kochen.', 'Putenhack mit Zwiebel anbraten, Zucchini zugeben.', 'Tomaten zugeben, 10 Min. köcheln, würzen.', 'Mit Parmesan servieren.'],
  },
  {
    id: 'kichererbsen-curry', name: 'Kichererbsen-Süßkartoffel-Curry', emoji: '🍛', hue: 25,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 35, cuisine: 'indisch', tags: ['mealprep', 'onepot'],
    ing: [['kichererbsen', 150], ['suesskartoffel', 200], ['kokosmilch', 80], ['gehackte_tomaten', 200], ['spinat', 60], ['zwiebel', 80], ['currypaste', 20], ['reis', 50]],
    steps: ['Reis kochen.', 'Zwiebel anschwitzen, Currypaste kurz mitrösten.', 'Süßkartoffelwürfel, Tomaten und Kokosmilch zugeben, 20 Min. köcheln.', 'Kichererbsen und Spinat unterheben, 5 Min. ziehen lassen.'],
  },
  {
    id: 'lachs-ofenkartoffeln', name: 'Lachs mit Ofenkartoffeln & Brokkoli', emoji: '🐟', hue: 15,
    meals: ['abend'], diet: 'pesc', time: 35, cuisine: 'deutsch', tags: [],
    ing: [['lachs', 150], ['kartoffeln', 300], ['brokkoli', 200], ['olivenoel', 10], ['zitrone', 20]],
    spice: 'Rosmarin, Salz, Pfeffer',
    steps: ['Kartoffeln vierteln, mit Öl und Gewürzen 25 Min. bei 200 °C backen.', 'Brokkoli und Lachs für die letzten 12–15 Min. aufs Blech legen.', 'Mit Zitrone beträufeln.'],
  },
  {
    id: 'ofengemuese-tempeh', name: 'Ofengemüse mit Tempeh & Tahini', emoji: '🫑', hue: 32,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 35, cuisine: 'mediterran', tags: ['mealprep'],
    ing: [['tempeh', 150], ['suesskartoffel', 200], ['paprika', 150], ['rote_zwiebel', 80], ['zucchini', 150], ['tahini', 20], ['olivenoel', 10], ['zitrone', 15]],
    spice: 'Paprikapulver, Kreuzkümmel, Salz',
    steps: ['Gemüse und Tempeh würfeln, mit Öl und Gewürzen mischen.', '25–30 Min. bei 200 °C backen.', 'Tahini mit Zitronensaft und Wasser zu einer Sauce rühren und darübergeben.'],
  },
  {
    id: 'buddha-bowl', name: 'Buddha-Bowl mit Quinoa & Kichererbsen', emoji: '🥗', hue: 140,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 25, cuisine: 'international', tags: ['mealprep', 'kalt'],
    ing: [['quinoa', 70], ['kichererbsen', 120], ['rotkohl', 80], ['karotten', 80], ['avocado', 60], ['spinat', 30], ['tahini', 15], ['zitrone', 10]],
    spice: 'Paprikapulver, Salz',
    steps: ['Quinoa kochen.', 'Kichererbsen mit Paprikapulver in der Pfanne rösten.', 'Rotkohl fein hobeln, Karotte raspeln, Avocado in Scheiben.', 'Alles in einer Schale anrichten, Tahini-Zitronen-Dressing darüber.'],
  },
  {
    id: 'thunfisch-salat', name: 'Thunfisch-Bohnen-Salat', emoji: '🐟', hue: 200,
    meals: ['mittag', 'abend'], diet: 'pesc', time: 10, cuisine: 'mediterran', tags: ['ohnekochen', 'kalt', 'guenstig'],
    ing: [['thunfisch', 130], ['kidneybohnen', 120], ['mais', 60], ['rote_zwiebel', 40], ['paprika', 100], ['olivenoel', 10], ['zitrone', 15], ['vollkornbrot', 60]],
    spice: 'Salz, Pfeffer, Petersilie',
    steps: ['Bohnen und Mais abspülen.', 'Paprika und Zwiebel würfeln.', 'Alles mit Thunfisch, Öl, Zitrone und Gewürzen mischen.', 'Mit Brot servieren.'],
  },
  {
    id: 'griech-couscous', name: 'Griechischer Couscous-Salat mit Feta', emoji: '🥗', hue: 60,
    meals: ['mittag', 'abend'], diet: 'vegetarisch', time: 15, cuisine: 'mediterran', tags: ['mealprep', 'kalt'],
    ing: [['couscous', 70], ['gurke', 150], ['tomaten', 150], ['rote_zwiebel', 40], ['feta', 60], ['kichererbsen', 80], ['olivenoel', 10], ['zitrone', 15]],
    spice: 'Oregano, Minze, Salz',
    steps: ['Couscous mit kochendem Wasser übergießen, 5 Min. quellen lassen.', 'Gemüse würfeln, Kichererbsen abspülen.', 'Alles mischen, Feta darüberbröseln, mit Öl und Zitrone anmachen.'],
  },
  {
    id: 'seitan-gyros', name: 'Seitan-Gyros-Wrap mit Soja-Tzatziki', emoji: '🌯', hue: 22,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 20, cuisine: 'mediterran', tags: [],
    ing: [['seitan', 150], ['tortilla', 120, '2 Wraps'], ['sojajoghurt', 80], ['gurke', 80], ['knoblauch', 4], ['tomaten', 100], ['salat', 40], ['rote_zwiebel', 30], ['rapsoel', 5]],
    spice: 'Gyros-Gewürz oder Paprika, Oregano, Knoblauch',
    steps: ['Seitan in Streifen schneiden und mit Gyros-Gewürz knusprig braten.', 'Gurke raspeln, mit Sojajoghurt und Knoblauch zu Tzatziki rühren.', 'Wraps mit Salat, Tomate, Zwiebel, Seitan und Tzatziki füllen.'],
  },
  {
    id: 'haehnchen-wrap', name: 'Hähnchen-Hummus-Wrap', emoji: '🌯', hue: 30,
    meals: ['mittag', 'abend'], diet: 'fleisch', time: 20, cuisine: 'mediterran', tags: [],
    ing: [['haehnchen', 150], ['tortilla', 120, '2 Wraps'], ['hummus', 50], ['salat', 40], ['tomaten', 100], ['gurke', 80], ['rapsoel', 5]],
    spice: 'Paprikapulver, Salz, Pfeffer',
    steps: ['Hähnchen würzen und durchbraten, in Streifen schneiden.', 'Wraps mit Hummus bestreichen.', 'Mit Salat, Tomate, Gurke und Hähnchen füllen und einrollen.'],
  },
  {
    id: 'linsensuppe', name: 'Orientalische Rote-Linsen-Suppe', emoji: '🍲', hue: 24,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'orientalisch', tags: ['mealprep', 'onepot', 'guenstig'],
    ing: [['rote_linsen', 90], ['karotten', 120], ['zwiebel', 80], ['kartoffeln', 100], ['bruehe', 500], ['zitrone', 15], ['vollkornbrot', 60], ['rapsoel', 5]],
    spice: 'Kreuzkümmel, Paprikapulver, Salz',
    steps: ['Zwiebel, Karotten und Kartoffeln würfeln und anschwitzen.', 'Linsen, Gewürze und Brühe zugeben, 20 Min. köcheln.', 'Pürieren, mit Zitrone abschmecken, mit Brot servieren.'],
  },
  {
    id: 'shakshuka', name: 'Shakshuka mit Kichererbsen & Feta', emoji: '🍅', hue: 4,
    meals: ['fruehstueck', 'mittag', 'abend'], diet: 'vegetarisch', time: 25, cuisine: 'orientalisch', tags: ['onepot'],
    ing: [['eier', 180, '3 Eier'], ['gehackte_tomaten', 300], ['paprika', 150], ['zwiebel', 80], ['kichererbsen', 100], ['feta', 30], ['vollkornbrot', 80], ['olivenoel', 5]],
    spice: 'Kreuzkümmel, Paprikapulver, Chili',
    steps: ['Zwiebel und Paprika anbraten, Gewürze zugeben.', 'Tomaten und Kichererbsen zugeben, 10 Min. köcheln.', 'Mulden formen, Eier hineinschlagen, abgedeckt stocken lassen.', 'Mit Feta und Brot servieren.'],
  },
  {
    id: 'gnocchi-spinat', name: 'Gnocchi-Pfanne mit Spinat & weißen Bohnen', emoji: '🥔', hue: 75,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 15, cuisine: 'italienisch', tags: [],
    ing: [['gnocchi', 250], ['weisse_bohnen', 120], ['spinat', 100], ['kirschtomaten', 150], ['knoblauch', 8], ['olivenoel', 10], ['hefeflocken', 10]],
    spice: 'Salz, Pfeffer, Chiliflocken',
    steps: ['Gnocchi im Öl goldbraun braten.', 'Knoblauch, Tomaten und Bohnen zugeben, 3 Min. braten.', 'Spinat zusammenfallen lassen, mit Hefeflocken und Gewürzen abschmecken.'],
  },
  {
    id: 'erdnuss-tofu-nudeln', name: 'Erdnuss-Tofu mit Reisnudeln', emoji: '🥜', hue: 34,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 25, cuisine: 'asiatisch', tags: [],
    ing: [['tofu', 200], ['reisnudeln', 80], ['brokkoli', 150], ['karotten', 80], ['erdnussbutter', 25], ['sojasauce', 20], ['limette', 20], ['ingwer', 10], ['rapsoel', 5]],
    spice: 'Chili, Knoblauch',
    steps: ['Reisnudeln nach Packung einweichen.', 'Tofu würfeln und anbraten, Gemüse zugeben.', 'Erdnussmus mit Sojasauce, Limette, Ingwer und etwas Wasser verrühren.', 'Nudeln und Sauce unterheben.'],
  },
  {
    id: 'garnelen-pasta', name: 'Garnelen-Zucchini-Pasta', emoji: '🍤', hue: 10,
    meals: ['abend'], diet: 'pesc', time: 20, cuisine: 'italienisch', tags: [],
    ing: [['garnelen', 180], ['vollkornnudeln', 90], ['zucchini', 200], ['kirschtomaten', 150], ['knoblauch', 8], ['olivenoel', 10], ['zitrone', 15]],
    spice: 'Chili, Petersilie, Salz',
    steps: ['Nudeln kochen.', 'Garnelen mit Knoblauch und Chili im Öl braten.', 'Zucchini und Tomaten 4 Min. mitbraten.', 'Mit Nudeln und Zitrone vermengen.'],
  },
  {
    id: 'burrito-bowl', name: 'Burrito-Bowl mit schwarzen Bohnen', emoji: '🌮', hue: 45,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 25, cuisine: 'mexikanisch', tags: ['mealprep'],
    ing: [['reis', 70], ['schwarze_bohnen', 150], ['mais', 60], ['paprika', 100], ['avocado', 60], ['tomaten', 100], ['limette', 15], ['sojajoghurt', 50]],
    spice: 'Kreuzkümmel, Paprikapulver, Koriander',
    steps: ['Reis kochen, mit Limettensaft mischen.', 'Bohnen mit Kreuzkümmel erwärmen, Paprika anbraten.', 'Alles mit Mais, Tomate und Avocado in einer Schale anrichten.', 'Einen Klecks Sojajoghurt darauf.'],
  },
  {
    id: 'ofen-suesskartoffel', name: 'Ofen-Süßkartoffel mit Hüttenkäse & Bohnen', emoji: '🍠', hue: 20,
    meals: ['mittag', 'abend'], diet: 'vegetarisch', time: 45, cuisine: 'international', tags: ['guenstig'],
    ing: [['suesskartoffel', 350], ['huettenkaese', 200], ['schwarze_bohnen', 100], ['fruehlingszwiebel', 15]],
    spice: 'Paprikapulver, Salz, Pfeffer',
    steps: ['Süßkartoffel einstechen und ca. 40 Min. bei 200 °C backen.', 'Aufschneiden, Bohnen erwärmen.', 'Mit Hüttenkäse, Bohnen und Frühlingszwiebeln füllen.'],
  },
  {
    id: 'kuerbissuppe', name: 'Kürbis-Kokos-Suppe mit Linsen', emoji: '🎃', hue: 28,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'international', tags: ['mealprep', 'onepot', 'guenstig'],
    ing: [['kuerbis', 400], ['rote_linsen', 50], ['kokosmilch', 80], ['zwiebel', 80], ['ingwer', 10], ['bruehe', 400], ['kuerbiskerne', 15]],
    spice: 'Curry, Salz, Pfeffer',
    steps: ['Kürbis (mit Schale) und Zwiebel würfeln, anschwitzen.', 'Linsen, Ingwer, Brühe und Curry zugeben, 20 Min. köcheln.', 'Kokosmilch zugeben, pürieren.', 'Mit gerösteten Kürbiskernen servieren.'],
  },
  {
    id: 'edamame-nudelsalat', name: 'Edamame-Nudelsalat mit Erdnussdressing', emoji: '🫛', hue: 110,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 20, cuisine: 'asiatisch', tags: ['mealprep', 'kalt'],
    ing: [['vollkornnudeln', 80], ['edamame', 150], ['karotten', 80], ['rotkohl', 80], ['fruehlingszwiebel', 15], ['erdnussbutter', 20], ['sojasauce', 15], ['limette', 15]],
    steps: ['Nudeln kochen, Edamame die letzten 3 Min. mitkochen, kalt abschrecken.', 'Karotte raspeln, Rotkohl fein schneiden.', 'Erdnussmus mit Sojasauce, Limette und Wasser verrühren.', 'Alles mischen.'],
  },
  {
    id: 'pilzrisotto', name: 'Pilz-Erbsen-Risotto', emoji: '🍄', hue: 42,
    meals: ['abend'], diet: 'vegan', time: 35, cuisine: 'italienisch', tags: ['onepot'],
    ing: [['risottoreis', 80], ['champignons', 200], ['erbsen', 100], ['zwiebel', 60], ['bruehe', 400], ['hefeflocken', 15], ['olivenoel', 10]],
    spice: 'Salz, Pfeffer, Thymian',
    steps: ['Zwiebel und Pilze im Öl anbraten.', 'Reis zugeben, glasig dünsten.', 'Nach und nach heiße Brühe zugeben und rühren (ca. 20 Min.).', 'Erbsen und Hefeflocken unterrühren.'],
  },
  {
    id: 'haehnchen-bulgur', name: 'Mediterrane Hähnchen-Bulgur-Bowl', emoji: '🍗', hue: 55,
    meals: ['mittag', 'abend'], diet: 'fleisch', time: 25, cuisine: 'mediterran', tags: ['mealprep'],
    ing: [['haehnchen', 160], ['bulgur', 70], ['gurke', 100], ['tomaten', 100], ['rote_zwiebel', 30], ['joghurt', 60], ['feta', 30], ['zitrone', 10], ['olivenoel', 5]],
    spice: 'Oregano, Knoblauch, Minze',
    steps: ['Bulgur kochen.', 'Hähnchen mit Oregano braten.', 'Gemüse würfeln, Joghurt mit Knoblauch und Minze verrühren.', 'In einer Bowl anrichten, Feta darüber.'],
  },
  {
    id: 'raeuchertofu-kartoffeln', name: 'Räuchertofu-Bratkartoffeln mit Spinat', emoji: '🥔', hue: 36,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'deutsch', tags: ['guenstig'],
    ing: [['raeuchertofu', 175], ['kartoffeln', 300], ['paprika', 100], ['zwiebel', 80], ['spinat', 60], ['rapsoel', 10]],
    spice: 'Majoran, Paprikapulver, Salz',
    steps: ['Kartoffeln kochen (oder Reste vom Vortag nehmen), in Scheiben schneiden.', 'Im Öl knusprig braten, Zwiebel und Räuchertofu zugeben.', 'Paprika und Spinat kurz mitbraten, würzen.'],
  },
  {
    id: 'gefuellte-paprika', name: 'Gefüllte Paprika mit Quinoa & Bohnen', emoji: '🫑', hue: 0,
    meals: ['abend'], diet: 'vegan', time: 45, cuisine: 'mexikanisch', tags: ['mealprep'],
    ing: [['paprika', 300, '2 Paprika'], ['quinoa', 60], ['kidneybohnen', 100], ['mais', 50], ['passierte_tomaten', 150], ['hefeflocken', 10]],
    spice: 'Kreuzkümmel, Paprikapulver, Salz',
    steps: ['Quinoa kochen und mit Bohnen, Mais und Gewürzen mischen.', 'Paprika halbieren, entkernen und füllen.', 'In eine Form mit den Tomaten setzen, 25 Min. bei 200 °C backen.', 'Mit Hefeflocken bestreuen.'],
  },
  {
    id: 'kartoffel-quark', name: 'Pellkartoffeln mit Kräuterquark & Leinöl', emoji: '🥔', hue: 70,
    meals: ['mittag', 'abend'], diet: 'vegetarisch', time: 25, cuisine: 'deutsch', tags: ['guenstig'],
    ing: [['kartoffeln', 350], ['magerquark', 250], ['leinoel', 10], ['gurke', 100], ['fruehlingszwiebel', 15]],
    spice: 'Schnittlauch, Petersilie, Salz, Pfeffer',
    steps: ['Kartoffeln 20 Min. kochen.', 'Quark mit Wasser, Kräutern und Gewürzen cremig rühren.', 'Mit Gurkenscheiben servieren, Leinöl über den Quark.'],
  },
  {
    id: 'miso-nudelsuppe', name: 'Miso-Nudelsuppe mit Tofu', emoji: '🍜', hue: 90,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 20, cuisine: 'asiatisch', tags: ['onepot'],
    ing: [['reisnudeln', 70], ['tofu', 150], ['brokkoli', 100], ['champignons', 100], ['miso', 20], ['ingwer', 10], ['fruehlingszwiebel', 15], ['bruehe', 500]],
    steps: ['Brühe mit Ingwer aufkochen, Pilze und Brokkoli 4 Min. garen.', 'Nudeln und Tofuwürfel zugeben, 3 Min. ziehen lassen.', 'Vom Herd nehmen, Miso einrühren (nicht mehr kochen).', 'Mit Frühlingszwiebeln servieren.'],
  },
  {
    id: 'tempeh-bowl', name: 'Teriyaki-Tempeh-Bowl', emoji: '🍱', hue: 15,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 25, cuisine: 'asiatisch', tags: ['mealprep'],
    ing: [['tempeh', 150], ['reis', 70], ['edamame', 80], ['karotten', 80], ['gurke', 80], ['sojasauce', 20], ['ahornsirup', 10], ['ingwer', 5], ['sesam', 5], ['rapsoel', 5]],
    steps: ['Reis kochen.', 'Tempeh in Scheiben braten.', 'Sojasauce, Ahornsirup und Ingwer zugeben und einkochen lassen.', 'Mit Edamame, Karotte und Gurke anrichten, Sesam darüber.'],
  },
  {
    id: 'aubergine-curry', name: 'Auberginen-Linsen-Curry', emoji: '🍆', hue: 280,
    meals: ['abend'], diet: 'vegan', time: 35, cuisine: 'indisch', tags: ['mealprep', 'onepot', 'guenstig'],
    ing: [['aubergine', 200], ['rote_linsen', 60], ['gehackte_tomaten', 200], ['kokosmilch', 60], ['zwiebel', 80], ['knoblauch', 8], ['reis', 60], ['rapsoel', 10]],
    spice: 'Garam Masala, Kurkuma, Salz',
    steps: ['Reis kochen.', 'Aubergine würfeln und im Öl anbraten, Zwiebel und Knoblauch zugeben.', 'Gewürze, Linsen, Tomaten, Kokosmilch und 150 ml Wasser zugeben.', '20 Min. köcheln.'],
  },
  {
    id: 'blumenkohl-bowl', name: 'Geröstete Blumenkohl-Bowl mit Hummus', emoji: '🥦', hue: 160,
    meals: ['mittag', 'abend'], diet: 'vegan', time: 30, cuisine: 'orientalisch', tags: ['mealprep'],
    ing: [['blumenkohl', 300], ['kichererbsen', 120], ['bulgur', 60], ['hummus', 60], ['rucola', 30], ['olivenoel', 10], ['zitrone', 10]],
    spice: 'Kreuzkümmel, Paprikapulver, Salz',
    steps: ['Blumenkohl in Röschen mit Kichererbsen, Öl und Gewürzen 25 Min. bei 210 °C rösten.', 'Bulgur kochen.', 'Mit Rucola und Hummus anrichten, Zitrone darüber.'],
  },

  // ---------- Snacks & Desserts ----------
  {
    id: 'protein-shake', name: 'Schoko-Bananen-Proteinshake', emoji: '🥤', hue: 25,
    meals: ['snack'], diet: 'vegan', time: 3, cuisine: 'international', tags: ['ohnekochen', 'kalt'],
    ing: [['sojadrink', 300], ['proteinpulver', 30], ['banane', 120], ['kakao', 5]],
    steps: ['Alles im Mixer oder Shaker kräftig mixen.'],
  },
  {
    id: 'hummus-sticks', name: 'Hummus mit Gemüsesticks', emoji: '🥕', hue: 30,
    meals: ['snack'], diet: 'vegan', time: 5, cuisine: 'orientalisch', tags: ['ohnekochen', 'kalt'],
    ing: [['hummus', 100], ['karotten', 100], ['paprika', 100], ['gurke', 100]],
    steps: ['Gemüse in Sticks schneiden.', 'Mit Hummus dippen.'],
  },
  {
    id: 'schoko-quark', name: 'Schoko-Quark-Creme mit Beeren', emoji: '🍫', hue: 20,
    meals: ['snack'], diet: 'vegetarisch', time: 5, cuisine: 'deutsch', tags: ['ohnekochen', 'kalt'],
    ing: [['magerquark', 250], ['kakao', 10], ['ahornsirup', 10], ['beeren', 60]],
    steps: ['Quark mit Kakao, Ahornsirup und einem Schuss Wasser cremig rühren.', 'Mit Beeren toppen.'],
  },
  {
    id: 'energy-balls', name: 'Dattel-Mandel-Energy-Balls', emoji: '🟤', hue: 28,
    meals: ['snack'], diet: 'vegan', time: 15, cuisine: 'international', tags: ['ohnekochen', 'mealprep'],
    ing: [['datteln', 40], ['mandeln', 20], ['haferflocken', 20], ['kakao', 5]],
    steps: ['Datteln, Mandeln, Haferflocken und Kakao im Mixer zerkleinern.', 'Zu 3 Kugeln formen (eine Portion), kühl lagern.'],
  },
  {
    id: 'edamame-snack', name: 'Edamame mit Meersalz', emoji: '🫛', hue: 115,
    meals: ['snack'], diet: 'vegan', time: 5, cuisine: 'asiatisch', tags: ['guenstig'],
    ing: [['edamame', 200]],
    spice: 'Meersalz, Chili',
    steps: ['Edamame 4 Min. in Salzwasser kochen.', 'Mit Meersalz und Chili bestreuen.'],
  },
  {
    id: 'apfel-erdnuss', name: 'Apfel mit Erdnussmus', emoji: '🍏', hue: 100,
    meals: ['snack'], diet: 'vegan', time: 2, cuisine: 'international', tags: ['ohnekochen', 'guenstig', 'kalt'],
    ing: [['apfel', 150], ['erdnussbutter', 20]],
    steps: ['Apfel in Spalten schneiden und ins Erdnussmus dippen.'],
  },
  {
    id: 'sojajoghurt-nuss', name: 'Sojajoghurt mit Nüssen & Banane', emoji: '🍌', hue: 52,
    meals: ['snack', 'fruehstueck'], diet: 'vegan', time: 3, cuisine: 'international', tags: ['ohnekochen', 'kalt'],
    ing: [['sojajoghurt', 200], ['banane', 100], ['walnuesse', 15], ['proteinpulver', 15]],
    steps: ['Proteinpulver in den Sojajoghurt rühren.', 'Banane und Walnüsse darüber.'],
  },
  {
    id: 'huettenkaese-snack', name: 'Hüttenkäse mit Gurke & Vollkornbrot', emoji: '🧀', hue: 150,
    meals: ['snack', 'fruehstueck'], diet: 'vegetarisch', time: 3, cuisine: 'deutsch', tags: ['ohnekochen', 'kalt'],
    ing: [['huettenkaese', 200], ['gurke', 100], ['vollkornbrot', 50]],
    spice: 'Pfeffer, Schnittlauch',
    steps: ['Brot mit Hüttenkäse belegen.', 'Mit Gurkenscheiben, Pfeffer und Schnittlauch servieren.'],
  },
];

// ---------- Kantine (Schätzwerte) ----------
export const CANTEEN = {
  id: 'kantine', name: 'Kantine: Salatbowl + Dessert', emoji: '🥗', hue: 135, sides: ['🍮'],
  note: 'Schätzung: Salatbowl mit Dressing ≈ 550 kcal / 22 g Protein, Dessert ≈ 300 kcal / 6 g Protein.',
};

// ---------- Berechnungen ----------
export function nutrition(recipe) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const [id, g] of recipe.ing) {
    const z = INGREDIENTS[id];
    if (!z) continue;
    t.kcal += (z.kcal * g) / 100; t.p += (z.p * g) / 100; t.c += (z.c * g) / 100; t.f += (z.f * g) / 100;
  }
  return { kcal: Math.round(t.kcal / 10) * 10, p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
}

const DIET_RANK = { vegan: 0, vegetarisch: 1, pesc: 2, fleisch: 3 };
export const dietFits = (recipeDiet, wanted) => (wanted === 'alle' ? true : DIET_RANK[recipeDiet] <= DIET_RANK[wanted]);

export const DIETS = { vegan: 'Vegan', vegetarisch: 'Vegetarisch', pesc: 'Mit Fisch', fleisch: 'Mit Fleisch' };
export const MEALS = { fruehstueck: 'Frühstück', mittag: 'Mittag', abend: 'Abend', snack: 'Snack' };
export const CUISINES = {
  international: 'International', deutsch: 'Deutsch', italienisch: 'Italienisch', mediterran: 'Mediterran',
  orientalisch: 'Orientalisch', indisch: 'Indisch', asiatisch: 'Asiatisch', mexikanisch: 'Mexikanisch',
};
export const TAGS = {
  highprotein: 'High Protein', schnell: 'Schnell', mealprep: 'Meal-Prep', guenstig: 'Günstig',
  ohnekochen: 'Ohne Kochen', onepot: 'One-Pot', kalt: 'Kalt / zum Mitnehmen', leicht: 'Leicht',
};

// Abgeleitete Felder einmalig berechnen
for (const r of RECIPES) {
  r.nut = nutrition(r);
  const auto = [];
  if (r.nut.p >= 30) auto.push('highprotein');
  if (r.time <= 15) auto.push('schnell');
  if (r.nut.kcal <= 450 && !r.meals.includes('snack')) auto.push('leicht');
  r.allTags = [...new Set([...r.tags, ...auto])];
}

export const recipeById = (id) => RECIPES.find((r) => r.id === id) || null;

/** Menge für Anzeige: Stück, ml oder g. */
export function formatAmount(id, grams, note) {
  if (note) return note;
  const z = INGREDIENTS[id];
  if (!z) return `${Math.round(grams)} g`;
  if (z.id === 'gewuerze') return '';
  if (z.pc) {
    const n = grams / z.pc;
    if (n >= 0.4) {
      const r = Math.round(n * 2) / 2;
      const unit = z.pcName || 'Stk';
      return `${String(r).replace('.', ',')} ${unit}${unit === 'Scheibe' && r > 1 ? 'n' : unit === 'Zehe' && r > 1 ? 'n' : ''}`;
    }
  }
  const v = grams >= 100 ? Math.round(grams / 10) * 10 : Math.round(grams);
  return `${v} ${z.ml ? 'ml' : 'g'}`;
}
