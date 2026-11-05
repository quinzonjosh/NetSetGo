// Shared pieces of the Team A vs Team B cards (queue, courts, history).
import { LEVEL_LABELS } from '../core/constants.js';
import { playerById } from '../core/selectors.js';
import { buildNameLi, cloneTemplate } from '../lib/dom.js';
import { createWaitChip } from './ticker.js';

/** Clones a card template and drops the shared teams block into its [data-teams] slot. */
export function cloneCardWithTeams(templateId) {
  const card = cloneTemplate(templateId);
  card.querySelector('[data-teams]').replaceWith(cloneTemplate('teams-template'));
  return card;
}

export function setLevelBadge(el, level) {
  el.textContent = LEVEL_LABELS[level];
  el.dataset.level = level;
}

/** Name + skill badge (+ live wait time when showWait is set). */
function buildPlayerLi(player, { showWait = false } = {}) {
  const li = buildNameLi(player.name);
  const badge = document.createElement('span');
  badge.className = 'badge';
  setLevelBadge(badge, player.level);
  li.append(badge);
  if (showWait && player.waitingSince != null) li.append(createWaitChip(player.waitingSince));
  return li;
}

/** Fills the Team A / Team B lists of a queue or court card. */
export function fillTeams(root, match, opts) {
  const fill = (selector, ids) =>
    root.querySelector(selector).replaceChildren(
      ...ids.map(playerById).filter(Boolean).map(p => buildPlayerLi(p, opts)),
    );
  fill('.team-a .team-players', match.a);
  fill('.team-b .team-players', match.b);
}
