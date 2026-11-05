// The single source of truth, plus the actions that change it.
//
// players: [{ id, name, level, games, wins, losses, draws, discount, payment, addedAt, waitingSince }]
//   payment: null | { method: 'cash' | 'digital', amount, paidAt }
// session:  { started, counter, matches: [{ id, no, a: [id, id], b: [id, id], createdAt }] }
// courts:   [{ number, match: null | { id, no, a, b, startedAt } }]
// history:  [{ id, no, court, startedAt, endedAt, a: [names], b: [names], result: 'a' | 'b' | 'draw' }]
// fees:     { perPlayer, expenses }
import { newId } from '../lib/id.js';
import { loadState, scheduleSave } from './storage.js';

export const state = {
  players: [],
  session: { started: false, matches: [], counter: 0 },
  courts: [],
  history: [],
  fees: { perPlayer: 0, expenses: 0 },
};

const listeners = [];

export const onChange = fn => listeners.push(fn);

export function initStore() {
  loadState(state);
}

/** Save, then refresh every screen. One broken screen can't block the others. */
export function commit() {
  scheduleSave(state);
  listeners.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  });
}

// ---- actions (they change state; callers decide when to commit) ----

export function makePlayer(name, level) {
  return {
    id: newId(),
    name,
    level,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    discount: 0,
    payment: null,
    addedAt: Date.now(),
    waitingSince: state.session.started ? Date.now() : null,
  };
}

export function startSession() {
  const now = Date.now();
  state.session.started = true;
  state.players.forEach(p => {
    p.waitingSince = now;
  });
}

export function enqueueMatch(a, b) {
  const match = { id: newId(), no: ++state.session.counter, a, b, createdAt: Date.now() };
  state.session.matches.push(match);
  return match;
}

export function endSession() {
  state.players.forEach(p => {
    Object.assign(p, { games: 0, wins: 0, losses: 0, draws: 0, discount: 0, payment: null, waitingSince: null });
  });
  state.courts.forEach(c => {
    c.match = null;
  });
  state.session = { started: false, matches: [], counter: 0 };
  state.history = [];
  state.fees.expenses = 0;
}
