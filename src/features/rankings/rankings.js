// Rankings: session leaderboard, ranked by wins (then win %, then draws).
import { state, onChange } from '../../core/store.js';
import { $ } from '../../lib/dom.js';

export function initLeaderboard() {
  const body = $('leaderboard-body');
  const wrap = $('leaderboard-wrap');
  const emptyEl = $('leaderboard-empty');
  const countEl = $('leaderboard-count');

  function rankedRows() {
    const rows = state.players.map(p => {
      const games = p.games ?? 0;
      const wins = p.wins ?? 0;
      return { name: p.name, games, wins, draws: p.draws ?? 0, losses: p.losses ?? 0, pct: games ? wins / games : 0 };
    });

    // players who have played first, then by wins, win %, draws, name
    rows.sort((a, b) =>
      (b.games > 0) - (a.games > 0) ||
      b.wins - a.wins ||
      b.pct - a.pct ||
      b.draws - a.draws ||
      a.name.localeCompare(b.name));

    // identical records share a rank (1, 2, 2, 4); players with no games are unranked
    rows.forEach((r, i) => {
      const prev = rows[i - 1];
      const tied = prev && prev.games && prev.wins === r.wins && prev.pct === r.pct && prev.draws === r.draws;
      r.rank = !r.games ? null : tied ? prev.rank : i + 1;
    });
    return rows;
  }

  function buildRow(r) {
    const cells = [r.rank ?? '–', r.name, r.wins, r.draws, r.losses, r.games, r.games ? `${Math.round(r.pct * 100)}%` : '–'];
    const tr = document.createElement('tr');
    cells.forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value; // textContent: safe for player names
      if (i !== 1) td.className = 'num';
      tr.append(td);
    });
    return tr;
  }

  function render() {
    const rows = rankedRows();
    body.replaceChildren(...rows.map(buildRow));
    emptyEl.hidden = rows.length > 0;
    wrap.hidden = rows.length === 0;
    countEl.textContent = rows.length;
  }

  onChange(render);
  render();
}
