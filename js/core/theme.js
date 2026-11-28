// Design: Farbschemata (Vorschläge), eigene Akzentfarbe, Form und Schrift.
// Alles läuft über CSS-Variablen auf <html>; Hell/Dunkel bleibt eigene Einstellung (prefs.theme).
// prefs.design = {preset, accent?, shape, font}

export const PRESETS = {
  mint: { label: 'Mint', accent: '#3ddc97', hue: 222, sat: 16, note: 'Frisch & klar (Standard)' },
  kino: { label: 'Kino', accent: '#ff4d5e', hue: 350, sat: 22, note: 'Roter Teppich, dunkler Saal' },
  popcorn: { label: 'Popcorn', accent: '#ffc53d', hue: 40, sat: 20, note: 'Warm, gelb, gemütlich' },
  ozean: { label: 'Ozean', accent: '#3fa7ff', hue: 215, sat: 34, note: 'Tiefblau & ruhig' },
  lavendel: { label: 'Lavendel', accent: '#b48cff', hue: 262, sat: 24, note: 'Sanft & verträumt' },
  neon: { label: 'Neon', accent: '#00e5ff', hue: 250, sat: 30, note: 'Cyberpunk-Nächte' },
  retro: { label: 'Retro', accent: '#ff8a5b', hue: 24, sat: 22, note: '70er-Jahre-Wohnzimmer' },
  wald: { label: 'Wald', accent: '#7bc96f', hue: 130, sat: 16, note: 'Natur & Ruhe' },
  kuechen: { label: 'Tomate', accent: '#ff6b3d', hue: 12, sat: 14, note: 'Passt zum Kochen' },
};

export const SHAPES = {
  rund: { label: 'Rund', scale: 1 },
  weich: { label: 'Extra weich', scale: 1.45 },
  kantig: { label: 'Kantig', scale: 0.4 },
};

export const FONTS = {
  modern: { label: 'Modern', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
  klassisch: { label: 'Klassisch', stack: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif' },
  schreibmaschine: { label: 'Schreibmaschine', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace' },
  rund: { label: 'Verspielt', stack: '"Trebuchet MS", "Segoe UI Rounded", "SF Pro Rounded", "Comic Neue", system-ui, sans-serif' },
};

export const DEFAULT_DESIGN = { preset: 'mint', accent: null, shape: 'rund', font: 'modern' };

// ---------- Farbrechnung ----------
function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex || '').trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l * 10) / 10}%)`;
function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** CSS-Variablen für ein Design im hellen oder dunklen Modus. */
export function designVars(design = DEFAULT_DESIGN, mode = 'dark') {
  const d = { ...DEFAULT_DESIGN, ...(design || {}) };
  const p = PRESETS[d.preset] || PRESETS.mint;
  const accentHex = hexToRgb(d.accent) ? d.accent : p.accent;
  const rgb = hexToRgb(accentHex);
  const [ah, as, al] = rgbToHsl(rgb);
  // Hintergrund leicht in Richtung der Akzentfarbe tönen (bei eigener Farbe deren Farbton)
  const hue = d.accent ? ah : p.hue;
  const sat = d.accent ? Math.min(28, as * 0.25) : p.sat;
  const v = {};
  if (mode === 'light') {
    const accent = hsl(ah, Math.min(as, 85), Math.min(al, 42));
    Object.assign(v, {
      '--bg': hsl(hue, sat * 1.1, 95.5), '--surface': '#ffffff', '--surface-2': hsl(hue, sat * 1.1, 93.5),
      '--surface-3': hsl(hue, sat, 87), '--border': hsl(hue, sat, 89), '--text': hsl(hue, 20, 10),
      '--muted': hsl(hue, 9, 38), '--faint': hsl(hue, 8, 62),
      '--accent': accent, '--accent-ink': '#ffffff', '--accent-soft': `hsl(${Math.round(ah)} ${Math.round(as)}% ${Math.round(Math.min(al, 42))}% / .12)`,
    });
  } else {
    Object.assign(v, {
      '--bg': hsl(hue, sat, 6.5), '--surface': hsl(hue, sat * 0.9, 10.5), '--surface-2': hsl(hue, sat * 0.85, 14),
      '--surface-3': hsl(hue, sat * 0.8, 19.5), '--border': hsl(hue, sat * 0.8, 16), '--text': hsl(hue, 20, 94.5),
      '--muted': hsl(hue, 10, 65), '--faint': hsl(hue, 8, 43),
      '--accent': accentHex, '--accent-ink': luminance(rgb) > 0.35 ? hsl(ah, 60, 10) : '#ffffff',
      '--accent-soft': `rgb(${rgb.join(' ')} / .14)`,
    });
  }
  v['--rs'] = String((SHAPES[d.shape] || SHAPES.rund).scale);
  v['--font'] = (FONTS[d.font] || FONTS.modern).stack;
  return v;
}

export function applyDesign(design, mode) {
  const vars = designVars(design, mode);
  const root = document.documentElement;
  for (const [k, val] of Object.entries(vars)) root.style.setProperty(k, val);
  return vars;
}
