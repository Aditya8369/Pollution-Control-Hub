import { daysBetweenDayKeys, isDayKey } from './localDay';

/**
 * The daily check-in streak transition.
 *
 * Kept as a pure function of (last check-in, today, stored streak) so the whole
 * transition table can be asserted directly, rather than by mounting a component
 * and moving a fake clock around.
 */

/**
 * Reads a persisted streak count back into a usable number.
 *
 * `parseInt(localStorage.getItem('appStreak') || '0', 10)` returns NaN for any
 * non-numeric stored value — an older build's format, a hand-edited entry, or the
 * string "NaN" written by a previous run of this same bug. NaN + 1 is NaN, which
 * then persists and renders in the streak badge.
 *
 * @param {any} value
 * @returns {number} A non-negative integer.
 */
export function normaliseStoredStreak(value) {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * @typedef {Object} StreakTransition
 * @property {number} streak - The streak to display and persist.
 * @property {boolean} changed - Whether the caller needs to write anything back.
 */

/**
 * Works out the streak for a check-in happening on `todayKey`.
 *
 * Both arguments are local calendar day keys (see `localDayKey`). The rules:
 *
 *  - already checked in today → no change, and no second increment
 *  - checked in yesterday     → +1
 *  - any longer gap           → back to 1
 *  - no or unreadable history → 1
 *  - last check-in in the future → 1, and re-anchored to today
 *
 * That last case is why the old `Math.abs(today - lastDate)` was wrong: a stored
 * date one day *ahead* of today — clock skew, a system clock moved back, a device
 * that crossed the date line westward — has the same absolute difference as
 * yesterday and was rewarded with an increment.
 *
 * @param {any} lastCheckIn - Previously stored day key, if any.
 * @param {string} todayKey - Today's local day key.
 * @param {any} storedStreak - Previously stored streak count.
 * @returns {StreakTransition}
 */
export function nextStreak(lastCheckIn, todayKey, storedStreak) {
  const previous = normaliseStoredStreak(storedStreak);

  if (!isDayKey(todayKey)) {
    // Nothing sensible to compare against; leave storage alone.
    return { streak: Math.max(previous, 1), changed: false };
  }

  if (lastCheckIn === todayKey) {
    // Opening the app a second time on the same local day is not a second day.
    return { streak: Math.max(previous, 1), changed: false };
  }

  if (!isDayKey(lastCheckIn)) {
    return { streak: 1, changed: true };
  }

  const gap = daysBetweenDayKeys(lastCheckIn, todayKey);

  if (gap === 1) {
    return { streak: previous + 1, changed: true };
  }

  // gap > 1 (missed a day) or gap < 0 (stored date is in the future).
  return { streak: 1, changed: true };
}
