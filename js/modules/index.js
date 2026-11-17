// Zentrale Liste aller Bereiche und Module.
// Neues Modul: Datei anlegen → hier importieren → in sw.js (PRECACHE) eintragen → `node tools/check.mjs`.

import { registerArea } from '../core/registry.js';

registerArea({ id: 'fitness', title: 'Fitness', icon: 'dumbbell', order: 10 });
registerArea({ id: 'hub', title: 'Allgemein', icon: 'home', order: 90 });

// Hub (bereichsübergreifend)
import './hub/today.js';
import './hub/progress.js';
import './hub/calendar.js';
import './hub/more.js';
import './hub/settings.js';

// Bereich: Fitness
import './fitness/training.js';
import './fitness/nutrition.js';
import './fitness/body.js';
