// Prüft vor jedem Release: Syntax aller JS-Dateien, Versionen synchron, alle Dateien im Offline-Cache.
// Aufruf: node tools/check.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
let errors = 0;
const fail = (msg) => { console.error('✗ ' + msg); errors++; };

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// 1) Syntax
const jsFiles = walk(join(root, 'js')).filter((f) => f.endsWith('.js'));
for (const f of [...jsFiles, join(root, 'sw.js')]) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`Syntaxfehler in ${relative(root, f)}:\n${e.stderr}`); }
}

// 2) Versionen
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const swVersion = sw.match(/const VERSION = '([^']+)'/)?.[1];
const appVersion = readFileSync(join(root, 'js/version.js'), 'utf8').match(/APP_VERSION = '([^']+)'/)?.[1];
if (swVersion !== appVersion) fail(`Version unterschiedlich: sw.js ${swVersion} ≠ js/version.js ${appVersion}`);

// 3) Precache vollständig
const precache = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]));
const shipped = [
  ...jsFiles, ...walk(join(root, 'css')), ...walk(join(root, 'icons')),
  join(root, 'index.html'), join(root, 'manifest.webmanifest'),
].map((f) => relative(root, f));
for (const f of shipped) if (!precache.has(f)) fail(`Nicht im Offline-Cache (sw.js PRECACHE): ${f}`);
for (const f of precache) if (f && !shipped.includes(f)) fail(`PRECACHE verweist auf fehlende Datei: ${f}`);

if (errors) { console.error(`\n${errors} Problem(e) gefunden.`); process.exit(1); }
console.log(`✓ Alles in Ordnung (Version ${appVersion}, ${jsFiles.length} JS-Dateien).`);
