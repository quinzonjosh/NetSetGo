// The Queue tab: lists queued matches. Picking a court moves the match onto it.
import { state, commit, onChange } from '../../core/store.js';
import { $, flash } from '../../lib/dom.js';
import { cloneCardWithTeams, fillTeams } from '../../ui/team-list.js';

export function initQueue() {
  const list = $('match-list');
  const emptyEl = $('queue-empty');
  const countEl = $('match-count');
  const noticeEl = $('queue-notice');

  function hasPlayerAlreadyInGame(match) {
    const playingIds = new Set();

    state.courts.forEach(court => {
      if (!court.match) return;

      [...court.match.a, ...court.match.b].forEach(id => {
        playingIds.add(id);
      });
    });

    return [...match.a, ...match.b].some(id => playingIds.has(id));
  }

  function buildMatch(match, index) {
    const li = cloneCardWithTeams('match-template');
    li.dataset.id = match.id;
    li.querySelector('.match-title').textContent = `Match ${match.no ?? index + 1}`;
    fillTeams(li, match, { showWait: true });

    const buttons = li.querySelector('.court-buttons');

    if (!state.courts.length) {
      buttons.textContent = 'No courts yet. Add one on the Courts tab.';
    }

    const conflict = hasPlayerAlreadyInGame(match);

    state.courts.forEach(court => {
      const inUse = !!court.match;
      const btn = document.createElement('button');

      btn.type = 'button';
      btn.className = 'btn court-btn';
      btn.dataset.action = 'court';
      btn.dataset.court = court.number;

      btn.disabled = inUse || conflict;

      if (inUse) {
        btn.textContent = `Court ${court.number} (in use)`;
      } else if (conflict) {
        btn.textContent = `Court ${court.number} (player in game)`;
        btn.title = 'One or more players in this match are already playing.';
      } else {
        btn.textContent = `Court ${court.number}`;
      }

      buttons.append(btn);
    });

    return li;
  }

  function render() {
    const { matches } = state.session;
    list.replaceChildren(...matches.map(buildMatch));
    emptyEl.hidden = matches.length > 0;
    countEl.textContent = matches.length;
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    const card = btn?.closest('.match');
    if (!card || btn.disabled) return;

    const { matches } = state.session;
    const index = matches.findIndex(m => m.id === card.dataset.id);
    if (index < 0) return;

    if (btn.dataset.action === 'remove') {
      const [removed] = matches.splice(index, 1);
      commit();
      flash(noticeEl, `Match ${removed.no ?? index + 1} removed from the queue.`);
      return;
    }

    if (btn.dataset.action === 'court') {
      const court = state.courts.find(c => c.number === Number(btn.dataset.court));
      if (!court || court.match) return;

      const [match] = matches.splice(index, 1);
      court.match = { id: match.id, no: match.no ?? index + 1, a: match.a, b: match.b, startedAt: Date.now() };
      commit();
      flash(noticeEl, `Match ${court.match.no} assigned to Court ${court.number}. Manage it on the Courts tab.`);
    }

    if (hasPlayerAlreadyInGame(matches[index])) {
      flash(noticeEl, 'Cannot assign match: one or more players are already playing.');
      return;
    }
  });

  onChange(render);
  render();
}
