// Read-only questions about the state. Shared by several features.
import { state } from './store.js';

export const playerById = id => state.players.find(p => p.id === id);
export const nameList = ids => ids.map(id => playerById(id)?.name).filter(Boolean);
export const namesOf = ids => nameList(ids).join(' + ');

/** player id -> null (waiting in the queue) or the court number they're playing on */
export function busyMap() {
  const map = new Map();
  state.session.matches.forEach(m => [...m.a, ...m.b].forEach(id => map.set(id, null)));
  state.courts.forEach(c => {
    if (c.match) [...c.match.a, ...c.match.b].forEach(id => map.set(id, c.number));
  });
  return map;
}

/** 'available' | 'in-queue' | 'in-game' */
export const statusOf = (id, busy) => (!busy.has(id) ? 'available' : busy.get(id) ? 'in-game' : 'in-queue');

export function availablePlayers() {
  const busy = busyMap();
  return state.players.filter(p => !busy.has(p.id));
}

/** What a player owes (or paid): paid players keep what they paid, others get base fee minus discount. */
export const feeFor = p =>
  p.payment ? p.payment.amount : Math.max(0, state.fees.perPlayer - (p.discount ?? 0));
