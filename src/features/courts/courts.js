// The Courts tab: status, live match details, and complete / cancel / add.
import { state, commit, onChange } from '../../core/store.js';
import { playerById, namesOf, nameList } from '../../core/selectors.js';
import { $, flash } from '../../lib/dom.js';
import { newId } from '../../lib/id.js';
import { formatClock } from '../../lib/format.js';
import { ask, confirmAction } from '../../ui/modal.js';
import { cloneCardWithTeams, fillTeams } from '../../ui/team-list.js';
import { tick } from '../../ui/ticker.js';

export function initCourts() {
  const list = $('court-list');
  const addBtn = $('court-add');
  const emptyEl = $('court-empty');
  const toast = $('court-toast');

  function buildCourt(court) {
    const li = cloneCardWithTeams('court-template');
    const m = court.match;
    li.dataset.number = court.number;
    li.querySelector('.court-title').textContent = `Court ${court.number}`;

    const status = li.querySelector('.court-status');
    status.textContent = m ? 'Occupied' : 'Available';
    status.classList.add(m ? 'occupied' : 'available');

    li.querySelector('.court-empty').hidden = !!m;
    li.querySelector('.court-details').hidden = !m;
    li.querySelector('.court-foot').hidden = !m;

    if (m) {
      li.querySelector('.started').textContent = formatClock(m.startedAt);
      li.querySelector('.elapsed').dataset.started = m.startedAt;
      fillTeams(li, m);
    }
    return li;
  }

  function render() {
    list.replaceChildren(...state.courts.map(buildCourt));
    emptyEl.hidden = state.courts.length > 0;
    tick();
  }

  // Step 1: ask who won
  async function completeMatch(court) {
    const m = court.match;
    const result = await ask({
      title: `Complete match on Court ${court.number}`,
      text: 'Who won?',
      cancelLabel: 'Back',
      choices: [
        { label: 'Team A won', sub: namesOf(m.a), value: 'a', kind: 'team' },
        { label: 'Team B won', sub: namesOf(m.b), value: 'b', kind: 'team' },
        { label: 'Draw', value: 'draw' },
      ],
    });
    if (!result || court.match?.id !== m.id) return; // backed out, or the match changed meanwhile
    recordResult(court, result);
  }

  // Step 2: update stats, write history, free the court
  function recordResult(court, result) {
    const m = court.match;
    const now = Date.now();
    const winners = result === 'a' ? m.a : result === 'b' ? m.b : [];

    [...m.a, ...m.b].forEach(id => {
      const p = playerById(id);
      if (!p) return;
      p.games = (p.games ?? 0) + 1;
      p.waitingSince = now; // wait time restarts after the game
      if (result === 'draw') p.draws = (p.draws ?? 0) + 1;
      else if (winners.includes(id)) p.wins = (p.wins ?? 0) + 1;
      else p.losses = (p.losses ?? 0) + 1;
    });

    const summary = result === 'draw'
      ? `It's a draw: ${namesOf(m.a)} vs ${namesOf(m.b)}`
      : `Team ${result.toUpperCase()} won: ${namesOf(winners)}`;

    state.history.push({
      id: newId(),
      no: m.no,
      court: court.number,
      startedAt: m.startedAt,
      endedAt: now,
      a: nameList(m.a),
      b: nameList(m.b),
      result,
    });

    court.match = null;
    commit();

    ask({
      icon: '✅',
      title: 'Match complete',
      text: summary,
      note: `Match ${m.no} on Court ${court.number} complete!`,
      cancelLabel: null,
      choices: [{ label: 'OK', value: true, kind: 'primary' }],
    });
    flash(toast, `✅ Match ${m.no} on Court ${court.number} is complete. ${summary}`);
  }

  addBtn.addEventListener('click', () => {
    const next = Math.max(0, ...state.courts.map(c => c.number)) + 1;
    state.courts.push({ number: next, match: null });
    commit();
  });

  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const court = state.courts.find(c => c.number === Number(btn.closest('.court').dataset.number));
    if (!court?.match) return;

    if (btn.dataset.action === 'complete') {
      completeMatch(court); // the match is only cleared once a result is picked
    } else if (btn.dataset.action === 'cancel') {
      const matchId = court.match.id;
      const ok = await confirmAction({
        title: `Cancel the match on Court ${court.number}?`,
        text: 'No games are counted and the players become available again.',
        confirmLabel: 'Cancel match',
        cancelLabel: 'Keep match',
      });
      if (!ok || court.match?.id !== matchId) return;
      court.match = null;
      commit();
    }
  });

  onChange(render);
  render();
}
