// Add / edit one player, and the "add many" bulk form.
import { state, commit, makePlayer } from '../../core/store.js';
import { $ } from '../../lib/dom.js';
import { parseBulkPlayers } from './bulk-parser.js';

/**
 * @param onAdded           called after players are added (so the list can clear its filters)
 * @param onEditingChange   called when edit mode starts or stops (so the list can re-render)
 */
export function initPlayerForm({ onAdded, onEditingChange }) {
  const form = $('player-form');
  const nameInput = $('player-name');
  const errorEl = $('player-error');
  const submitBtn = $('player-submit');
  const cancelBtn = $('player-cancel');
  const bulkForm = $('bulk-form');
  const bulkText = $('bulk-text');
  const bulkResult = $('bulk-result');

  let editingId = null;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function reset() {
    editingId = null;
    form.reset(); // restores "Beginner" as the default radio
    showError('');
    submitBtn.textContent = 'Add player';
    cancelBtn.hidden = true;
  }

  function startEdit(player) {
    editingId = player.id;
    nameInput.value = player.name;
    form.elements.level.value = player.level;
    showError('');
    submitBtn.textContent = 'Save changes';
    cancelBtn.hidden = false;
    onEditingChange();
    $('add-players').open = true;
    nameInput.focus();
    nameInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const level = form.elements.level.value;

    if (!name) return showError('Enter a player name.');
    const duplicate = state.players.some(p => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return showError(`${name} is already in the list.`);

    if (editingId) {
      state.players = state.players.map(p => (p.id === editingId ? { ...p, name, level } : p));
    } else {
      onAdded(); // so the new card isn't hidden by an old search
      state.players.push(makePlayer(name, level));
    }
    reset();
    commit();
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    reset();
    onEditingChange();
  });

  bulkForm.addEventListener('submit', e => {
    e.preventDefault();
    const entries = parseBulkPlayers(bulkText.value);
    if (!entries.length) {
      bulkResult.textContent = "Couldn't find any player names in that text.";
      return;
    }

    const known = new Set(state.players.map(p => p.name.toLowerCase()));
    const skipped = [];
    let added = 0;
    for (const { name, level } of entries) {
      const key = name.toLowerCase();
      if (known.has(key)) {
        skipped.push(name);
        continue;
      }
      known.add(key);
      state.players.push(makePlayer(name, level));
      added++;
    }

    onAdded();
    commit();
    if (added) bulkText.value = '';
    bulkResult.textContent =
      `Added ${added} player${added === 1 ? '' : 's'}.` +
      (skipped.length ? ` Skipped ${skipped.length} already in the list: ${skipped.join(', ')}.` : '');
  });

  return {
    get editingId() { return editingId; },
    reset,
    startEdit,
    clearBulkResult() { bulkResult.textContent = ''; },
  };
}
