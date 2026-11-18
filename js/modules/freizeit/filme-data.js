// Filme: Startliste und Infos. IDs nie ändern – items kind 'film' verweisen über catalogId darauf.
// Laufzeiten gerundet („ca.“). Stimmungen (moods) und Intensität (1 = entspannt … 3 = heftig) nutzt „Hilf mir zu entscheiden!“.

export const MOODS = {
  lachen: { label: 'Lachen', emoji: '😂' },
  gruseln: { label: 'Gruseln', emoji: '😱' },
  nachdenken: { label: 'Nachdenken', emoji: '🤔' },
  skurril: { label: 'Skurril', emoji: '🌀' },
  spannung: { label: 'Spannung', emoji: '⚡' },
};

export const INTENSITY = {
  1: 'entspannt',
  2: 'mittel',
  3: 'heftig',
};

export const FILM_CATALOG = [
  {
    id: 'the-lobster', title: 'The Lobster', year: 2015, runtime: 118, emoji: '🦞', hue: 200,
    director: 'Yorgos Lanthimos', cast: 'Colin Farrell, Rachel Weisz, Léa Seydoux', genre: 'Dystopische Satire, schwarze Komödie',
    moods: ['skurril', 'lachen', 'nachdenken'], intensity: 2,
    desc: 'In einer nahen Zukunft müssen Singles in einem Hotel binnen 45 Tagen einen Partner finden – sonst werden sie in ein Tier ihrer Wahl verwandelt. David wählt den Hummer. Trocken, absurd und bitterböse über Paarzwang und Liebe.',
  },
  {
    id: 'poor-things', title: 'Poor Things', year: 2023, runtime: 141, emoji: '🧪', hue: 320,
    director: 'Yorgos Lanthimos', cast: 'Emma Stone, Mark Ruffalo, Willem Dafoe', genre: 'Fantasy, Tragikomödie',
    moods: ['skurril', 'lachen', 'nachdenken'], intensity: 2,
    desc: 'Ein exzentrischer Wissenschaftler erweckt die junge Bella Baxter wieder zum Leben. Mit kindlicher Neugier bricht sie zu einer Reise durch Europa auf und entdeckt die Welt – und sich selbst. Opulent, wild und sehr freizügig; Oscar für Emma Stone.',
  },
  {
    id: 'lammbock', title: 'Lammbock', year: 2001, runtime: 90, emoji: '🍕', hue: 40,
    director: 'Christian Zübert', cast: 'Moritz Bleibtreu, Lucas Gregorowicz', genre: 'Komödie',
    moods: ['lachen'], intensity: 1,
    desc: 'Kai und Stefan betreiben in Würzburg einen Pizza-Lieferdienst mit ganz besonderem Nebengeschäft – bis ein verdeckter Ermittler auftaucht. Deutscher Kult-Kifferfilm mit legendären Dialogen. Leichte Kost für einen entspannten Abend.',
  },
  {
    id: 'sinners', title: 'Sinners', year: 2025, runtime: 137, emoji: '🎸', hue: 0,
    director: 'Ryan Coogler', cast: 'Michael B. Jordan, Hailee Steinfeld, Miles Caton', genre: 'Horror, Thriller, Musik',
    moods: ['gruseln', 'spannung'], intensity: 3,
    desc: 'Mississippi, 1932: Die Zwillinge Smoke und Stack eröffnen in ihrer Heimatstadt einen Juke Joint mit Blues-Musik. In der Eröffnungsnacht taucht ein uraltes Böses auf. Atmosphärischer Vampir-Horror mit großartiger Musik.',
  },
  {
    id: 'the-substance', title: 'The Substance', year: 2024, runtime: 141, emoji: '💉', hue: 140,
    director: 'Coralie Fargeat', cast: 'Demi Moore, Margaret Qualley, Dennis Quaid', genre: 'Body-Horror, Satire',
    moods: ['gruseln', 'nachdenken', 'skurril'], intensity: 3,
    desc: 'Eine alternde TV-Fitness-Ikone greift zu einem Schwarzmarkt-Serum, das eine jüngere, „bessere“ Version von ihr erschafft – mit strengen Regeln. Grelle Satire über Schönheitswahn, mit drastischen, sehr blutigen Bildern.',
  },
];

export const catalogFilm = (id) => FILM_CATALOG.find((f) => f.id === id) || null;
