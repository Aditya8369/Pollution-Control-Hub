/**
 * Which way an hour of the AQI forecast is going, compared with the hour before it.
 *
 * `AqiForecastAttribution` decided this inline, with a ternary that had two
 * outcomes for three cases:
 *
 *   {idx > 0 && hour.aqiMax > breakdown[idx - 1].aqiMax
 *     ? <span>↑ Rising</span>
 *     : <span>↓ Falling</span>}
 *
 * Everything that is not strictly rising was printed as falling. The first row
 * of every day claimed the air was improving on the strength of a comparison
 * that was never made — there is no previous hour at index 0 — and a flat
 * overnight stretch, which is the common case for a smoothed forecast, read as
 * hours of steady improvement (#1073).
 *
 * Four outcomes, because there are four things the data can say: it went up, it
 * went down, it did neither, or there is nothing to compare against. The last
 * one is the one that was being answered with a guess.
 */

/**
 * @typedef {'rising'|'falling'|'steady'|'unknown'} TrendDirection
 */

/**
 * @typedef {object} TrendDescriptor
 * @property {TrendDirection} direction
 * @property {string} label      Short text for the cell.
 * @property {string} symbol     Arrow or dash. Decorative — the label carries the meaning.
 * @property {string} className  Tailwind colour for the cell.
 */

/** @type {Record<TrendDirection, TrendDescriptor>} */
const DESCRIPTORS = {
  rising: {
    direction: 'rising',
    label: 'Rising',
    symbol: '↑',
    className: 'text-red-600 dark:text-red-400',
  },
  falling: {
    direction: 'falling',
    label: 'Falling',
    symbol: '↓',
    className: 'text-green-600 dark:text-green-400',
  },
  steady: {
    direction: 'steady',
    label: 'Steady',
    symbol: '→',
    className: 'text-gray-600 dark:text-gray-400',
  },
  unknown: {
    direction: 'unknown',
    label: 'No previous hour',
    // An em dash, not an arrow: there is no direction to point in.
    symbol: '—',
    className: 'text-gray-400 dark:text-gray-500',
  },
};

/**
 * Whether `value` is a number worth comparing.
 *
 * A forecast row can arrive with `aqiMax` missing or as a string from a JSON
 * encoder that quoted it; neither is a reading, and neither should be silently
 * coerced into one.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isReading(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The trend of `hour` against `previousHour`.
 *
 * Returns the `unknown` descriptor when there is no previous hour, or when
 * either hour has no usable `aqiMax` — the cases the old ternary answered with
 * "Falling".
 *
 * @param {{aqiMax?: unknown}} [hour]
 * @param {{aqiMax?: unknown}} [previousHour]
 * @returns {TrendDescriptor}
 */
export function hourlyTrend(hour, previousHour) {
  if (!hour || !previousHour) return DESCRIPTORS.unknown;
  if (!isReading(hour.aqiMax) || !isReading(previousHour.aqiMax)) return DESCRIPTORS.unknown;

  if (hour.aqiMax > previousHour.aqiMax) return DESCRIPTORS.rising;
  if (hour.aqiMax < previousHour.aqiMax) return DESCRIPTORS.falling;
  return DESCRIPTORS.steady;
}

/**
 * How wide an attribution bar should be drawn, as a CSS percentage.
 *
 * The component divided each share by the largest share in the set:
 *
 *   const maxPercentage = Math.max(...attributions.map(a => a.percentage), 1);
 *   style={{ width: `${(attr.percentage / maxPercentage) * 100}%` }}
 *
 * `percentage` is already a percentage — the label beside the bar renders it as
 * `{attr.percentage}%`. Rescaling to the maximum made the largest source a
 * full-width bar whether it was 80% or 22%, so five near-equal shares drew as
 * five full bars reading "everything is at maximum", and the bar and the number
 * next to it disagreed.
 *
 * Clamped to 0–100 so a share outside that range cannot overflow its track.
 *
 * @param {unknown} percentage
 * @returns {number} 0–100.
 */
export function attributionBarWidth(percentage) {
  if (!isReading(percentage)) return 0;
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * The index to render, given a possibly stale selection.
 *
 * `selectedDayIndex` is held across data changes and was used unguarded:
 * `forecasts[selectedDayIndex]` on a shorter forecast is `undefined`, and every
 * line after it dereferenced the result.
 *
 * @param {number} index
 * @param {number} length
 * @returns {number} 0 when there is nothing to select.
 */
export function clampDayIndex(index, length) {
  if (!Number.isInteger(length) || length <= 0) return 0;
  if (!Number.isInteger(index) || index < 0) return 0;
  return Math.min(index, length - 1);
}

/**
 * The shares that make up an attribution set, ignoring malformed entries.
 *
 * @param {unknown} attributions
 * @returns {Array<{source: string, percentage: number, indicators: string[]}>}
 */
export function usableAttributions(attributions) {
  if (!Array.isArray(attributions)) return [];
  return attributions
    .filter((entry) => entry && typeof entry.source === 'string')
    .map((entry) => ({
      source: entry.source,
      percentage: isReading(entry.percentage) ? entry.percentage : 0,
      indicators: Array.isArray(entry.indicators) ? entry.indicators : [],
    }));
}

/**
 * The share of the total these attributions account for.
 *
 * Shown next to the heading so a set summing to 80% is not read as a complete
 * account of the air. Rounded to a whole percent — the panel has no use for
 * more precision than the shares themselves carry.
 *
 * @param {Array<{percentage: number}>} attributions
 * @returns {number}
 */
export function attributedTotal(attributions) {
  if (!Array.isArray(attributions)) return 0;
  return Math.round(attributions.reduce((sum, entry) => sum + (isReading(entry?.percentage) ? entry.percentage : 0), 0));
}
