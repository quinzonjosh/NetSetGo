// ONE reusable overlay for every confirmation, choice and small form.
//
//   ask({ title, text, note, icon, body, choices, cancelLabel, beforeClose }) -> Promise<value | null>
//
//   choices:      [{ label, sub?, value, kind?: 'primary' | 'danger' | 'team' }]
//   body:         optional DOM node shown under the text (for forms)
//   beforeClose:  (value) => string | null. Return an error string to keep the modal open.
//   Resolves null when cancelled (Cancel button, Escape, or tapping outside).
import { $ } from '../lib/dom.js';

let ui = null; // set by initModal()

export const ask = options => ui.open(options);

/** Yes/no confirmation -> Promise<boolean> */
export async function confirmAction({
  title,
  text = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
}) {
  const ok = await ask({
    title,
    text,
    cancelLabel,
    choices: [{ label: confirmLabel, value: true, kind: danger ? 'danger' : 'primary' }],
  });
  return ok === true;
}

export function initModal() {
  const root = $('prompt');
  const box = root.querySelector('.prompt');
  const iconEl = $('prompt-icon');
  const titleEl = $('prompt-title');
  const textEl = $('prompt-text');
  const noteEl = $('prompt-note');
  const bodyEl = $('prompt-body');
  const errorEl = $('prompt-error');
  const actionsEl = $('prompt-actions');

  let active = null; // { resolve, choices, opener, beforeClose }

  function showError(msg) {
    errorEl.textContent = msg || '';
    errorEl.hidden = !msg;
  }

  function close(value) {
    if (!active) return;
    const { resolve, opener } = active;
    active = null;
    root.hidden = true;
    document.body.classList.remove('prompt-open');
    resolve(value);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }

  function buildChoiceButton(c, i, stacked) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.choice = i;
    if (!stacked) {
      btn.className = 'btn' + (c.kind ? ` btn-${c.kind}` : '');
      btn.textContent = c.label;
      return btn;
    }
    btn.className = 'btn result-btn' + (c.kind === 'team' ? ' team' : '');
    const strong = document.createElement('strong');
    strong.textContent = c.label;
    btn.append(strong);
    if (c.sub) {
      const sub = document.createElement('span');
      sub.textContent = c.sub;
      btn.append(sub);
    }
    return btn;
  }

  function open({
    title,
    text = '',
    note = '',
    icon = '',
    body = null,
    choices = [],
    cancelLabel = 'Cancel',
    beforeClose = null,
  }) {
    if (active) close(null); // only one modal at a time

    return new Promise(resolve => {
      active = { resolve, choices, opener: document.activeElement, beforeClose };

      box.classList.toggle('has-icon', !!icon);
      iconEl.textContent = icon;
      iconEl.hidden = !icon;
      titleEl.textContent = title;
      textEl.textContent = text; // textContent (not innerHTML): player names are user input
      textEl.hidden = !text;
      noteEl.textContent = note;
      noteEl.hidden = !note;
      bodyEl.replaceChildren(...(body ? [body] : []));
      bodyEl.hidden = !body;
      showError('');

      // choices with a second line (like team names) stack; short ones sit in a row
      const stacked = choices.some(c => c.sub);
      actionsEl.classList.toggle('row', !stacked);

      const buttons = choices.map((c, i) => buildChoiceButton(c, i, stacked));

      let cancelBtn = null;
      if (cancelLabel) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn';
        cancelBtn.dataset.cancel = '1';
        cancelBtn.textContent = cancelLabel;
      }

      actionsEl.replaceChildren(...[...buttons, cancelBtn].filter(Boolean));
      root.hidden = false;
      document.body.classList.add('prompt-open');
      // focus the first form field, otherwise the safe choice
      (body?.querySelector('select, input') ?? cancelBtn ?? buttons[0])?.focus();
    });
  }

  root.addEventListener('click', e => {
    if (!active) return;
    if (e.target === root || e.target.closest('[data-cancel]')) {
      close(null);
      return;
    }
    const btn = e.target.closest('[data-choice]');
    if (!btn) return;
    const { value } = active.choices[Number(btn.dataset.choice)];
    const error = active.beforeClose?.(value);
    if (error) {
      showError(error);
      return;
    }
    close(value);
  });

  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(null);
      return;
    }
    if (e.key !== 'Tab') return;

    // keep keyboard focus inside the modal
    const items = [...box.querySelectorAll('button, select, input, textarea')].filter(el => !el.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!box.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  ui = { open };
}
