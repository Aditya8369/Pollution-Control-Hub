/**
 * Calendar-day keys in the user's own timezone.
 *
 * `new Date().toISOString().split('T')[0]` looks like it produces today's date and
 * does not: `toISOString` converts to UTC first, so the day it names rolls over at
 * midnight UTC rather than at the user's midnight. In New York that is 19:00 or
 * 20:00 local — the "day" ends mid-evening. In India the first five and a half
 * hours after midnight still count as yesterday.
 *
 * Anything keyed by "which day is it for this person" — check-in streaks, daily
 * dismissals, once-per-day prompts — has to use the local calendar date instead.
 * `HistoricalData.jsx` already carries a comment warning about this after #583;
 * this is the shared version of that fix.
 */

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whether a value is a well-formed `YYYY-MM-DD` day key.
 *
 * Guards against whatever is sitting in localStorage — an older build's format,
 * a hand-edited value, `"undefined"` stringified by an earlier bug.
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isDayKey(value) {
  if (typeof value !== 'string' || !DAY_KEY_PATTERN.test(value)) return false;
  // Reject impossible dates that still match the shape, e.g. "2026-02-31".
  const [year, month, day] = value.split('-').map(Number);
  const asDate = new Date(Date.UTC(year, month - 1, day));
  return (
    asDate.getUTCFullYear() === year &&
    asDate.getUTCMonth() === month - 1 &&
    asDate.getUTCDate() === day
  );
}

/**
 * The local calendar date of `date`, as `YYYY-MM-DD`.
 *
 * @param {Date} [date] - Defaults to now.
 * @returns {string|null} The day key, or null for an invalid date.
 */
export function localDayKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return null;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole days from `fromKey` to `toKey`, signed.
 *
 * Both keys are anchored at UTC midnight purely to do the arithmetic. That keeps
 * the difference an exact multiple of 24h across DST transitions, which a local
 * midnight anchor would not — a spring-forward day is 23 hours long, and dividing
 * it by 86_400_000 rounds to 0.
 *
 * @param {string} fromKey
 * @param {string} toKey
 * @returns {number|null} Positive when `toKey` is later; null if either key is malformed.
 */
export function daysBetweenDayKeys(fromKey, toKey) {
  if (!isDayKey(fromKey) || !isDayKey(toKey)) return null;

  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number);
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number);

  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);

  return Math.round((to - from) / MS_PER_DAY);
}
