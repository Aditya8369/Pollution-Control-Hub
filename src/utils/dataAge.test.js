import { describe, it, expect } from 'vitest';
import {
  FRESHNESS,
  LIVE_THRESHOLD_MS,
  OUTDATED_THRESHOLD_MS,
  STALE_THRESHOLD_MS,
  classifyAge,
  describeAge,
  formatAge,
} from './dataAge';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('classifyAge', () => {
  it('treats anything inside the refresh window as live', () => {
    expect(classifyAge(0)).toBe(FRESHNESS.LIVE);
    expect(classifyAge(30 * 1000)).toBe(FRESHNESS.LIVE);
    expect(classifyAge(LIVE_THRESHOLD_MS - 1)).toBe(FRESHNESS.LIVE);
  });

  it('steps through the bands at their boundaries', () => {
    expect(classifyAge(LIVE_THRESHOLD_MS)).toBe(FRESHNESS.RECENT);
    expect(classifyAge(STALE_THRESHOLD_MS - 1)).toBe(FRESHNESS.RECENT);
    expect(classifyAge(STALE_THRESHOLD_MS)).toBe(FRESHNESS.STALE);
    expect(classifyAge(OUTDATED_THRESHOLD_MS - 1)).toBe(FRESHNESS.STALE);
    expect(classifyAge(OUTDATED_THRESHOLD_MS)).toBe(FRESHNESS.OUTDATED);
    expect(classifyAge(5 * DAY)).toBe(FRESHNESS.OUTDATED);
  });

  it('treats a future timestamp as live rather than as an error', () => {
    // Clock skew between the device and whatever wrote the entry. The reading is
    // certainly not old, which is the only claim this function makes.
    expect(classifyAge(-5000)).toBe(FRESHNESS.LIVE);
  });

  it('treats an unusable age as outdated', () => {
    expect(classifyAge(NaN)).toBe(FRESHNESS.OUTDATED);
    expect(classifyAge(Infinity)).toBe(FRESHNESS.OUTDATED);
    // @ts-expect-error — deliberately unusable input; the guard is the subject.
    expect(classifyAge('an hour')).toBe(FRESHNESS.OUTDATED);
    expect(classifyAge(undefined)).toBe(FRESHNESS.OUTDATED);
  });
});

describe('formatAge', () => {
  it('says "just now" below a minute', () => {
    expect(formatAge(0)).toBe('just now');
    expect(formatAge(59 * 1000)).toBe('just now');
  });

  it('singularises one minute and one hour', () => {
    expect(formatAge(MINUTE)).toBe('1 minute ago');
    expect(formatAge(HOUR)).toBe('1 hour ago');
    expect(formatAge(DAY)).toBe('1 day ago');
  });

  it('pluralises everything else', () => {
    expect(formatAge(3 * MINUTE)).toBe('3 minutes ago');
    expect(formatAge(4 * HOUR)).toBe('4 hours ago');
    expect(formatAge(2 * DAY)).toBe('2 days ago');
  });

  it('rounds down so a reading is never described as newer than it is', () => {
    // 59 minutes reading as "an hour ago" would be harmless; 61 minutes reading as
    // "an hour ago" understates it, which is the direction that matters.
    expect(formatAge(59 * MINUTE + 59 * 1000)).toBe('59 minutes ago');
    expect(formatAge(HOUR + 59 * MINUTE)).toBe('1 hour ago');
    expect(formatAge(23 * HOUR + 59 * MINUTE)).toBe('23 hours ago');
  });

  it('falls back to "just now" for unusable input', () => {
    expect(formatAge(NaN)).toBe('just now');
    expect(formatAge(-1)).toBe('just now');
    expect(formatAge(null)).toBe('just now');
  });
});

describe('describeAge', () => {
  const NOW = 1_700_000_000_000;

  it('reports a live reading with no caveat', () => {
    const result = describeAge(NOW - 60 * 1000, NOW);

    expect(result.isLive).toBe(true);
    // The common case must render nothing. A badge on every reading is a badge
    // nobody reads.
    expect(result.needsCaveat).toBe(false);
    expect(result.label).toBe('Updated just now');
    expect(result.freshness).toBe(FRESHNESS.LIVE);
  });

  it('reports a stale reading with its age', () => {
    const result = describeAge(NOW - 2 * HOUR, NOW);

    expect(result.isLive).toBe(false);
    expect(result.needsCaveat).toBe(true);
    expect(result.label).toBe('Updated 2 hours ago');
    expect(result.freshness).toBe(FRESHNESS.OUTDATED);
  });

  it('computes the age against the supplied clock', () => {
    expect(describeAge(NOW - 45 * MINUTE, NOW).ageMs).toBe(45 * MINUTE);
  });

  it('says the age is unknown rather than guessing', () => {
    for (const bad of [null, undefined, NaN, 'yesterday']) {
      // @ts-expect-error — as above.
      const result = describeAge(bad, NOW);
      expect(result.ageMs).toBeNull();
      expect(result.label).toBe('Age unknown');
      expect(result.needsCaveat).toBe(true);
    }
  });

  it('defaults to the real clock when none is given', () => {
    const result = describeAge(Date.now());
    expect(result.isLive).toBe(true);
  });
});
