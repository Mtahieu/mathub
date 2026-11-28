// Zentrale Liste aller Bereiche und Module.
// Neues Modul: Datei anlegen → hier importieren → in sw.js (PRECACHE) eintragen → `node tools/check.mjs`.
// Tabs unten: Home (1), Filme (2), Kochen (3). Einstellungen über das Zahnrad auf Home.

import { registerArea } from '../core/registry.js';

registerArea({ id: 'freizeit', title: 'Filme', icon: 'film', order: 10 });
registerArea({ id: 'fitness', title: 'Kochen', icon: 'food', order: 20 });   // Ordner heißt historisch „fitness“
registerArea({ id: 'hub', title: 'Allgemein', icon: 'home', order: 90 });

// Allgemein
import './hub/home.js';
import './hub/settings.js';

// Filme
import './freizeit/filme.js';
import './freizeit/teilen.js';

// Kochen (Rezepte, Wochenplan, Einkaufsliste)
import './fitness/nutrition.js';
