import { CURRENCY } from '../core/constants.js';

export const round2 = n => Math.round(n * 100) / 100;

export const formatClock = ts =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// 75000 -> "01:15", 3725000 -> "1:02:05"
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function money(n) {
  const text = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}${CURRENCY}${text}`;
}
