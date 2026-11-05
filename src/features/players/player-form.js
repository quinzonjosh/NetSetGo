// Add / edit one player, and the "add many" flow (paste -> review -> add).
import { LEVELS, GENDERS } from '../../core/constants.js';
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
  const bulkReview = $('bulk-review');
  const reviewBody = $('bulk-review-body');
  const backBtn = $('bulk-back');
  const confirmBtn = $('bulk-confirm');

  let editingId = null;
  let reviewRows = []; // [{ name, level | null, gender | null }]

  // ---------- single add / edit ----------

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function reset() {
    editingId = null;
    form.reset(); // clears the name and un-checks level + gender: both must be chosen
    showError('');
    submitBtn.textContent = 'Add player';
    cancelBtn.hidden = true;
  }

  function startEdit(player) {
    form.reset(); // clear any leftover radio choice from a previous edit
    editingId = player.id;
    nameInput.value = player.name;
    form.elements.level.value = player.level;
    form.elements.gender.value = player.gender ?? ''; // older players have none: must pick one to save
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
    const gender = form.elements.gender.value;

    if (!name) return showError('Enter a player name.');
    if (!gender) return showError('Choose a gender.');
    if (!level) return showError('Choose a skill level.');
    const duplicate = state.players.some(p => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return showError(`${name} is already in the list.`);

    if (editingId) {
      state.players = state.players.map(p => (p.id === editingId ? { ...p, name, level, gender } : p));
    } else {
      onAdded(); // so the new card isn't hidden by an old search
      state.players.push(makePlayer(name, level, gender));
    }
    reset();
    commit();
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    reset();
    onEditingChange();
  });

  // ---------- bulk add: paste -> review -> add ----------

  const isDuplicate = (row, i) => {
    const key = row.name.toLowerCase();
    return (
      state.players.some(p => p.name.toLowerCase() === key) ||
      reviewRows.findIndex(r => r.name.toLowerCase() === key) < i // an earlier row has the same name
    );
  };
  const isReady = (row, i) => row.level && row.gender && !isDuplicate(row, i);

  function showReview(on) {
    bulkForm.hidden = on;
    bulkReview.hidden = !on;
  }

  function updateConfirm() {
    const ready = reviewRows.filter(isReady).length;
    const skipped = reviewRows.length - ready;
    confirmBtn.textContent = `Add ${ready} player${ready === 1 ? '' : 's'}` + (skipped ? ` (${skipped} skipped)` : '');
    confirmBtn.disabled = ready === 0;
  }

  function choiceSelect(options, value, label, onChange) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    select.append(new Option('⚠ Choose', ''), ...options.map(o => new Option(o.label, o.id)));
    select.value = value ?? '';
    select.classList.toggle('missing', !select.value);
    select.addEventListener('change', () => {
      select.classList.toggle('missing', !select.value);
      onChange(select.value || null);
      updateConfirm();
    });
    return select;
  }

  function buildReviewRow(row, i) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = row.name; // textContent: safe for pasted text
    if (isDuplicate(row, i)) {
      const note = document.createElement('span');
      note.className = 'review-note';
      note.textContent = 'Already in the list';
      nameTd.append(note);
    }

    const cell = node => {
      const td = document.createElement('td');
      td.append(node);
      return td;
    };
    tr.append(
      nameTd,
      cell(choiceSelect(GENDERS, row.gender, `Gender for ${row.name}`, v => { row.gender = v; })),
      cell(choiceSelect(LEVELS, row.level, `Level for ${row.name}`, v => { row.level = v; })),
    );
    return tr;
  }

  bulkForm.addEventListener('submit', e => {
    e.preventDefault();
    const entries = parseBulkPlayers(bulkText.value);
    if (!entries.length) {
      bulkResult.textContent = "Couldn't find any player names in that text.";
      return;
    }
    bulkResult.textContent = '';
    reviewRows = entries;
    reviewBody.replaceChildren(...reviewRows.map(buildReviewRow));
    updateConfirm();
    showReview(true);
  });

  backBtn.addEventListener('click', () => showReview(false));

  confirmBtn.addEventListener('click', () => {
    const ready = reviewRows.filter(isReady);
    const skipped = reviewRows.length - ready.length;
    ready.forEach(r => state.players.push(makePlayer(r.name, r.level, r.gender)));

    reviewRows = [];
    bulkText.value = '';
    showReview(false);
    onAdded();
    commit();
    bulkResult.textContent =
      `Added ${ready.length} player${ready.length === 1 ? '' : 's'}.` +
      (skipped ? ` Skipped ${skipped} (incomplete or already in the list).` : '');
  });

  return {
    get editingId() { return editingId; },
    reset,
    startEdit,
    clearBulkResult() { bulkResult.textContent = ''; },
  };
}