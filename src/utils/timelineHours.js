/**
 * Hour-window arithmetic for the pollution heatmap timeline.
 *
 * The timeline scrubs an hourly series that arrives after the component has
 * already picked an hour to show — `hourIndex` is seeded from
 * `new Date().getHours()` before any fetch resolves. Nothing re-checked that seed
 * against the series that actually came back, so a grid with fewer than 24 hours
 * (a partial day at the start of a local day, or a truncated upstream response)
 * left the slider's `value` above its own `max`. The selected hour then resolved
 * to `undefined`: no heat points, no hotspot line, no error either.
 *
 * These helpers are the shared, testable version of "which hour are we on, and
 * does that hour exist".
 */

/** Hours in a full day, used when a series length can't be determined. */
export const HOURS_IN_DAY = 24;

/**
 * How many hours the loaded grid actually covers.
 *
 * Reads the first grid point's `times` array. Every point in a response covers
 * the same window, so one is enough — but the array itself is optional, which the
 * old `gridData[0]?.times.length` did not allow for: the optional chain stopped
 * at the array index and then dereferenced `.length` on `undefined`, throwing and
 * taking the whole panel down.
 *
 * @param {any} [gridData] - The array returned by `fetchLocalGridTimeline`.
 * @returns {number} 0 when there is nothing loaded yet.
 */
export function getHourCount(gridData) {
  if (!Array.isArray(gridData) || gridData.length === 0) return 0;
  const times = gridData[0]?.times;
  return Array.isArray(times) ? times.length : 0;
}

/**
 * The highest hour index the slider may take.
 *
 * Returns 0 rather than -1 for an empty series so the `<input type="range">` never
 * gets `max` below `min`, which browsers resolve by silently clamping `max` up to
 * `min` and would leave the control in an inconsistent state.
 *
 * @param {number} hourCount
 * @returns {number}
 */
export function getMaxHourIndex(hourCount) {
  if (!Number.isFinite(hourCount) || hourCount <= 0) return 0;
  return hourCount - 1;
}

/**
 * Pulls an hour index back inside the loaded series.
 *
 * @param {number} index
 * @param {number} hourCount
 * @returns {number} A valid index, or 0 when the series is empty.
 */
export function clampHourIndex(index, hourCount) {
  const max = getMaxHourIndex(hourCount);
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), max);
}

/**
 * The hour to open on: the current local hour, if the series is long enough to
 * contain it, otherwise the last hour there is.
 *
 * @param {number} hourCount
 * @param {Date} [now]
 * @returns {number}
 */
export function initialHourIndex(hourCount, now = new Date()) {
  return clampHourIndex(now.getHours(), hourCount);
}

/**
 * The ISO timestamp at an hour index, or null when it isn't in the series.
 *
 * @param {any} gridData - The array returned by `fetchLocalGridTimeline`.
 * @param {number} hourIndex
 * @returns {string|null}
 */
export function getHourTime(gridData, hourIndex) {
  if (!Array.isArray(gridData) || gridData.length === 0) return null;
  const times = gridData[0]?.times;
  if (!Array.isArray(times)) return null;
  return times[hourIndex] ?? null;
}

/**
 * A short local clock label for a timestamp.
 *
 * Returns an empty string for anything unparseable rather than the literal
 * "Invalid Date" that `toLocaleTimeString` produces.
 *
 * @param {string|null} [isoTime]
 * @returns {string}
 */
export function formatHourLabel(isoTime) {
  if (!isoTime) return '';
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
