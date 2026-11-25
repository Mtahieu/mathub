// Filme: Startliste und Infos. IDs nie ändern – items kind 'film' verweisen über catalogId darauf.
// Laufzeiten gerundet („ca.“). Stimmungen (moods) und Intensität (1 = entspannt … 3 = heftig) nutzt „Hilf mir zu entscheiden!“.
// Kategorien (genres) dienen als Filter und Info. wiki = Titel des englischen Wikipedia-Artikels – daraus lädt
// das Handy das Titelbild (siehe filme-poster.js). Die Bilder liegen nicht im Repo.

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

export const GENRES = {
  komoedie: 'Komödie',
  drama: 'Drama',
  horror: 'Horror',
  thriller: 'Thriller',
  scifi: 'Science-Fiction',
  fantasy: 'Fantasy',
  animation: 'Animation',
  abenteuer: 'Abenteuer',
  action: 'Action',
  superhelden: 'Superhelden',
  satire: 'Satire',
  romantik: 'Romantik',
  krimi: 'Krimi',
  familie: 'Familie',
};

export const FILM_CATALOG = [
  {
    id: 'the-lobster', title: 'The Lobster', year: 2015, runtime: 118, emoji: '🦞', hue: 200,
    wiki: 'The Lobster', country: 'Irland, Großbritannien, Griechenland u. a.',
    director: 'Yorgos Lanthimos', cast: 'Colin Farrell, Rachel Weisz, Léa Seydoux, John C. Reilly, Ben Whishaw',
    genres: ['satire', 'scifi', 'romantik', 'drama'],
    moods: ['skurril', 'lachen', 'nachdenken'], intensity: 2,
    desc: 'In einer nahen Zukunft ist Alleinsein verboten: Wer keinen Partner hat, muss in ein Hotel ziehen und dort binnen 45 Tagen jemanden finden – sonst wird er in ein Tier seiner Wahl verwandelt. David (Colin Farrell), frisch verlassen, wählt den Hummer. Als er aus dem Hotel zu den „Einzelgängern“ im Wald flieht, wo Liebe streng verboten ist, verliebt er sich ausgerechnet dort.',
    why: 'Bitterböse, staubtrockene Satire über Paarzwang und Dating-Regeln. Seltsam, komisch und unbequem zugleich – ein Film zum Diskutieren danach. Preis der Jury in Cannes.',
  },
  {
    id: 'poor-things', title: 'Poor Things', year: 2023, runtime: 141, emoji: '🧪', hue: 320,
    wiki: 'Poor Things (film)', country: 'Großbritannien, Irland, USA',
    director: 'Yorgos Lanthimos', cast: 'Emma Stone, Mark Ruffalo, Willem Dafoe, Ramy Youssef',
    genres: ['fantasy', 'scifi', 'komoedie', 'drama'],
    moods: ['skurril', 'lachen', 'nachdenken'], intensity: 2,
    desc: 'Im viktorianischen London holt der exzentrische Chirurg Godwin Baxter (Willem Dafoe) die junge Bella (Emma Stone) auf unorthodoxe Weise ins Leben zurück. Mit dem Verstand eines Kindes und rasend schnell lernend brennt sie mit dem schmierigen Anwalt Duncan (Mark Ruffalo) durch – über Lissabon, ein Kreuzfahrtschiff und Paris entdeckt sie die Welt, ihren Körper und ihre Freiheit.',
    why: 'Ein bildgewaltiges, schräges Märchen für Erwachsene, sehr freizügig und überraschend witzig. Goldener Löwe in Venedig, 4 Oscars – u. a. für Emma Stone. Basiert auf dem Roman von Alasdair Gray.',
  },
  {
    id: 'lammbock', title: 'Lammbock', year: 2001, runtime: 90, emoji: '🍕', hue: 40,
    wiki: 'Lammbock', country: 'Deutschland',
    director: 'Christian Zübert', cast: 'Moritz Bleibtreu, Lucas Gregorowicz, Alexandra Neldel, Elmar Wepper',
    genres: ['komoedie', 'krimi'],
    moods: ['lachen'], intensity: 1,
    desc: 'Würzburg: Kai (Moritz Bleibtreu) und Jura-Student Stefan (Lucas Gregorowicz) betreiben den Pizza-Lieferdienst „Lammbock“ – mit einer ganz besonderen Zutat für Stammkunden, angebaut in der eigenen Plantage. Doch Stefans Examen rückt näher, die Ernte wird knapp und ein verdeckter Ermittler hat die beiden längst auf dem Schirm.',
    why: 'Deutscher Kult-Kifferfilm mit legendären Dialogen und viel Lokalkolorit. Leichte, kurze Kost für einen entspannten Abend. Fortsetzung: „Lommbock“ (2017).',
  },
  {
    id: 'watchmen', title: 'Watchmen', year: 2009, runtime: 162, emoji: '🕰️', hue: 50,
    wiki: 'Watchmen (film)', country: 'USA',
    director: 'Zack Snyder', cast: 'Jackie Earle Haley, Patrick Wilson, Billy Crudup, Malin Åkerman, Jeffrey Dean Morgan, Matthew Goode',
    genres: ['superhelden', 'action', 'krimi', 'drama'],
    moods: ['spannung', 'nachdenken'], intensity: 3,
    desc: 'Ein alternatives Jahr 1985: Nixon regiert noch immer, maskierte Helden sind verboten und der Kalte Krieg steht kurz vor dem Atomkrieg. Als der zynische „Comedian“ ermordet wird, glaubt der kompromisslose Rorschach an einen Komplott gegen ehemalige Helden und trommelt seine alten Weggefährten zusammen – darunter den gottgleichen Dr. Manhattan.',
    why: 'Düstere, brutale und erwachsene Verfilmung der berühmten Graphic Novel von Alan Moore und Dave Gibbons. Lang, aber visuell eindrucksvoll – eher ein Krimi-Drama als ein typischer Superheldenfilm.',
  },
  {
    id: 'the-substance', title: 'The Substance', year: 2024, runtime: 141, emoji: '💉', hue: 140,
    wiki: 'The Substance', country: 'Frankreich, Großbritannien, USA',
    director: 'Coralie Fargeat', cast: 'Demi Moore, Margaret Qualley, Dennis Quaid',
    genres: ['horror', 'satire', 'scifi'],
    moods: ['gruseln', 'nachdenken', 'skurril'], intensity: 3,
    desc: 'Ausgerechnet an ihrem 50. Geburtstag wird die TV-Fitness-Ikone Elisabeth Sparkle (Demi Moore) von ihrem Produzenten (Dennis Quaid) aussortiert. Verzweifelt greift sie zu einem Schwarzmarkt-Serum, das eine jüngere, „perfekte“ Version von ihr erschafft: Sue (Margaret Qualley). Die Regel ist einfach – alle sieben Tage wird gewechselt. Doch Sue will immer mehr Zeit.',
    why: 'Grelle, überdrehte Satire über Schönheitswahn und das Altern als Frau im Showbusiness. Body-Horror mit drastischen, sehr blutigen Bildern – nichts für schwache Mägen. Drehbuchpreis in Cannes, Golden Globe für Demi Moore.',
  },
  {
    id: 'puss-in-boots-last-wish', title: 'Puss in Boots: The Last Wish', deTitle: 'Der gestiefelte Kater: Der letzte Wunsch',
    year: 2022, runtime: 102, emoji: '🐈', hue: 25,
    wiki: 'Puss in Boots: The Last Wish', country: 'USA',
    director: 'Joel Crawford', cast: 'Stimmen (Original): Antonio Banderas, Salma Hayek, Harvey Guillén, Florence Pugh, Wagner Moura',
    genres: ['animation', 'abenteuer', 'komoedie', 'fantasy', 'familie'],
    moods: ['lachen', 'spannung'], intensity: 1,
    desc: 'Der gestiefelte Kater hat acht seiner neun Leben leichtsinnig verbraucht – und ein unheimlicher Kopfgeldjäger in Wolfsgestalt ist ihm auf den Fersen. Seine letzte Hoffnung ist der legendäre Wunschstern. Gemeinsam mit seiner Ex-Partnerin Kitty Samtpfote und dem unverbesserlich fröhlichen Hund Perrito macht er sich auf die Suche – im Wettlauf gegen Goldlöckchen mit den drei Bären und den gierigen „Big“ Jack Horner.',
    why: 'Animationsfilm von DreamWorks im Look eines lebendigen Märchenbuchs – witzig, temporeich und überraschend gefühlvoll beim Thema Angst und Sterblichkeit. Oscar-nominiert. Auch ohne die „Shrek“-Filme zu kennen gut verständlich.',
  },
];

export const catalogFilm = (id) => FILM_CATALOG.find((f) => f.id === id) || null;
