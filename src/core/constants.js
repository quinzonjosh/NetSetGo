// Plain data. Safe to import from anywhere.
export const STORAGE_KEY = 'qsession.v1';
export const LEGACY_KEYS = {
  players: 'qsession.players',
  session: 'qsession.session',
  courts: 'qsession.courts',
  history: 'qsession.history',
  fees: 'qsession.fees',
};

export const SAVE_DELAY_MS = 300;
export const NOTICE_MS = 8000;
export const LONG_WAIT_MS = 15 * 60 * 1000;
export const DEFAULT_COURTS = 2;
export const CURRENCY = '₱';

// Ordered weakest -> strongest. Labels and ranks are derived from this one list.
export const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'upper-intermediate', label: 'Upper Int.' },
  { id: 'advanced', label: 'Advanced' },
];
export const DEFAULT_LEVEL = LEVELS[0].id;
export const LEVEL_LABELS = Object.fromEntries(LEVELS.map(l => [l.id, l.label]));
export const LEVEL_RANK = Object.fromEntries(LEVELS.map((l, i) => [l.id, i + 1]));
