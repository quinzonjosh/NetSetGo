// The Players tab: list, search + filters, session start/end, and picking 4 players.
// After "Start queueing" the list is locked and cards become selectable:
// first 2 picks = Team A, next 2 = Team B.
import { state, commit, onChange, startSession, endSession, enqueueMatch } from '../../core/store.js';
import { playerById, namesOf, busyMap, statusOf, availablePlayers } from '../../core/selectors.js';
import { $, cloneTemplate, flash } from '../../lib/dom.js';
import { confirmAction } from '../../ui/modal.js';
import { setLevelBadge, setGenderChip } from '../../ui/team-list.js';
import { setWaitText } from '../../ui/ticker.js';
import { initPlayerForm } from './player-form.js';
import { suggestMatchup, openMatchEditor } from './auto-match.js';

export function initPlayers() {
  const list = $('player-list');
  const emptyEl = $('player-empty');
  const countEl = $('player-count');
  const clearBtn = $('player-clear');
  const endBtn = $('session-end');
  const startBtn = $('start-queue');
  const hintEl = $('select-hint');
  const toolbar = $('player-toolbar');
  const searchInput = $('player-search');
  const levelFilter = $('filter-level');
  const statusFilter = $('filter-status');
  const noResults = $('no-results');
  const filterReset = $('filter-reset');
  const autoBtn = $('auto-match-btn');
  const addPanel = $('add-players');
  const sortSelect = $('sort-players');
  const genderFilter = $('filter-gender');
  

  let selected = []; // player ids in the order they were tapped
  let notice = null; // { text, count }: message shown in place of the hint
  let collapsedOnce = false;
  const filters = { query: '', level: 'all', gender: 'all', status: 'all', sort: 'default' };

  const form = initPlayerForm({ onAdded: resetFilters, onEditingChange: render });

  function resetFilters() {
    Object.assign(filters, { query: '', level: 'all', gender: 'all', status: 'all' });
    searchInput.value = '';
    levelFilter.value = 'all';
    statusFilter.value = 'all';
  }

  function selectionHint() {
    if (notice && notice.count === state.session.matches.length) return notice.text;
    if (!selected.length) return 'Pick 4 players: the first 2 you tap are Team A, the next 2 are their opponents (Team B).';
    const parts = [`Team A: ${namesOf(selected.slice(0, 2))}`];
    if (selected.length > 2) parts.push(`Team B: ${namesOf(selected.slice(2))}`);
    return `${selected.length}/4 selected. ${parts.join('  vs  ')}`;
  }

  function buildItem(player, busy) {
    const li = cloneTemplate('player-item-template');
    const nameEl = li.querySelector('.player-name');
    li.dataset.id = player.id;
    li.classList.toggle('editing', player.id === form.editingId);
    nameEl.textContent = player.name;
    nameEl.title = player.name;
    li.querySelector('.games').textContent = `Games: ${player.games ?? 0}`;
    setLevelBadge(li.querySelector('.badge'), player.level);
    setGenderChip(li.querySelector('.gender'), player.gender);

    // Wait chip: only while the session is running, and hidden while on a court
    const waitEl = li.querySelector('.wait');
    const onCourt = !!busy.get(player.id);
    const showWait = state.session.started && !onCourt && player.waitingSince != null;
    waitEl.hidden = !showWait;
    if (showWait) {
      const time = waitEl.querySelector('.wait-time');
      time.dataset.since = player.waitingSince;
      setWaitText(time);
    }

    li.querySelector('[data-action="edit"]').setAttribute('aria-label', `Edit ${player.name}`);
    li.querySelector('[data-action="delete"]').setAttribute('aria-label', `Delete ${player.name}`);

    if (!state.session.started) return li;

    const isBusy = busy.has(player.id);
    const i = selected.indexOf(player.id);

    // Keep the existing status indicator
    if (isBusy) {
      const court = busy.get(player.id);
      const status = li.querySelector('.player-status');

      li.classList.add('busy');
      status.textContent = court ? `In game · Court ${court}` : 'In queue';
      status.classList.add(court ? 'in-game' : 'in-queue');
      status.hidden = false;
    }

    // Allow selection regardless of status
    li.classList.add('selectable');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-pressed', String(i >= 0));

    if (i >= 0) {
      const team = i < 2 ? 'a' : 'b';
      const slot = li.querySelector('.slot');

      li.classList.add(`sel-${team}`);
      slot.textContent = `Team ${team.toUpperCase()}`;
      slot.hidden = false;
    }

    return li;
  }

  function visiblePlayers(busy) {
    const query = filters.query.trim().toLowerCase();

    const visible = state.players.filter(p =>
      (!query || p.name.toLowerCase().includes(query)) &&
      (filters.level === 'all' || p.level === filters.level) &&
      (filters.gender === 'all' || (p.gender ?? 'unset') === filters.gender) &&
      (filters.status === 'all' || statusOf(p.id, busy) === filters.status));

    // players with a running wait clock first (oldest start = longest wait), then players in a game
    const waitKey = p => (!busy.get(p.id) && p.waitingSince != null ? p.waitingSince : Infinity);
    const cmp = (x, y) => (x === y ? 0 : x < y ? -1 : 1);

    const sorters = {
      'games-asc': (a, b) => (a.games ?? 0) - (b.games ?? 0),
      'games-desc': (a, b) => (b.games ?? 0) - (a.games ?? 0),
      'wait-desc': (a, b) => cmp(waitKey(a), waitKey(b)),
    };
    if (sorters[filters.sort]) visible.sort(sorters[filters.sort]); // ties keep added order

    const filtering = !!query || filters.level !== 'all' || filters.gender !== 'all' || filters.status !== 'all';
    return { visible, filtering };
  }

  function render() {
    const { started } = state.session;
    const busy = busyMap();
    const total = state.players.length;

    selected = selected.filter(id => playerById(id));

    // statuses only mean something once the session has started; no players = no filters
    if (!total) resetFilters();
    if (!started) filters.status = 'all';
    statusFilter.hidden = !started;
    statusFilter.value = filters.status;

    const { visible, filtering } = visiblePlayers(busy);

    list.replaceChildren(...visible.map(p => buildItem(p, busy)));
    emptyEl.hidden = total > 0;
    toolbar.hidden = total === 0;
    noResults.hidden = !(filtering && total > 0 && visible.length === 0);
    countEl.textContent = filtering ? `${visible.length} of ${total}` : total;
    clearBtn.hidden = started || total === 0;
    endBtn.hidden = !started;

    startBtn.textContent = started ? 'Add players to queue' : 'Start queueing';
    startBtn.disabled = started ? selected.length !== 4 : total === 0;
    hintEl.hidden = !started;
    if (started) hintEl.textContent = selectionHint();

    autoBtn.hidden = !started;
    autoBtn.disabled = state.players.filter(p => !busy.has(p.id)).length < 4;

    // collapse the "Add players" panel once when the session starts
    if (started && !collapsedOnce) {
      addPanel.open = false;
      collapsedOnce = true;
    }
    if (!started) collapsedOnce = false;
  }

  function toggleSelect(id) {
    notice = null;
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1);
    else if (selected.length < 4) selected.push(id);
    else {
      notice = {
        text: 'You already picked 4. Tap a selected player to deselect them first.',
        count: state.session.matches.length,
      };
    }
    render();
    list.querySelector(`[data-id="${id}"]`)?.focus({ preventScroll: true });
  }

  // ---- list clicks: edit / delete, or pick a player ----
  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const id = btn.closest('.player').dataset.id;
      const player = playerById(id);
      if (!player) return;

      if (btn.dataset.action === 'edit') {
        form.startEdit(player);
      } else if (btn.dataset.action === 'delete') {
        const ok = await confirmAction({
          title: `Delete ${player.name}?`,
          text: "This can't be undone.",
          confirmLabel: 'Delete',
        });
        if (!ok || !playerById(id)) return;
        state.players = state.players.filter(p => p.id !== id);
        if (id === form.editingId) form.reset();
        commit();
      }
      return;
    }
    const card = e.target.closest('.player.selectable');
    if (card) toggleSelect(card.dataset.id);
  });

  list.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.player.selectable');
    if (card) {
      e.preventDefault();
      toggleSelect(card.dataset.id);
    }
  });

  // ---- delete all (only before the session starts) ----
  clearBtn.addEventListener('click', async () => {
    const count = state.players.length;
    if (!count) return;
    const ok = await confirmAction({
      title: 'Delete all players?',
      text: `All ${count} players will be removed. This can't be undone.`,
      confirmLabel: 'Delete all',
    });
    if (!ok || state.session.started) return;
    state.players = [];
    form.reset();
    form.clearBulkResult();
    commit();
  });

  // ---- "Start queueing", then "Add players to queue" ----
  startBtn.addEventListener('click', async () => {
    if (!state.session.started) {
      if (!state.players.length) return;
      const ok = await confirmAction({ title: 'Start queueing?', confirmLabel: 'Confirm', danger: false });
      if (!ok || state.session.started || !state.players.length) return;
      form.reset();
      selected = [];
      notice = null;
      startSession();
      addPanel.open = false;
      commit();
      return;
    }

    if (selected.length !== 4) return;
    const match = enqueueMatch(selected.slice(0, 2), selected.slice(2));
    selected = [];
    notice = {
      text: `Match ${match.no} added to the queue. Pick 4 more players for the next match, or open the Queue tab.`,
      count: state.session.matches.length,
    };
    commit();
  });

  // ---- auto-generate a balanced matchup, with an editable preview ----
  autoBtn.addEventListener('click', async () => {
    const available = availablePlayers();
    if (available.length < 4) {
      flash(hintEl, 'Not enough available players (need at least 4 free players not currently in a game or queue).');
      return;
    }
    const edited = await openMatchEditor(suggestMatchup(available), available);
    if (!edited) return;

    const match = enqueueMatch(edited.a, edited.b);
    selected = [];
    notice = { text: `✨ Auto-generated Match ${match.no} added to the queue!`, count: state.session.matches.length };
    commit();
  });

  // ---- end session ----
  endBtn.addEventListener('click', async () => {
    const ok = await confirmAction({
      title: 'End the session?',
      text: 'The queue, matches on courts, match history, games, discounts and payments will be cleared.',
      confirmLabel: 'End session',
    });
    if (!ok) return;
    endSession();
    selected = [];
    notice = null;
    addPanel.open = true;
    commit();
  });

  // ---- search + filters ----
  searchInput.addEventListener('input', () => { filters.query = searchInput.value; render(); });
  levelFilter.addEventListener('change', () => { filters.level = levelFilter.value; render(); });
  genderFilter.addEventListener('change', () => { filters.gender = genderFilter.value; render(); });
  statusFilter.addEventListener('change', () => { filters.status = statusFilter.value; render(); });
  sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; render(); });
  filterReset.addEventListener('click', () => {
    resetFilters();
    render();
    searchInput.focus();
  });

  onChange(render);
  render();
}
