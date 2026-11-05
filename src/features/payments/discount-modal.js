// "Add player discount" form, shown through the shared modal.
import { CURRENCY } from '../../core/constants.js';
import { ask } from '../../ui/modal.js';

function field(labelText, control) {
  const wrap = document.createElement('div');
  wrap.className = 'discount-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

/** Resolves { playerId, amount } or null. */
export async function openDiscountModal(players) {
  let playerId = players[0].id;
  let amount = '';

  const select = document.createElement('select');
  players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.append(opt);
  });
  select.addEventListener('change', () => { playerId = select.value; });

  const input = document.createElement('input');
  Object.assign(input, { type: 'number', inputMode: 'decimal', min: '0', step: 'any', placeholder: '0' });
  input.addEventListener('input', () => { amount = input.value; });

  const body = document.createElement('div');
  body.className = 'discount-form';
  body.append(field('Select player', select), field(`Discount amount (${CURRENCY})`, input));

  const ok = await ask({
    title: '🏷️ Set Player Discount',
    body,
    choices: [{ label: 'Apply discount', value: true, kind: 'primary' }],
    beforeClose: () => {
      const n = parseFloat(amount);
      return Number.isNaN(n) || n < 0 ? 'Please enter a valid discount amount.' : null;
    },
  });
  return ok ? { playerId, amount: parseFloat(amount) } : null;
}
