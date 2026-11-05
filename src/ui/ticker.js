// ONE interval drives every live timer (wait chips and court elapsed time).
import { LONG_WAIT_MS } from '../core/constants.js';
import { formatDuration } from '../lib/format.js';

// A .wait-time element carries data-since (a timestamp). Fills its text and
// turns the parent .wait chip amber once the wait gets long.
export function setWaitText(el) {
  const ms = Date.now() - Number(el.dataset.since);
  el.textContent = formatDuration(ms);
  el.parentElement.classList.toggle('long', ms >= LONG_WAIT_MS);
}

export function createWaitChip(since) {
  const chip = document.createElement('span');
  chip.className = 'wait';
  chip.title = 'Time waiting';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⏱';
  const time = document.createElement('span');
  time.className = 'wait-time';
  time.dataset.since = since;
  chip.append(icon, time);
  setWaitText(time);
  return chip;
}

export function tick() {
  document.querySelectorAll('.wait-time[data-since]').forEach(setWaitText);
  document.querySelectorAll('.elapsed[data-started]').forEach(el => {
    el.textContent = formatDuration(Date.now() - Number(el.dataset.started));
  });
}

export function startTicker() {
  setInterval(tick, 1000);
}
