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
  {
    id: 'smile-2', title: 'Smile 2', year: 2024, runtime: 127, emoji: '😁', hue: 350,
    wiki: 'Smile 2', country: 'USA',
    director: 'Parker Finn', cast: 'Naomi Scott, Lukas Gage, Rosemarie DeWitt, Kyle Gallner, Ray Nicholson',
    genres: ['horror', 'thriller'],
    moods: ['gruseln', 'spannung'], intensity: 3,
    desc: 'Popstar Skye Riley (Naomi Scott) will nach einem schweren Unfall und dem Entzug mit einer Welttournee ihr Comeback feiern. Doch kurz vor dem Start wird sie Zeugin eines grausamen Vorfalls – und von da an verfolgen sie unheimliche, grinsende Gesichter. Zwischen Proben, Pressedruck und Halluzinationen weiß sie bald nicht mehr, was echt ist.',
    why: 'Fortsetzung des Horror-Hits „Smile“ (2022), funktioniert aber auch ohne Vorwissen. Intensiver Psycho-Horror mit vielen Schockmomenten und drastischen Szenen, getragen von einer starken Naomi Scott. Nichts für einen entspannten Abend.',
  },
  {
    id: 'sinners', title: 'Sinners', year: 2025, runtime: 137, emoji: '🎸', hue: 0,
    wiki: 'Sinners (2025 film)', country: 'USA',
    director: 'Ryan Coogler', cast: 'Michael B. Jordan, Hailee Steinfeld, Miles Caton, Jack O’Connell, Wunmi Mosaku, Delroy Lindo',
    genres: ['horror', 'thriller', 'drama'],
    moods: ['gruseln', 'spannung'], intensity: 3,
    desc: 'Mississippi, 1932: Die Zwillingsbrüder Smoke und Stack (beide Michael B. Jordan) kehren nach Jahren in Chicago in ihre Heimat zurück und eröffnen einen Juke Joint, in dem ihr junger Cousin Sammie den Blues spielt. Die Eröffnungsnacht wird ein rauschendes Fest – bis ungebetene Gäste vor der Tür stehen, die man besser nicht hereinbittet.',
    why: 'Erst Südstaaten-Drama mit grandioser Musik, dann blutiger Vampir-Horror – Ryan Coogler („Black Panther“) mischt Genres mit viel Atmosphäre. Lang und heftig, aber eines der meistgefeierten Kinoereignisse 2025.',
  },
  {
    id: 'saw', title: 'Saw', year: 2004, runtime: 103, emoji: '🪚', hue: 20,
    wiki: 'Saw (2004 film)', country: 'USA',
    director: 'James Wan', cast: 'Cary Elwes, Leigh Whannell, Danny Glover, Tobin Bell, Monica Potter',
    genres: ['horror', 'thriller', 'krimi'],
    moods: ['gruseln', 'spannung'], intensity: 3,
    desc: 'Zwei Männer wachen in einem verdreckten Kellerraum auf, jeweils an ein Rohr gekettet, zwischen ihnen ein Toter. Ein Tonband erklärt die Regeln eines grausamen Spiels. Während sie versuchen, das Rätsel zu lösen, jagt die Polizei einen Serienmörder, der seine Opfer in tödliche „Prüfungen“ zwingt.',
    why: 'Der Auftakt der berühmten Horror-Reihe – mit kleinem Budget gedreht, eher Psychothriller als Splatter, mit einem der bekanntesten Twists des Genres. Für starke Nerven.',
  },
  {
    id: 'when-harry-met-sally', title: 'When Harry Met Sally…', deTitle: 'Harry und Sally', year: 1989, runtime: 96, emoji: '💑', hue: 330,
    wiki: 'When Harry Met Sally...', country: 'USA',
    director: 'Rob Reiner', cast: 'Billy Crystal, Meg Ryan, Carrie Fisher, Bruno Kirby',
    genres: ['romantik', 'komoedie'],
    moods: ['lachen'], intensity: 1,
    desc: 'Harry und Sally lernen sich nach dem College auf einer gemeinsamen Autofahrt nach New York kennen – und können sich nicht ausstehen. Über zwölf Jahre laufen sie sich immer wieder über den Weg, werden schließlich Freunde und streiten dabei über die große Frage: Können Männer und Frauen überhaupt nur befreundet sein?',
    why: 'Der Klassiker der romantischen Komödie: schlagfertige Dialoge von Nora Ephron, New York im Herbst und die legendäre Szene im Deli. Kurz, warmherzig, perfekt für einen gemütlichen Abend.',
  },
  {
    id: 'whiplash', title: 'Whiplash', year: 2014, runtime: 107, emoji: '🥁', hue: 30,
    wiki: 'Whiplash (2014 film)', country: 'USA',
    director: 'Damien Chazelle', cast: 'Miles Teller, J. K. Simmons, Paul Reiser, Melissa Benoist',
    genres: ['drama'],
    moods: ['spannung', 'nachdenken'], intensity: 2,
    desc: 'Der junge Jazz-Schlagzeuger Andrew will einer der ganz Großen werden und schafft es an ein elitäres Konservatorium in New York. Dort holt ihn der gefürchtete Bandleader Terence Fletcher in sein Orchester – ein Lehrer, der seine Schüler mit Demütigungen und Psychoterror an und über ihre Grenzen treibt.',
    why: 'Spannend wie ein Thriller, obwohl es „nur“ um Musik geht – mit einem furiosen Finale. J. K. Simmons gewann den Oscar als bester Nebendarsteller. Regie: Damien Chazelle („La La Land“).',
  },
  {
    id: 'vhs', title: 'V/H/S', year: 2012, runtime: 116, emoji: '📼', hue: 270,
    wiki: 'V/H/S', country: 'USA',
    director: 'Adam Wingard, David Bruckner, Ti West, Glenn McQuaid, Joe Swanberg, Radio Silence', cast: 'Calvin Reeder, Lane Hughes, Adam Wingard, Hannah Fierman',
    genres: ['horror'],
    moods: ['gruseln', 'spannung'], intensity: 3,
    desc: 'Eine Gruppe Kleinkrimineller soll in einem abgelegenen Haus eine bestimmte Videokassette stehlen. Dort finden sie einen Toten vor einem Stapel Fernseher – und jede Menge VHS-Bänder. Beim Durchsehen entfaltet sich ein Kurzfilm-Horror nach dem anderen, gefilmt im wackligen Found-Footage-Stil.',
    why: 'Der erste Teil der Horror-Reihe: eine Anthologie aus mehreren Kurzgeschichten verschiedener Regisseure – roh, unheimlich und abwechslungsreich. Wackelkamera und Schockmomente – nichts für empfindliche Mägen.',
  },
];

export const catalogFilm = (id) => FILM_CATALOG.find((f) => f.id === id) || null;
