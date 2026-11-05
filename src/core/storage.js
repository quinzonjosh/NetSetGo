// localStorage only. One versioned key, debounced writes, and a one-time
// migration from the old five-key format.
import { STORAGE_KEY, LEGACY_KEYS, DEFAULT_COURTS, SAVE_DELAY_MS } from './constants.js';

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function readSaved() {
  const current = readJSON(STORAGE_KEY, null);
  if (current) return current;
  const k = LEGACY_KEYS;
  return {
    players: readJSON(k.players, []),
    session: readJSON(k.session, null),
    courts: readJSON(k.courts, null),
    history: readJSON(k.history, []),
    fees: readJSON(k.fees, null),
  };
}

/** Fills `state` from storage, dropping anything that points at missing players. */
export function loadState(state) {
  const saved = readSaved();
  const players = Array.isArray(saved.players) ? saved.players : [];
  const ids = new Set(players.map(p => p.id));
  const valid = m => m && Array.isArray(m.a) && Array.isArray(m.b) && [...m.a, ...m.b].every(id => ids.has(id));

  const s = saved.session;
  const matches = Array.isArray(s?.matches) ? s.matches.filter(valid) : [];
  const session = { started: !!s?.started, matches, counter: s?.counter ?? matches.length };

  const now = Date.now();
  players.forEach(p => {
    p.discount = Math.max(0, Number(p.discount) || 0);
    p.waitingSince ??= session.started ? now : null;
  });

  state.players = players;
  state.session = session;
  state.courts = Array.isArray(saved.courts)
    ? saved.courts.map(c => ({ number: c.number, match: valid(c.match) ? c.match : null }))
    : Array.from({ length: DEFAULT_COURTS }, (_, i) => ({ number: i + 1, match: null }));
  state.history = Array.isArray(saved.history) ? saved.history : [];
  state.fees = {
    perPlayer: Math.max(0, Number(saved.fees?.perPlayer) || 0),
    expenses: Math.max(0, Number(saved.fees?.expenses) || 0),
  };
}

let pending = null;
let timer = null;

function write() {
  clearTimeout(timer);
  if (!pending) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    Object.values(LEGACY_KEYS).forEach(k => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
  pending = null;
}

export function scheduleSave(state) {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(write, SAVE_DELAY_MS);
}

// Don't lose the last keystrokes when the tab closes or goes to the background.
window.addEventListener('pagehide', write);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') write();
});
