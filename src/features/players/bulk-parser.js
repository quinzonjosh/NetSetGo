// Pure text -> players. No DOM, no state: easy to unit test.
// Reads a name, a skill level and a gender from each line. Anything it can't
// find comes back as null, and the review step asks the user to fill it in.

const LEVEL_WORDS = {
  beginner: ['beginners?', 'beg', 'newbies?', 'novices?', 'rookies?', 'basic', 'starter', 'lvl\\s*1', 'level\\s*1'],
  // must come before "intermediate" so "upper intermediate" isn't read as plain "intermediate"
  'upper-intermediate': ['upper\\s*-?\\s*intermediates?', 'upper\\s*-?\\s*intermed', 'upper\\s*-?\\s*inter', 'upper\\s*-?\\s*int', 'upper\\s*-?\\s*mid', 'high\\s*-?\\s*intermediates?', 'upper', 'lvl\\s*3', 'level\\s*3'],
  intermediate: ['intermediates?', 'intermed', 'inter', 'int', 'mid', 'medium', 'average', 'lvl\\s*2', 'level\\s*2'],
  advanced: ['advanced?', 'adv', 'pro', 'experts?', 'lvl\\s*4', 'level\\s*4'],
};

const GENDER_WORDS = {
  male: ['males?', 'man', 'men', 'boys?'],
  female: ['females?', 'woman', 'women', 'girls?', 'ladies', 'lady'],
};

const wordRegex = words => new RegExp(`(?<![\\p{L}\\d])(?:${words.join('|')})(?![\\p{L}\\d])`, 'iu');
const toPatterns = table => Object.entries(table).map(([id, words]) => [id, wordRegex(words)]);

const LEVEL_PATTERNS = toPatterns(LEVEL_WORDS);
const GENDER_PATTERNS = toPatterns(GENDER_WORDS);

// A lone "M" or "F" only counts in brackets "(M)", between dashes "Maria - F - adv",
// or on its own. This keeps initials like "Maria M" or names like "Fred" safe.
const SINGLE_GENDER = /(?:[(\[]\s*|\s[-–—/]\s*|^\s*)([mf])(?=\s*(?:[)\]]|[-–—/](?:\s|$)|$))/i;

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

function findGender(text) {
  for (const [gender, re] of GENDER_PATTERNS) {
    const m = text.match(re);
    if (m) return { gender, match: m[0] };
  }
  const s = text.match(SINGLE_GENDER);
  return s ? { gender: s[1].toLowerCase() === 'm' ? 'male' : 'female', match: s[0] } : null;
}

// If `text` is nothing but level and/or gender words ("Advanced", "Women", "Advanced Men"),
// returns { level, gender }. Otherwise null.
function headerOnly(text) {
  let rest = text;
  const lv = findLevel(rest);
  if (lv) rest = rest.replace(lv.match, ' ');
  const gd = findGender(rest);
  if (gd) rest = rest.replace(gd.match, ' ');
  return (lv || gd) && !hasLetter(rest) ? { level: lv?.level ?? null, gender: gd?.gender ?? null } : null;
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

/** text -> [{ name, level | null, gender | null }] */
export function parseBulkPlayers(text) {
  const out = [];
  let currentLevel = null;
  let currentGender = null;

  const applyHeader = head => {
    if (head.level) currentLevel = head.level;
    if (head.gender) currentGender = head.gender;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(PREFIX, '').trim();
    if (!line) continue;

    let namesPart = line;
    const colon = line.indexOf(':');

    if (colon > 0) {
      // "Advanced Men: Carlo, Diego" -> sets level/gender for this and following lines
      const head = headerOnly(line.slice(0, colon).trim());
      if (head) {
        applyHeader(head);
        namesPart = line.slice(colon + 1).trim();
      }
    } else {
      // a standalone header like "Women" or "Advanced" only changes the current level/gender
      const head = headerOnly(line.replace(/[:\-–—=*#()[\]]+/g, ' ').trim());
      if (head) {
        applyHeader(head);
        continue;
      }
    }

    let prev = null;
    for (const seg of namesPart.split(SEPARATORS)) {
      const lv = findLevel(seg);
      let rest = lv ? seg.replace(lv.match, ' ') : seg;
      const gd = findGender(rest);
      if (gd) rest = rest.replace(gd.match, ' ');
      const name = cleanName(rest);

      if (!hasLetter(name)) {
        // a lone tag ("Maria, F, beginner") applies to the previous name on the line
        if (prev) {
          if (lv && !prev.hasLevel) Object.assign(prev, { level: lv.level, hasLevel: true });
          if (gd && !prev.hasGender) Object.assign(prev, { gender: gd.gender, hasGender: true });
        }
        continue;
      }

      prev = {
        name: name.slice(0, 40),
        level: lv?.level ?? currentLevel,
        gender: gd?.gender ?? currentGender,
        hasLevel: !!lv,
        hasGender: !!gd,
      };
      out.push(prev);
    }
  }

  return out.map(({ name, level, gender }) => ({ name, level, gender }));
}