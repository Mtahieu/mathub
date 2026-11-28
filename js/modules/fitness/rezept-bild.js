// Gezeichnete Rezeptbilder – aus den Zutaten erzeugt, komplett offline, für jedes Rezept immer gleich.
// Draufsicht auf Schüssel, Teller oder Brett (bzw. Glas bei Shakes) auf einem Tisch: Grundfarbe aus der
// Hauptzutat (Sauce, Brei, Suppe …), darauf die übrigen Zutaten als Toppings in ihrer typischen Form.

import { INGREDIENTS } from './food-data.js';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

// ---------- Zutaten: Farbe & Form ----------
// form: base (Grundmasse) · leaf · chunk · round · floret · slice · sprinkle · drizzle · noodle · grain · skip
const LOOK = {
  haferflocken: ['#d8bf8f', 'base'], reis: ['#f3eee2', 'grain'], risottoreis: ['#efe4c8', 'base'],
  vollkornnudeln: ['#d9a868', 'noodle'], nudeln: ['#e8c46a', 'noodle'], reisnudeln: ['#f1e9d6', 'noodle'],
  quinoa: ['#e3d3a6', 'grain'], couscous: ['#e9cf8e', 'grain'], bulgur: ['#cfa865', 'grain'],
  rote_linsen: ['#df8a3e', 'base'], sojagranulat: ['#9b6a43', 'sprinkle'], gnocchi: ['#f0dca0', 'round'],
  kartoffeln: ['#e9c36a', 'chunk'], suesskartoffel: ['#ec8a35', 'chunk'], vollkornbrot: ['#a06a3a', 'bread'],
  tortilla: ['#ecd29a', 'bread'], kichererbsen: ['#e2bf7a', 'round'], kidneybohnen: ['#8a2d2a', 'round'],
  schwarze_bohnen: ['#2d2424', 'round'], weisse_bohnen: ['#f1ead8', 'round'], mais: ['#f6cd34', 'round'],
  passierte_tomaten: ['#c83a26', 'base'], gehackte_tomaten: ['#cf4a2c', 'base'], kokosmilch: ['#f4ecd9', 'base'],
  hummus: ['#e4c995', 'base'], currypaste: ['#d8642a', 'drizzle'], pesto: ['#5f8f2f', 'drizzle'],
  edamame: ['#7fbf4a', 'round'], erbsen: ['#86c449', 'round'], beeren: ['#5a2d73', 'round'],
  tofu: ['#f4ead2', 'chunk'], raeuchertofu: ['#b98a52', 'chunk'], tempeh: ['#b88c4f', 'chunk'], seitan: ['#a5683a', 'chunk'],
  sojajoghurt: ['#f6f3ec', 'base'], sojadrink: ['#f1ebdf', 'base'], proteinpulver: ['#e8dcc6', 'skip'],
  brokkoli: ['#3f8f3a', 'floret'], blumenkohl: ['#f0e6c8', 'floret'], spinat: ['#2f7a35', 'leaf'],
  paprika: ['#d93a2b', 'chunk'], zucchini: ['#6aa33f', 'slice'], tomaten: ['#e0452f', 'slice'],
  kirschtomaten: ['#e2392b', 'round'], zwiebel: ['#efe3c8', 'skip'], rote_zwiebel: ['#8e3a6a', 'ring'],
  fruehlingszwiebel: ['#59a83b', 'sprinkle'], knoblauch: ['#f2ead6', 'skip'], ingwer: ['#d9b46a', 'skip'],
  karotten: ['#ef7f22', 'slice'], gurke: ['#7dbb5a', 'slice'], salat: ['#5ba63f', 'leaf'], rucola: ['#3e8a35', 'leaf'],
  champignons: ['#b99470', 'slice'], aubergine: ['#5b2f5c', 'chunk'], rotkohl: ['#7a2f6e', 'leaf'],
  kuerbis: ['#ee8a2a', 'base'], avocado: ['#8cbf4a', 'slice'], banane: ['#f4dc7a', 'slice'], apfel: ['#cf3b33', 'slice'],
  mango: ['#f6a92e', 'chunk'], zitrone: ['#f5d73b', 'slice'], limette: ['#8fc23f', 'slice'],
  olivenoel: ['#c9b03a', 'skip'], rapsoel: ['#d9b93a', 'skip'], leinoel: ['#c7a43a', 'drizzle'],
  erdnussbutter: ['#b5793a', 'drizzle'], mandeln: ['#b07a4a', 'sprinkle'], walnuesse: ['#8b5a2b', 'sprinkle'],
  kuerbiskerne: ['#4f6b33', 'sprinkle'], chiasamen: ['#3a3a3a', 'sprinkle'], leinsamen: ['#8a5a32', 'sprinkle'],
  sesam: ['#efe2bf', 'sprinkle'], tahini: ['#d9b77f', 'drizzle'], datteln: ['#6a3a1f', 'round'], kakao: ['#5a3624', 'base'],
  ahornsirup: ['#b8641e', 'drizzle'], hefeflocken: ['#f2d16a', 'sprinkle'], sojasauce: ['#4a2a18', 'drizzle'],
  miso: ['#c9975a', 'base'], bruehe: ['#d6a55a', 'base'], gewuerze: ['#a0522d', 'skip'],
};

/** Grundfarbe von Suppen/Currys etwas „angedickt“ mischen (z. B. Tomate + Kokos = Orange-Rosé). */
function mix(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---------- Zufall mit festem Startwert pro Rezept ----------
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const el = (tag, attrs, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
  for (const c of kids.flat()) if (c) n.append(c);
  return n;
};

// ---------- Gefäß wählen ----------
function vesselOf(r) {
  const s = `${r.id} ${r.name}`.toLowerCase();
  if (/shake|smoothie(?!-bowl)/.test(s) && !/bowl/.test(s)) return 'glass';
  if (/toast|brot|wrap|gyros|sticks|apfel-erdnuss|energy|snack/.test(s) && !/edamame-nudel/.test(s)) return 'board';
  if (/suppe|curry|dal|chili|bowl|risotto|porridge|oats|pudding|joghurt|salat|bolognese|nudelsuppe|creme/.test(s)) return 'bowl';
  return 'plate';
}

// ---------- Formen ----------
function leaf(x, y, s, rot, color) {
  return el('g', { transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})` },
    el('path', { d: 'M0 -9 C7 -6 8 4 0 9 C-8 4 -7 -6 0 -9Z', fill: color }),
    el('path', { d: 'M0 -8 L0 8', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 0.8, fill: 'none' }));
}
function chunk(x, y, s, rot, color) {
  return el('rect', { x: x - 5 * s, y: y - 5 * s, width: 10 * s, height: 10 * s, rx: 2.6 * s, fill: color, transform: `rotate(${rot} ${x} ${y})`, stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.6 });
}
function round(x, y, s, color) {
  return el('g', null,
    el('circle', { cx: x, cy: y, r: 3.6 * s, fill: color }),
    el('circle', { cx: x - 1.1 * s, cy: y - 1.2 * s, r: 1.1 * s, fill: 'rgba(255,255,255,.35)' }));
}
function floret(x, y, s, color) {
  const g = el('g');
  for (const [dx, dy, rr] of [[0, 0, 4], [-4, -2, 3.2], [4, -2, 3.2], [-2, 3.5, 3], [3, 3.5, 3]]) {
    g.append(el('circle', { cx: x + dx * s, cy: y + dy * s, r: rr * s, fill: color }));
  }
  g.append(el('circle', { cx: x - 1 * s, cy: y - 2 * s, r: 1.4 * s, fill: 'rgba(255,255,255,.25)' }));
  return g;
}
function slice(x, y, s, rot, color, half) {
  const g = el('g', { transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})` });
  if (half) g.append(el('path', { d: 'M-7 0 A7 7 0 0 1 7 0 Z', fill: color, stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.6 }));
  else {
    g.append(el('circle', { r: 6.5, fill: color, stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.6 }));
    g.append(el('circle', { r: 4.2, fill: 'rgba(255,255,255,.22)' }));
  }
  return g;
}
function ring(x, y, s, color) {
  return el('ellipse', { cx: x, cy: y, rx: 6 * s, ry: 4 * s, fill: 'none', stroke: color, 'stroke-width': 1.8 * s });
}
function sprinkle(x, y, s, color) {
  return el('ellipse', { cx: x, cy: y, rx: 1.4 * s, ry: 0.9 * s, fill: color });
}
function noodles(cx, cy, R, color, rand) {
  const g = el('g', { fill: 'none', 'stroke-linecap': 'round' });
  const dark = mix(color, '#7a4a1a', 0.25); const light = mix(color, '#ffffff', 0.45);
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2; const d = Math.sqrt(rand()) * R * 0.7;
    const x = cx + Math.cos(a) * d; const y = cy + Math.sin(a) * d * 0.9;
    const w = 6 + rand() * 9; const k = -5 + rand() * 10; const rot = rand() * 180;
    const path = `M${(x - w).toFixed(1)} ${y.toFixed(1)} q${(w / 2).toFixed(1)} ${k.toFixed(1)} ${w.toFixed(1)} 0 t${w.toFixed(1)} 0`;
    g.append(el('path', { d: path, stroke: dark, 'stroke-width': 4.6, transform: `rotate(${rot} ${x} ${y})` }));
    g.append(el('path', { d: path, stroke: color, 'stroke-width': 3.6, transform: `rotate(${rot} ${x} ${y})` }));
    g.append(el('path', { d: path, stroke: light, 'stroke-width': 1, opacity: 0.7, transform: `rotate(${rot} ${x} ${y}) translate(-0.6 -0.8)` }));
  }
  return g;
}
function grains(cx, cy, R, color, rand) {
  const g = el('g');
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2; const d = Math.sqrt(rand()) * R;
    g.append(el('ellipse', { cx: cx + Math.cos(a) * d, cy: cy + Math.sin(a) * d, rx: 2.2, ry: 1, fill: color, transform: `rotate(${rand() * 180} ${cx + Math.cos(a) * d} ${cy + Math.sin(a) * d})` }));
  }
  return g;
}
function drizzle(cx, cy, R, color, rand) {
  let d = `M${cx - R * 0.7} ${cy - R * 0.3}`;
  for (let i = 0; i < 4; i++) d += ` q${R * 0.2} ${(rand() - 0.5) * R * 0.9} ${R * 0.35} ${(rand() - 0.2) * R * 0.25}`;
  return el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.9 });
}

/** Punkte in einem Kreis verteilen, nicht zu dicht. */
function spots(n, cx, cy, R, rand, taken) {
  const out = [];
  for (let i = 0, guard = 0; out.length < n && guard < n * 40; guard++) {
    const a = rand() * Math.PI * 2; const d = Math.sqrt(rand()) * R;
    const p = [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    if (taken.some(([x, y]) => (x - p[0]) ** 2 + (y - p[1]) ** 2 < 70)) continue;
    taken.push(p); out.push(p); i++;
  }
  return out;
}

// ---------- Zusammenbauen ----------
function toppingsFor(r) {
  return [...r.ing]
    .filter(([id]) => LOOK[id] && LOOK[id][1] !== 'skip')
    .sort((a, b) => b[1] - a[1]);
}

function drawFood(g, r, cx, cy, R, rand) {
  const list = toppingsFor(r);
  // Grundmasse: schwerste base-Zutat; Kokosmilch hellt auf
  const bases = list.filter(([id]) => LOOK[id][1] === 'base');
  let baseColor = bases[0] ? LOOK[bases[0][0]][0] : null;
  if (baseColor && bases.some(([id]) => id === 'kokosmilch') && bases[0][0] !== 'kokosmilch') baseColor = mix(baseColor, '#f4ecd9', 0.35);
  const grainIng = list.find(([id]) => LOOK[id][1] === 'grain');
  const noodleIng = list.find(([id]) => LOOK[id][1] === 'noodle');
  if (baseColor) {
    g.append(el('circle', { cx, cy, r: R, fill: baseColor }));
    g.append(el('circle', { cx: cx - R * 0.3, cy: cy - R * 0.35, r: R * 0.45, fill: 'rgba(255,255,255,.12)' }));
  }
  if (grainIng) {
    const gr = baseColor ? R * 0.45 : R * 0.85;
    const gx = baseColor ? cx + R * 0.35 : cx; const gy = baseColor ? cy + R * 0.25 : cy;
    g.append(el('circle', { cx: gx, cy: gy, r: gr, fill: LOOK[grainIng[0]][0] }));
    g.append(grains(gx, gy, gr * 0.95, mix(LOOK[grainIng[0]][0], '#ffffff', 0.45), rand));
  }
  if (noodleIng) g.append(noodles(cx, cy, R, LOOK[noodleIng[0]][0], rand));

  const taken = [];
  const top = list.filter(([id]) => !['base', 'grain', 'noodle', 'bread'].includes(LOOK[id][1])).slice(0, 6);
  top.forEach(([id, grams], idx) => {
    const [color, form] = LOOK[id];
    const few = top.length <= 2;
    const n = form === 'sprinkle' ? 0 : Math.max(2, Math.min(few ? 16 : 7, Math.round(grams / (few ? 12 : 28)) + (idx < 2 ? 2 : 0)));
    const s = 0.9 + rand() * 0.3;
    if (form === 'sprinkle') {
      for (let i = 0; i < 26; i++) { const a = rand() * Math.PI * 2; const d = Math.sqrt(rand()) * R * 0.85; g.append(sprinkle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rand() * 0.6, color)); }
      return;
    }
    if (form === 'drizzle') { g.append(drizzle(cx, cy + (idx - 2) * 4, R, color, rand)); return; }
    for (const [x, y] of spots(n, cx, cy, R * 0.78, rand, taken)) {
      const rot = rand() * 360;
      if (form === 'leaf') g.append(leaf(x, y, s * 1.1, rot, color));
      else if (form === 'chunk') g.append(chunk(x, y, s, rot, color));
      else if (form === 'round') g.append(round(x, y, s, color));
      else if (form === 'floret') g.append(floret(x, y, s, color));
      else if (form === 'slice') g.append(slice(x, y, s, rot, color, id === 'avocado' || id === 'apfel' || id === 'zitrone' || id === 'limette'));
      else if (form === 'ring') g.append(ring(x, y, s, color));
    }
  });
  // frische Kräuter obendrauf
  if (!/shake|pudding|oats|porridge|balls|quark|joghurt/.test(r.id)) {
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2; const d = rand() * R * 0.5;
      g.append(leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.45, rand() * 360, '#4f9a3a'));
    }
  }
}

function defsFor(id, hue) {
  return el('defs', null,
    el('radialGradient', { id: `${id}-tbl`, cx: '35%', cy: '30%', r: '85%' },
      el('stop', { offset: '0', 'stop-color': `hsl(${hue} 38% 82%)` }),
      el('stop', { offset: '1', 'stop-color': `hsl(${hue} 30% 62%)` })),
    el('radialGradient', { id: `${id}-plate`, cx: '40%', cy: '35%', r: '70%' },
      el('stop', { offset: '0', 'stop-color': '#ffffff' }),
      el('stop', { offset: '1', 'stop-color': '#e6e1d8' })),
    el('filter', { id: `${id}-sh`, x: '-30%', y: '-30%', width: '160%', height: '160%' },
      el('feDropShadow', { dx: '3', dy: '5', stdDeviation: '4', 'flood-color': '#000', 'flood-opacity': '.28' })),
    el('linearGradient', { id: `${id}-wood`, x1: '0', y1: '0', x2: '1', y2: '1' },
      el('stop', { offset: '0', 'stop-color': '#c89a62' }), el('stop', { offset: '1', 'stop-color': '#9c6b3c' })),
    el('linearGradient', { id: `${id}-drink`, x1: '0', y1: '0', x2: '0', y2: '1' },
      el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '.55' }), el('stop', { offset: '.25', 'stop-color': '#ffffff', 'stop-opacity': '0' })));
}

/** SVG-Bild eines Rezepts (viewBox 200×125, skaliert frei). */
export function recipeSvg(r) {
  const id = `rb${++uid}`;
  const rand = rng(r.id || r.name || 'x');
  const hue = r.hue ?? 30;
  const vessel = vesselOf(r);
  const svg = el('svg', { viewBox: '0 0 200 125', preserveAspectRatio: 'xMidYMid slice', class: 'rsvg', 'aria-hidden': 'true' }, defsFor(id, hue));
  // Tisch, Leinentuch, Besteck
  svg.append(el('rect', { width: 200, height: 125, fill: `url(#${id}-tbl)` }));
  svg.append(el('rect', { x: 128, y: -10, width: 90, height: 70, rx: 4, fill: `hsl(${(hue + 180) % 360} 25% 92%)`, opacity: 0.85, transform: 'rotate(12 160 20)' }));
  svg.append(el('g', { stroke: 'rgba(60,50,40,.55)', 'stroke-width': 3, 'stroke-linecap': 'round' },
    el('path', { d: 'M168 72 L190 112' }), el('path', { d: 'M162 75 L183 116', 'stroke-width': 2 })));

  if (vessel === 'glass') {
    const drink = toppingsFor(r).find(([i]) => ['kakao', 'beeren', 'mango', 'banane'].includes(i));
    const color = drink ? (drink[0] === 'banane' ? '#f0d98a' : LOOK[drink[0]][0]) : '#e9d7b8';
    const g = el('g', { filter: `url(#${id}-sh)` });
    g.append(el('path', { d: 'M72 18 L128 18 L120 112 L80 112 Z', fill: 'rgba(255,255,255,.35)', stroke: 'rgba(255,255,255,.8)', 'stroke-width': 1.5 }));
    g.append(el('path', { d: 'M74 34 L126 34 L120 110 L80 110 Z', fill: mix(color, '#ffffff', 0.15) }));
    g.append(el('path', { d: 'M74 34 L126 34 L125 44 L75 44 Z', fill: mix(color, '#ffffff', 0.55) }));
    g.append(el('path', { d: 'M74 34 L126 34 L120 110 L80 110 Z', fill: `url(#${id}-drink)` }));
    g.append(el('path', { d: 'M110 4 L100 70', stroke: '#e35d5b', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    if (r.ing.some(([i]) => i === 'banane')) g.append(slice(128, 22, 1.2, 0, '#f4dc7a', false));
    svg.append(g);
    return svg;
  }

  if (vessel === 'board') {
    const g = el('g', { filter: `url(#${id}-sh)` });
    g.append(el('rect', { x: 18, y: 14, width: 140, height: 98, rx: 12, fill: `url(#${id}-wood)` }));
    g.append(el('rect', { x: 150, y: 52, width: 22, height: 14, rx: 7, fill: '#9c6b3c' }));
    for (let i = 0; i < 5; i++) g.append(el('path', { d: `M24 ${28 + i * 18} q60 ${rand() * 6 - 3} 128 0`, stroke: 'rgba(0,0,0,.08)', 'stroke-width': 1, fill: 'none' }));
    svg.append(g);
    const bread = r.ing.find(([i]) => i === 'vollkornbrot' || i === 'tortilla');
    const food = el('g');
    if (bread) {
      const isWrap = bread[0] === 'tortilla';
      const shapes = isWrap ? [[66, 62, -18], [108, 64, 14]] : [[62, 62, -8], [110, 62, 9]];
      for (const [x, y, rot] of shapes) {
        const piece = el('g', { transform: `rotate(${rot} ${x} ${y})` });
        if (isWrap) {
          piece.append(el('rect', { x: x - 20, y: y - 30, width: 40, height: 60, rx: 18, fill: '#ecd29a', stroke: '#c9a565', 'stroke-width': 1.5 }));
          piece.append(el('ellipse', { cx: x, cy: y - 22, rx: 16, ry: 8, fill: '#dfe9c0' }));
          drawFood(piece, { ...r, ing: r.ing.filter(([i]) => i !== 'tortilla') }, x, y - 22, 13, rand);
        } else {
          piece.append(el('path', { d: `M${x - 22} ${y + 26} L${x - 22} ${y - 14} Q${x - 22} ${y - 30} ${x} ${y - 30} Q${x + 22} ${y - 30} ${x + 22} ${y - 14} L${x + 22} ${y + 26} Z`, fill: '#8a5a2c' }));
          piece.append(el('path', { d: `M${x - 18} ${y + 22} L${x - 18} ${y - 12} Q${x - 18} ${y - 26} ${x} ${y - 26} Q${x + 18} ${y - 26} ${x + 18} ${y - 12} L${x + 18} ${y + 22} Z`, fill: '#c89660' }));
          drawFood(piece, { ...r, ing: r.ing.filter(([i]) => i !== 'vollkornbrot') }, x, y, 16, rand);
        }
        food.append(piece);
      }
    } else {
      // Snackbrett: Dip-Schälchen (falls vorhanden) + Stücke
      const dip = toppingsFor(r).find(([i]) => ['hummus', 'erdnussbutter', 'tahini'].includes(i));
      if (dip) {
        food.append(el('circle', { cx: 58, cy: 62, r: 26, fill: `url(#${id}-plate)`, filter: `url(#${id}-sh)` }));
        food.append(el('circle', { cx: 58, cy: 62, r: 19, fill: LOOK[dip[0]][0] }));
        food.append(el('path', { d: 'M46 58 q12 -8 24 2', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 2, fill: 'none' }));
        drawFood(food, { ...r, ing: r.ing.filter(([i]) => i !== dip[0]) }, 112, 62, 30, rand);
      } else {
        drawFood(food, r, 88, 63, 44, rand);
      }
    }
    svg.append(food);
    return svg;
  }

  // Schüssel oder Teller
  const cx = 88; const cy = 64;
  const bowl = vessel === 'bowl';
  const R = bowl ? 50 : 55;
  const plate = el('g', { filter: `url(#${id}-sh)` });
  plate.append(el('circle', { cx, cy, r: R + (bowl ? 6 : 4), fill: `url(#${id}-plate)` }));
  if (bowl) plate.append(el('circle', { cx, cy, r: R, fill: '#d9d2c6' }));
  else plate.append(el('circle', { cx, cy, r: R - 10, fill: 'none', stroke: 'rgba(0,0,0,.06)', 'stroke-width': 1.2 }));
  svg.append(plate);
  const food = el('g');
  const foodR = bowl ? R - 4 : R - 18;
  if (!bowl) {
    // Teller: Essen als lockerer Haufen
    const clip = el('clipPath', { id: `${id}-clip` }, el('path', { d: blob(cx, cy, foodR, rand) }));
    svg.querySelector('defs').append(clip);
    const inner = el('g', { 'clip-path': `url(#${id}-clip)` });
    inner.append(el('path', { d: blob(cx, cy, foodR, rand), fill: '#f2e7d0' }));
    drawFood(inner, r, cx, cy, foodR, rand);
    food.append(inner);
  } else {
    const clip = el('clipPath', { id: `${id}-clip` }, el('circle', { cx, cy, r: foodR }));
    svg.querySelector('defs').append(clip);
    const inner = el('g', { 'clip-path': `url(#${id}-clip)` });
    inner.append(el('circle', { cx, cy, r: foodR, fill: '#efe3c8' }));
    drawFood(inner, r, cx, cy, foodR, rand);
    food.append(inner);
    food.append(el('circle', { cx, cy, r: foodR, fill: 'none', stroke: 'rgba(0,0,0,.12)', 'stroke-width': 2 }));
  }
  svg.append(food);
  // Glanz auf dem Essen
  svg.append(el('ellipse', { cx: cx - foodR * 0.35, cy: cy - foodR * 0.4, rx: foodR * 0.38, ry: foodR * 0.16, fill: 'rgba(255,255,255,.18)', transform: `rotate(-25 ${cx} ${cy})` }));
  // Dampf über warmen Gerichten
  const hot = !(r.allTags || []).some((t) => ['kalt', 'ohnekochen'].includes(t));
  if (hot) {
    const steam = el('g', { class: 'rsvg-steam', fill: 'none', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 3, 'stroke-linecap': 'round' });
    [-14, 0, 14].forEach((dx, i) => steam.append(el('path', {
      d: `M${cx + dx} ${cy - 6} q-6 -9 0 -18 q6 -9 0 -18`, style: `animation-delay:${i * 0.6}s`,
    })));
    svg.append(steam);
  }
  return svg;
}

/** Unregelmäßiger, weicher Umriss für Essen auf dem Teller. */
function blob(cx, cy, R, rand) {
  const n = 9; const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2; const rr = R * (0.82 + rand() * 0.22);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
  }
  let d = `M${(pts[0][0] + pts[n - 1][0]) / 2} ${(pts[0][1] + pts[n - 1][1]) / 2}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i]; const q = pts[(i + 1) % n];
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return d + 'Z';
}

export const hasIngredientLook = (r) => !!r?.ing?.some(([i]) => LOOK[i] && INGREDIENTS[i]);
