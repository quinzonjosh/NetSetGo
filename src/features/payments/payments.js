// Payments: court fee per player, summary boxes, and a per-player table
// with Paid (cash / digital), Rollback and discounts.
import { state, commit, onChange } from '../../core/store.js';
import { playerById, feeFor } from '../../core/selectors.js';
import { $ } from '../../lib/dom.js';
import { money, round2 } from '../../lib/format.js';
import { ask, confirmAction } from '../../ui/modal.js';
import { openDiscountModal } from './discount-modal.js';

export function initPayments() {
  const feeInput = $('fee-input');
  const expensesInput = $('expenses-input');
  const collectedEl = $('stat-collected');
  const outstandingEl = $('stat-outstanding');
  const netEl = $('stat-net');
  const body = $('payments-body');
  const wrap = $('payments-wrap');
  const emptyEl = $('payments-empty');
  const discountBtn = $('discount-btn');

  const toAmount = input => Math.max(0, parseFloat(input.value) || 0);

  // Don't overwrite an input while the user is typing in it
  function syncInput(input, value) {
    if (document.activeElement !== input) input.value = value || '';
  }

  function cell(text, className) {
    const td = document.createElement('td');
    td.textContent = text;
    if (className) td.className = className;
    return td;
  }

  function actionButton(label, className, action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn-sm ${className}`;
    btn.dataset.action = action;
    btn.textContent = label;
    return btn;
  }

  function buildRow(p) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;

    const fee = feeFor(p);
    const feeText = p.discount ? `${money(fee)} (disc. ${money(p.discount)})` : money(fee);
    tr.append(cell(p.name), cell(p.games ?? 0, 'num'), cell(feeText, 'num'));

    const actions = document.createElement('div');
    actions.className = 'pay-actions';
    if (p.payment) {
      const tag = document.createElement('span');
      tag.className = 'pay-tag';
      tag.textContent = `Paid · ${p.payment.method === 'cash' ? 'Cash' : 'Digital'}`;
      actions.append(tag, actionButton('Rollback payment', 'btn-danger', 'rollback'));
    } else {
      const btn = actionButton('Paid', 'btn-primary', 'pay');
      btn.disabled = state.fees.perPlayer <= 0;
      btn.title = btn.disabled ? 'Enter the court fee first' : '';
      actions.append(btn);
    }

    const td = document.createElement('td');
    td.className = 'actions-col';
    td.append(actions);
    tr.append(td);
    return tr;
  }

  function render() {
    const { perPlayer, expenses } = state.fees;
    const paid = state.players.filter(p => p.payment);
    const unpaid = state.players.filter(p => !p.payment);

    const collected = round2(paid.reduce((sum, p) => sum + p.payment.amount, 0));
    const outstanding = round2(unpaid.reduce((sum, p) => sum + feeFor(p), 0));
    const net = round2(collected - expenses);

    syncInput(feeInput, perPlayer);
    syncInput(expensesInput, expenses);
    collectedEl.textContent = money(collected);
    outstandingEl.textContent = money(outstanding);
    netEl.textContent = money(net);
    netEl.classList.toggle('positive', net > 0);
    netEl.classList.toggle('negative', net < 0);

    body.replaceChildren(...state.players.map(buildRow));
    emptyEl.hidden = state.players.length > 0;
    wrap.hidden = state.players.length === 0;
  }

  // Fee + expenses save as you type; on blur the box is tidied
  feeInput.addEventListener('input', () => { state.fees.perPlayer = toAmount(feeInput); commit(); });
  expensesInput.addEventListener('input', () => { state.fees.expenses = toAmount(expensesInput); commit(); });
  feeInput.addEventListener('blur', render);
  expensesInput.addEventListener('blur', render);

  discountBtn.addEventListener('click', async () => {
    if (!state.players.length) return;
    const result = await openDiscountModal(state.players);
    const player = result && playerById(result.playerId);
    if (!player) return;
    player.discount = result.amount;
    commit();
  });

  // Paid -> choose cash or digital. Rollback -> confirm, then mark unpaid again.
  body.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const id = btn.closest('tr').dataset.id;
    const player = playerById(id);
    if (!player) return;

    if (btn.dataset.action === 'pay') {
      const fee = feeFor(player);
      const method = await ask({
        title: 'Record payment',
        text: `${player.name} · ${money(fee)}. Select payment method:`,
        cancelLabel: 'Back',
        choices: [
          { label: '💵 Cash', value: 'cash' },
          { label: '📱 Digital', value: 'digital' },
        ],
      });
      const current = playerById(id);
      if (!method || !current || current.payment) return;
      current.payment = { method, amount: fee, paidAt: Date.now() };
      commit();
    } else if (btn.dataset.action === 'rollback' && player.payment) {
      const { amount, method } = player.payment;
      const ok = await confirmAction({
        title: 'Roll back payment?',
        text: `${player.name}'s ${money(amount)} ${method} payment will be removed and they'll be marked as unpaid again.`,
        confirmLabel: 'Roll back',
        cancelLabel: 'Keep payment',
      });
      const current = playerById(id);
      if (!ok || !current?.payment) return;
      current.payment = null;
      commit();
    }
  });

  onChange(render);
  render();
}
