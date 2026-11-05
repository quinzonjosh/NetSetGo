// Pure text -> players. No DOM, no state: easy to unit test.
// Accepts numbered lists, bullets, commas, "Level: names" lines and header lines.
import { DEFAULT_LEVEL } from '../../core/constants.js';

const LEVEL_WORDS = {
  beginner: ['beginners?', 'beg', 'newbies?', 'novices?', 'rookies?', 'basic', 'starter', 'lvl\\s*1', 'level\\s*1'],
  // must come before "intermediate" so "upper intermediate" isn't read as plain "intermediate"
  'upper-intermediate': ['upper\\s*-?\\s*intermediates?', 'upper\\s*-?\\s*intermed', 'upper\\s*-?\\s*inter', 'upper\\s*-?\\s*int', 'upper\\s*-?\\s*mid', 'high\\s*-?\\s*intermediates?', 'upper', 'lvl\\s*3', 'level\\s*3'],
  intermediate: ['intermediates?', 'intermed', 'inter', 'int', 'mid', 'medium', 'average', 'lvl\\s*2', 'level\\s*2'],
  advanced: ['advanced?', 'adv', 'pro', 'experts?', 'lvl\\s*4', 'level\\s*4'],
};

const LEVEL_PATTERNS = Object.entries(LEVEL_WORDS).map(([level, words]) => [
  level,
  new RegExp(`(?<![\\p{L}\\d])(?:${words.join('|')})(?![\\p{L}\\d])`, 'iu'),
]);

const PREFIX = /^\s*(?:[-*•·>]+|\d+\s*[.)\]:-])\s*/; // leading bullet or number: "- ", "1. ", "2) "
const SEPARATORS = /\s*[,;|]\s*|\s+&\s+|\s+and\s+/i; // , ; | & and
const hasLetter = s => /\p{L}/u.test(s);

function findLevel(text) {
  for (const [level, re] of LEVEL_PATTERNS) {
    const m = text.match(re);
    if (m) return { level, match: m[0] };
  }
  return null;
}

// Returns the level when `text` is nothing but a level word ("Advanced", "lvl 3"), else null.
function levelOnly(text) {
  const found = findLevel(text);
  return found && !hasLetter(text.replace(found.match, '')) ? found.level : null;
}

function cleanName(raw) {
  let name = raw
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '') // emoji
    .replace(/[()\[\]{}"“”<>]/g, ' ') // brackets, quotes
    .replace(/^[\s\-–—:=.•*#@]+|[\s\-–—:=.•*#]+$/g, '') // edge punctuation
    .replace(/\s+/g, ' ')
    .trim();
  // lowercase -> Title Case; LONG ALL CAPS -> Title Case; short caps like "JR" or "AJ" stay as initials
  if (name && (name === name.toLowerCase() || (name === name.toUpperCase() && name.length > 3))) {
    name = name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  }
  return name;
}

/** text -> [{ name, level }] */
export function parseBulkPlayers(text) {
  const out = [];
  let currentLevel = DEFAULT_LEVEL;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(PREFIX, '').trim();
    if (!line) continue;

    let namesPart = line;
    const colon = line.indexOf(':');

    if (colon > 0) {
      // "Intermediate: Caryl, John" -> sets the level for this and following lines
      const level = levelOnly(line.slice(0, colon).trim());
      if (level) {
        currentLevel = level;
        namesPart = line.slice(colon + 1).trim();
      }
    } else {
      // a standalone header like "Advanced" only changes the level
      const level = levelOnly(line.replace(/[:\-–—=*#()[\]]+/g, ' ').trim());
      if (level) {
        currentLevel = level;
        continue;
      }
    }

    for (const seg of namesPart.split(SEPARATORS)) {
      const found = findLevel(seg);
      const name = cleanName(found ? seg.replace(found.match, ' ') : seg);
      if (!hasLetter(name)) continue;
      out.push({ name: name.slice(0, 40), level: found ? found.level : currentLevel });
    }
  }
  return out;
}
