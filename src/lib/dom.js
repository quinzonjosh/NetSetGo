import { NOTICE_MS } from '../core/constants.js';

export const $ = id => document.getElementById(id);

export const cloneTemplate = id => $(id).content.firstElementChild.cloneNode(true);

const flashTimers = new WeakMap();

/** Shows a message in an element, then hides it after a few seconds. */
export function flash(el, text) {
  clearTimeout(flashTimers.get(el));
  el.textContent = text;
  el.hidden = false;
  flashTimers.set(el, setTimeout(() => { el.hidden = true; }, NOTICE_MS));
}

/** <li> with a player's name, used inside team boxes. */
export function buildNameLi(name) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.className = 'team-name';
  span.textContent = name; // textContent: safe for user input
  li.append(span);
  return li;
}
