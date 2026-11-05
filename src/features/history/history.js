// Match history: finished matches, newest first, with the winner marked 🏆
import { state, onChange } from '../../core/store.js';
import { $, buildNameLi } from '../../lib/dom.js';
import { formatClock } from '../../lib/format.js';
import { cloneCardWithTeams } from '../../ui/team-list.js';

export function initHistory() {
  const list = $('history-list');
  const emptyEl = $('history-empty');
  const countEl = $('history-count');

  function fillTeam(li, selector, label, names, won) {
    const team = li.querySelector(selector);
    team.classList.toggle('winner', won);
    team.title = won ? 'Winner' : '';
    team.querySelector('.team-label').textContent = won ? `🏆 ${label}` : label;
    team.querySelector('.team-players').replaceChildren(...names.map(buildNameLi));
  }

  function buildItem(h) {
    const li = cloneCardWithTeams('history-template');
    li.querySelector('.history-title').textContent = `Match ${h.no}`;
    li.querySelector('.history-time').textContent = `Started ${formatClock(h.startedAt)}`;
    fillTeam(li, '.team-a', 'Team A', h.a, h.result === 'a');
    fillTeam(li, '.team-b', 'Team B', h.b, h.result === 'b');
    li.querySelector('.history-draw').hidden = h.result !== 'draw';
    return li;
  }

  function render() {
    list.replaceChildren(...[...state.history].reverse().map(buildItem));
    emptyEl.hidden = state.history.length > 0;
    countEl.textContent = state.history.length;
  }

  onChange(render);
  render();
}
