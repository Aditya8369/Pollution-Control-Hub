import { describe, it, expect, afterEach, vi } from 'vitest';
import { localDayKey, isDayKey, daysBetweenDayKeys, formatReportTimestamp } from './localDay';

/**
 * Regression cover for #669. The distinguishing property is that these must
 * disagree with `toISOString().split('T')[0]` at the hours where the UTC date and
 * the local date differ — that disagreement is the entire fix.
 */
describe('localDayKey', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats a date as YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 7, 10, 12, 0, 0))).toBe('2026-08-10');
  });

  it('zero-pads single-digit months and days', () => {
    expect(localDayKey(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
  });

  it('uses the local date at times when it differs from the UTC date', () => {
    // 23:30 local on the 10th. Anywhere east of UTC this is already the 11th in
    // UTC; anywhere west, 00:30 local on the 11th is still the 10th in UTC. Either
    // way the local answer is the one on the user's wall calendar.
    const lateEvening = new Date(2026, 7, 10, 23, 30, 0);
    expect(localDayKey(lateEvening)).toBe('2026-08-10');
    expect(localDayKey(lateEvening)).toBe(
      `${lateEvening.getFullYear()}-${String(lateEvening.getMonth() + 1).padStart(2, '0')}-${String(lateEvening.getDate()).padStart(2, '0')}`
    );
  });

  it('does not change across a local day, and does change across local midnight', () => {
    const key = (h, m = 0) => localDayKey(new Date(2026, 7, 10, h, m));
    expect(key(0, 1)).toBe('2026-08-10');
    expect(key(12)).toBe('2026-08-10');
    expect(key(23, 59)).toBe('2026-08-10');
    expect(localDayKey(new Date(2026, 7, 11, 0, 0))).toBe('2026-08-11');
  });

  it('defaults to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 8, 0, 0));
    expect(localDayKey()).toBe('2026-03-01');
  });

  it('returns null for an invalid date', () => {
    expect(localDayKey(new Date('nonsense'))).toBeNull();
  });
});

/**
 * The two scenarios from #669, reproduced against real timezones. These are the
 * cases where `toISOString().split('T')[0]` and the user's wall calendar disagree,
 * which is the whole reason the helper exists.
 */
describe('localDayKey vs the UTC date it replaces', () => {
  const originalTZ = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it('keeps a New York evening on the same day (UTC has already rolled over)', () => {
    process.env.TZ = 'America/New_York';
    // 21:30 on Monday the 10th, local. UTC is already Tuesday the 11th.
    const instant = new Date(Date.UTC(2026, 7, 11, 1, 30));

    expect(instant.getHours()).toBe(21);
    expect(instant.toISOString().split('T')[0]).toBe('2026-08-11'); // the old key
    expect(localDayKey(instant)).toBe('2026-08-10'); // the wall calendar
  });

  it('treats 18:00 and 21:30 in New York as one day, not two', () => {
    process.env.TZ = 'America/New_York';
    const sixPM = new Date(Date.UTC(2026, 7, 10, 22, 0));
    const halfNine = new Date(Date.UTC(2026, 7, 11, 1, 30));

    // The defect: these produced two different UTC dates, so the streak advanced
    // twice within a single evening.
    expect(sixPM.toISOString().split('T')[0]).not.toBe(
      halfNine.toISOString().split('T')[0]
    );
    expect(localDayKey(sixPM)).toBe(localDayKey(halfNine));
  });

  it('counts the small hours in India as the new day (UTC has not rolled over)', () => {
    process.env.TZ = 'Asia/Kolkata';
    // 03:00 on Tuesday the 11th, local. UTC is still Monday the 10th.
    const instant = new Date(Date.UTC(2026, 7, 10, 21, 30));

    expect(instant.getHours()).toBe(3);
    expect(instant.toISOString().split('T')[0]).toBe('2026-08-10'); // the old key
    expect(localDayKey(instant)).toBe('2026-08-11'); // the wall calendar
  });
});

describe('isDayKey', () => {
  it('accepts a well-formed key', () => {
    expect(isDayKey('2026-08-10')).toBe(true);
    expect(isDayKey('2024-02-29')).toBe(true); // leap year
  });

  it.each([
    ['2026-8-10', 'unpadded month'],
    ['10-08-2026', 'wrong order'],
    ['2026-08-10T00:00:00Z', 'full timestamp'],
    ['2026-02-31', 'impossible date'],
    ['2025-02-29', 'not a leap year'],
    ['2026-13-01', 'month 13'],
    ['', 'empty'],
    ['undefined', 'stringified undefined'],
  ])('rejects %s (%s)', (value) => {
    expect(isDayKey(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isDayKey(null)).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
    expect(isDayKey(20260810)).toBe(false);
    expect(isDayKey(new Date())).toBe(false);
  });
});

describe('daysBetweenDayKeys', () => {
  it('counts consecutive days as 1', () => {
    expect(daysBetweenDayKeys('2026-08-10', '2026-08-11')).toBe(1);
  });

  it('returns 0 for the same day', () => {
    expect(daysBetweenDayKeys('2026-08-10', '2026-08-10')).toBe(0);
  });

  it('is negative when the second key is earlier', () => {
    expect(daysBetweenDayKeys('2026-08-11', '2026-08-10')).toBe(-1);
  });

  it('crosses month and year boundaries', () => {
    expect(daysBetweenDayKeys('2026-08-31', '2026-09-01')).toBe(1);
    expect(daysBetweenDayKeys('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetweenDayKeys('2024-02-28', '2024-02-29')).toBe(1);
  });

  it('stays exact across a DST transition', () => {
    // US spring forward 2026-03-08 (23h local day) and fall back 2026-11-01 (25h).
    // A local-midnight anchor would give 0.958 and 1.042 days here.
    expect(daysBetweenDayKeys('2026-03-08', '2026-03-09')).toBe(1);
    expect(daysBetweenDayKeys('2026-11-01', '2026-11-02')).toBe(1);
    expect(daysBetweenDayKeys('2026-03-07', '2026-03-10')).toBe(3);
  });

  it('returns null when either key is malformed', () => {
    expect(daysBetweenDayKeys('nope', '2026-08-10')).toBeNull();
    expect(daysBetweenDayKeys('2026-08-10', 'nope')).toBeNull();
    expect(daysBetweenDayKeys(null, undefined)).toBeNull();
  });
});

/**
 * Regression cover for #745.
 *
 * Reports were displayed in UTC because nothing passed an explicit timezone to
 * the formatter.  formatReportTimestamp accepts an IANA string and uses
 * Intl.DateTimeFormat so the output matches the user's local wall clock
 * regardless of the environment's system timezone.
 */
describe('formatReportTimestamp', () => {
  // 2026-08-26T00:00:00Z is the anchor used in all assertions.
  // At this instant:
  //   IST  (UTC+5:30) => 2026-08-26, 05:30
  //   UTC  (UTC+0)    => 2026-08-26, 00:00
  //   NYC  (UTC-4 EDT)=> 2026-08-25, 20:00
  //   Tokyo(UTC+9)    => 2026-08-26, 09:00
  const UTC_MIDNIGHT = '2026-08-26T00:00:00Z';

  it('renders the correct local time for IST (UTC+5:30)', () => {
    const result = formatReportTimestamp(UTC_MIDNIGHT, 'Asia/Kolkata');
    // en-CA format: "YYYY-MM-DD, HH:MM"
    expect(result).toBe('2026-08-26, 05:30');
  });

  it('renders the correct local time for Tokyo (UTC+9)', () => {
    const result = formatReportTimestamp(UTC_MIDNIGHT, 'Asia/Tokyo');
    expect(result).toBe('2026-08-26, 09:00');
  });

  it('renders the correct local time for New York (UTC-4 in summer)', () => {
    // New York observes EDT (UTC-4) in late August.
    const result = formatReportTimestamp(UTC_MIDNIGHT, 'America/New_York');
    expect(result).toBe('2026-08-25, 20:00');
  });

  it('renders UTC correctly when timeZone is explicitly UTC', () => {
    const result = formatReportTimestamp(UTC_MIDNIGHT, 'UTC');
    expect(result).toBe('2026-08-26, 00:00');
  });

  it('does not throw and returns a string when no timeZone is supplied', () => {
    // We cannot assert an exact value here because the result depends on the
    // runtime's local timezone, but it must be a non-empty string.
    const result = formatReportTimestamp(UTC_MIDNIGHT);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns null for an empty string', () => {
    expect(formatReportTimestamp('')).toBeNull();
  });

  it('returns null for a non-string input', () => {
    expect(formatReportTimestamp(null)).toBeNull();
    expect(formatReportTimestamp(undefined)).toBeNull();
    expect(formatReportTimestamp(12345)).toBeNull();
  });

  it('returns null for an invalid date string', () => {
    expect(formatReportTimestamp('not-a-date')).toBeNull();
    expect(formatReportTimestamp('2026-99-99T00:00:00Z')).toBeNull();
  });

  it('does not throw for an unrecognised IANA timezone — falls back gracefully', () => {
    // Should not throw; falls back to local time rendering.
    expect(() => formatReportTimestamp(UTC_MIDNIGHT, 'Nowhere/Fake')).not.toThrow();
    const result = formatReportTimestamp(UTC_MIDNIGHT, 'Nowhere/Fake');
    expect(typeof result).toBe('string');
  });

  it('is not affected by the surrounding process.env.TZ', () => {
    // Explicit timeZone arg must win over whatever the OS/Node timezone is.
    const saved = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles'; // UTC-7 in summer
    try {
      expect(formatReportTimestamp(UTC_MIDNIGHT, 'Asia/Tokyo')).toBe('2026-08-26, 09:00');
    } finally {
      process.env.TZ = saved;
    }
  });
});
