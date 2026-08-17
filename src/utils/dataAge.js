/**
 * How old a reading is, in words.
 *
 * The app already knows this and never says it. `cacheStore` timestamps every entry,
 * IndexedDB entries survive for a full day, and `resolveCurrentIndex()` in
 * `airQualityService.ts` returns an `exact` flag with a comment saying it exists "so
 * callers can label the reading rather than present it as live". Nothing labels it.
 *
 * That matters more here than in most apps. The question this app exists to answer is
 * whether it is safe to go outside *now*, and air quality in an Indian city routinely
 * crosses two bands between morning and evening. A four-hour-old reading is not a
 * slightly degraded answer; it is an answer to a different question.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How fresh a reading is, as a category.
 *
 * The thresholds follow the app's own refresh cadence rather than round numbers.
 * `CACHE_TTL.CURRENT` is five minutes, so anything inside that window is what the app
 * considers current and needs no label at all — labelling it would train people to
 * ignore the label.
 *
 * @readonly
 * @enum {string}
 */
export const FRESHNESS = {
  /** Within the service's own TTL. Live, no caveat needed. */
  LIVE: 'live',
  /** Past the refresh window but still broadly representative. */
  RECENT: 'recent',
  /** Old enough that conditions may have changed. Say so. */
  STALE: 'stale',
  /** Old enough to be about a different part of the day. Say so prominently. */
  OUTDATED: 'outdated',
};

/** Past this, a reading stops being "live". Matches CACHE_TTL.CURRENT. */
export const LIVE_THRESHOLD_MS = 5 * MINUTE;

/** Past this, conditions may genuinely have moved. */
export const STALE_THRESHOLD_MS = 30 * MINUTE;

/** Past this, the reading is about a different part of the day. */
export const OUTDATED_THRESHOLD_MS = 2 * HOUR;

/**
 * Categorises a reading's age.
 *
 * @param {number} ageMs - Age in milliseconds.
 * @returns {string} One of `FRESHNESS`.
 */
export function classifyAge(ageMs) {
  if (typeof ageMs !== 'number' || !Number.isFinite(ageMs)) {
    return FRESHNESS.OUTDATED;
  }
  // A negative age means the timestamp is in the future — a clock skew between the
  // device and whatever wrote the entry. Treating it as live is the safe reading:
  // it is certainly not old.
  if (ageMs < LIVE_THRESHOLD_MS) return FRESHNESS.LIVE;
  if (ageMs < STALE_THRESHOLD_MS) return FRESHNESS.RECENT;
  if (ageMs < OUTDATED_THRESHOLD_MS) return FRESHNESS.STALE;
  return FRESHNESS.OUTDATED;
}

/**
 * An age in milliseconds as a short human phrase.
 *
 * Rounds down rather than to nearest, so a reading is never described as newer than it
 * is. "59 minutes ago" reading as "an hour ago" is fine; 61 minutes reading as "an hour
 * ago" would understate it.
 *
 * @param {number} ageMs - Age in milliseconds.
 * @returns {string} e.g. "just now", "3 minutes ago", "2 hours ago".
 */
export function formatAge(ageMs) {
  if (typeof ageMs !== 'number' || !Number.isFinite(ageMs) || ageMs < 0) {
    return 'just now';
  }

  if (ageMs < MINUTE) return 'just now';

  if (ageMs < HOUR) {
    const minutes = Math.floor(ageMs / MINUTE);
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  if (ageMs < DAY) {
    const hours = Math.floor(ageMs / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(ageMs / DAY);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/**
 * Describes a reading given the moment it was taken.
 *
 * @param {number|null|undefined} timestamp - Epoch ms the reading was recorded.
 * @param {number} [now] - Epoch ms to measure against. Injectable for tests.
 * @returns {{
 *   ageMs: number|null,
 *   freshness: string,
 *   label: string,
 *   isLive: boolean,
 *   needsCaveat: boolean,
 * }}
 *   `needsCaveat` is the one a caller should branch on: it is false for a live reading,
 *   so the common case renders nothing rather than a badge nobody reads.
 */
export function describeAge(timestamp, now = Date.now()) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return {
      ageMs: null,
      freshness: FRESHNESS.OUTDATED,
      label: 'Age unknown',
      isLive: false,
      // An unknown age is not a reason to shout. It is a reason to say the age is
      // unknown, which the label already does.
      needsCaveat: true,
    };
  }

  const ageMs = now - timestamp;
  const freshness = classifyAge(ageMs);
  const isLive = freshness === FRESHNESS.LIVE;

  return {
    ageMs,
    freshness,
    label: isLive ? 'Updated just now' : `Updated ${formatAge(ageMs)}`,
    isLive,
    needsCaveat: !isLive,
  };
}
