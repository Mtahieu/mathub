// Setzt die App-Version in sw.js und js/version.js und legt einen CHANGELOG-Abschnitt an.
// Aufruf: node tools/bump-version.mjs 0.2.0 "Kurzbeschreibung"

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const [version, ...note] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Bitte Version im Format X.Y.Z angeben, z. B. node tools/bump-version.mjs 0.2.0 "Kalender"');
  process.exit(1);
}

const sub = (file, re, rep) => {
  const p = join(root, file);
  const s = readFileSync(p, 'utf8');
  if (!re.test(s)) throw new Error('Muster nicht gefunden in ' + file);
  writeFileSync(p, s.replace(re, rep));
};
sub('sw.js', /const VERSION = '[^']+'/, `const VERSION = '${version}'`);
sub('js/version.js', /APP_VERSION = '[^']+'/, `APP_VERSION = '${version}'`);

const date = new Date().toISOString().slice(0, 10);
const cl = join(root, 'CHANGELOG.md');
const s = readFileSync(cl, 'utf8');
const entry = `## ${version} – ${date}\n\n- ${note.join(' ') || '…'}\n\n`;
writeFileSync(cl, s.replace(/(# Changelog\n\n)/, `$1${entry}`));
console.log(`Version ${version} gesetzt.`);
