// Minimaler Event-Bus, damit Module lose gekoppelt bleiben.
// Bekannte Events: 'data:changed' ({store, type, date}), 'settings:changed' (settings)

const listeners = new Map();

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt)?.delete(fn);
}

export function emit(evt, payload) {
  listeners.get(evt)?.forEach((fn) => {
    try { fn(payload); } catch (err) { console.error(err); }
  });
}
