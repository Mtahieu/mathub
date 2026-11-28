// Sprüche für die Startseite: berühmte (kurze) Filmzitate und alberne Sprüche – auf Englisch.
// Bei jedem App-Start wird einer gezogen (nie zweimal hintereinander derselbe).

export const QUOTES = [
  // Filmzitate
  { text: 'May the Force be with you.', src: 'Star Wars (1977)' },
  { text: 'Do. Or do not. There is no try.', src: 'The Empire Strikes Back (1980)' },
  { text: 'I’ll be back.', src: 'The Terminator (1984)' },
  { text: 'Hasta la vista, baby.', src: 'Terminator 2: Judgment Day (1991)' },
  { text: 'Here’s looking at you, kid.', src: 'Casablanca (1942)' },
  { text: 'To infinity and beyond!', src: 'Toy Story (1995)' },
  { text: 'Just keep swimming.', src: 'Finding Nemo (2003)' },
  { text: 'Why so serious?', src: 'The Dark Knight (2008)' },
  { text: 'I’m gonna make him an offer he can’t refuse.', src: 'The Godfather (1972)' },
  { text: 'You’re gonna need a bigger boat.', src: 'Jaws (1975)' },
  { text: 'Houston, we have a problem.', src: 'Apollo 13 (1995)' },
  { text: 'Life was like a box of chocolates. You never know what you’re gonna get.', src: 'Forrest Gump (1994)' },
  { text: 'I see dead people.', src: 'The Sixth Sense (1999)' },
  { text: 'There’s no place like home.', src: 'The Wizard of Oz (1939)' },
  { text: 'The Dude abides.', src: 'The Big Lebowski (1998)' },
  { text: 'Wax on, wax off.', src: 'The Karate Kid (1984)' },
  { text: 'Roads? Where we’re going, we don’t need roads.', src: 'Back to the Future (1985)' },
  { text: 'I am Groot.', src: 'Guardians of the Galaxy (2014)' },
  { text: 'After all, tomorrow is another day!', src: 'Gone with the Wind (1939)' },
  { text: 'Carpe diem. Seize the day, boys.', src: 'Dead Poets Society (1989)' },
  { text: 'Bond. James Bond.', src: 'Dr. No (1962)' },
  { text: 'I feel the need – the need for speed!', src: 'Top Gun (1986)' },
  { text: 'You can’t handle the truth!', src: 'A Few Good Men (1992)' },
  { text: 'Hakuna Matata!', src: 'The Lion King (1994)' },
  { text: 'Say hello to my little friend!', src: 'Scarface (1983)' },
  { text: 'I’m the king of the world!', src: 'Titanic (1997)' },
  { text: 'Nobody puts Baby in a corner.', src: 'Dirty Dancing (1987)' },
  { text: 'E.T. phone home.', src: 'E.T. the Extra-Terrestrial (1982)' },
  { text: 'Keep your friends close, but your enemies closer.', src: 'The Godfather Part II (1974)' },
  { text: 'Fasten your seatbelts. It’s going to be a bumpy night.', src: 'All About Eve (1950)' },
  { text: 'It’s alive! It’s alive!', src: 'Frankenstein (1931)' },
  { text: 'With great power comes great responsibility.', src: 'Spider-Man (2002)' },
  { text: 'Just when I thought I was out, they pull me back in.', src: 'The Godfather Part III (1990)' },
  { text: 'I’m not bad. I’m just drawn that way.', src: 'Who Framed Roger Rabbit (1988)' },
  { text: 'Ogres are like onions.', src: 'Shrek (2001)' },
  { text: 'Every passing minute is another chance to turn it all around.', src: 'Vanilla Sky (2001)' },
  // Alberne Sprüche
  { text: 'I’m not lazy. I’m in energy-saving mode.' },
  { text: 'Coffee first. Adulting second.' },
  { text: 'I put the “pro” in procrastination.' },
  { text: 'Life is short. Eat dessert first.' },
  { text: 'Running late is my cardio.' },
  { text: 'I’m on a seafood diet. I see food and I eat it.' },
  { text: 'Behind every great person is a cat judging them.' },
  { text: 'Today’s forecast: 100 % chance of snacks.' },
  { text: 'Popcorn is just corn that got really excited.' },
  { text: 'Plot twist: the couch was the main character all along.' },
  { text: 'I followed my heart. It led me to the fridge.' },
  { text: 'My cooking is so good, even the smoke alarm cheers me on.' },
  { text: 'Spoiler alert: you’re awesome.' },
  { text: 'Netflix asked if I’m still watching. Rude.' },
  { text: 'I don’t need a hair stylist. My pillow gives me a new hairstyle every morning.' },
  { text: 'Calories don’t count on movie night. Science.' },
  { text: 'I came, I saw, I made it awkward.' },
  { text: 'Five more minutes – said every hero ever, probably.' },
  { text: 'Pasta la vista, baby.' },
  { text: 'Lettuce turnip the beet!' },
  { text: 'I’ve got 99 problems, but a snack ain’t one.' },
];

/** Zufälliger Spruch, nicht derselbe wie last (Index). */
export function pickQuote(last) {
  if (QUOTES.length < 2) return 0;
  let i;
  do { i = Math.floor(Math.random() * QUOTES.length); } while (i === last);
  return i;
}
