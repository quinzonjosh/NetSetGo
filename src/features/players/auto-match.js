// Auto-generated matchup: the balancing algorithm + the editor modal.
import { LEVEL_LABELS, LEVEL_RANK } from '../../core/constants.js';
import { ask } from '../../ui/modal.js';

/** Picks the 4 players with the fewest games, then pairs strongest + weakest vs the middle two. */
export function suggestMatchup(available) {
  const [p1, p2, p3, p4] = [...available]
    .sort((x, y) => (x.games ?? 0) - (y.games ?? 0))
    .slice(0, 4)
    .sort((x, y) => (LEVEL_RANK[x.level] || 1) - (LEVEL_RANK[y.level] || 1));
  return { a: [p1.id, p4.id], b: [p2.id, p3.id] };
}

/** Lets the user swap players before queueing. Resolves { a, b } or null. */
export async function openMatchEditor({ a, b }, eligible) {
  const teams = { a: [...a], b: [...b] };

  function teamColumn(label, key) {
    const col = document.createElement('div');
    col.className = 'preview-team';
    const heading = document.createElement('h4');
    heading.textContent = label;
    col.append(heading);

    teams[key].forEach((playerId, i) => {
      const slot = document.createElement('div');
      slot.className = 'preview-slot';
      const labelEl = document.createElement('label');
      labelEl.textContent = `Player ${i + 1}`;

      const select = document.createElement('select');
      eligible.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${LEVEL_LABELS[p.level]})`;
        opt.selected = p.id === playerId;
        select.append(opt);
      });
      select.addEventListener('change', () => { teams[key][i] = select.value; });

      slot.append(labelEl, select);
      col.append(slot);
    });
    return col;
  }

  const body = document.createElement('div');
  body.className = 'preview-teams';
  body.append(teamColumn('Team A', 'a'), teamColumn('Team B', 'b'));

  const ok = await ask({
    title: '✨ Edit Auto-Generated Matchup',
    note: 'Change any player using the dropdowns below, then add to queue.',
    body,
    choices: [{ label: 'Add to queue', value: true, kind: 'primary' }],
    beforeClose: () =>
      new Set([...teams.a, ...teams.b]).size < 4
        ? 'Each player must be unique. You cannot select the same player more than once.'
        : null,
  });
  return ok ? teams : null;
}
