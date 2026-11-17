// Hash-Router: #/pfad?param=wert  (funktioniert ohne Server-Konfiguration, auch auf GitHub Pages)

let handler = null;

export function parseHash() {
  const raw = decodeURI(location.hash.replace(/^#/, '')) || '/heute';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/heute', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function buildHash(path, query = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) if (v != null && v !== '') q.set(k, v);
  const qs = q.toString();
  return '#' + path + (qs ? '?' + qs : '');
}

/** replace:true ändert die URL ohne neuen Verlaufseintrag (z. B. beim Blättern durch Tage). */
export function navigate(path, query, { replace = false } = {}) {
  const hash = buildHash(path, query);
  if (replace) {
    history.replaceState(null, '', hash);
    handler?.(parseHash());
  } else if (location.hash === hash) {
    handler?.(parseHash());
  } else {
    location.hash = hash;
  }
}

export function startRouter(onRoute) {
  handler = onRoute;
  window.addEventListener('hashchange', () => onRoute(parseHash()));
  onRoute(parseHash());
}
