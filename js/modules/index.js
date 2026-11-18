// Zentrale Liste aller Bereiche und Module.
// Neues Modul: Datei anlegen → hier importieren → in sw.js (PRECACHE) eintragen → `node tools/check.mjs`.

import { registerArea } from '../core/registry.js';

registerArea({ id: 'organisation', title: 'Organisation', icon: 'calendar', order: 5 });
registerArea({ id: 'fitness', title: 'Gesundheit', icon: 'heart', order: 10 });
registerArea({ id: 'job', title: 'Job', icon: 'briefcase', order: 20 });
registerArea({ id: 'freizeit', title: 'Freizeit', icon: 'film', order: 30 });
registerArea({ id: 'hub', title: 'Allgemein', icon: 'home', order: 90 });

// Hub (bereichsübergreifend)
import './hub/today.js';
import './hub/progress.js';
import './hub/calendar.js';
import './hub/more.js';
import './hub/settings.js';

// Bereich: Organisation
import './termine/termine.js';

// Bereich: Gesundheit (Ordner heißt historisch „fitness“)
import './fitness/nutrition.js';
import './fitness/sleep.js';
import './fitness/supplements.js';
import './fitness/body.js';

// Bereich: Job
import './job/checkin.js';

// Bereich: Freizeit
import './freizeit/filme.js';
