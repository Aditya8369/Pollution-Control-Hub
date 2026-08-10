import { describe, it, expect, afterEach } from 'vitest';
import { nextStreak, normaliseStoredStreak } from './checkInStreak';
import { localDayKey } from './localDay';

describe('normaliseStoredStreak', () => {
  it('reads a numeric string', () => {
    expect(normaliseStoredStreak('7')).toBe(7);
  });

  it('reads a number', () => {
    expect(normaliseStoredStreak(7)).toBe(7);
  });

  it.each([
    ['NaN', 'the string a previous run of this bug persisted'],
    ['', 'empty'],
    ['abc', 'junk'],
    [null, 'absent'],
    [undefined, 'absent'],
    [-3, 'negative'],
    [NaN, 'NaN'],
  ])('returns 0 for %s (%s)', (value) => {
    expect(normaliseStoredStreak(value)).toBe(0);
  });

  it('floors a fractional value', () => {
    expect(normaliseStoredStreak('3.9')).toBe(3);
  });
});

/**
 * The transition table for #669. The two headline cases are "same day twice" —
 * which the UTC-keyed version scored as two different days for anyone in the
 * Americas after ~19:00 local — and a stored date in the future, which
 * `Math.abs(today - lastDate)` scored identically to yesterday.
 */
describe('nextStreak', () => {
  it('starts at 1 with no history', () => {
    expect(nextStreak(null, '2026-08-10', null)).toEqual({ streak: 1, changed: true });
  });

  it('increments after a check-in yesterday', () => {
    expect(nextStreak('2026-08-09', '2026-08-10', '4')).toEqual({
      streak: 5,
      changed: true,
    });
  });

  it('does not increment twice on the same local day', () => {
    expect(nextStreak('2026-08-10', '2026-08-10', '4')).toEqual({
      streak: 4,
      changed: false,
    });
  });

  it('resets after a missed day', () => {
    expect(nextStreak('2026-08-08', '2026-08-10', '9')).toEqual({
      streak: 1,
      changed: true,
    });
  });

  it('resets after a long gap', () => {
    expect(nextStreak('2025-01-01', '2026-08-10', '40')).toEqual({
      streak: 1,
      changed: true,
    });
  });

  it('resets rather than rewards a stored date in the future', () => {
    // The old Math.abs() gave this the same diff as yesterday and incremented.
    expect(nextStreak('2026-08-11', '2026-08-10', '4')).toEqual({
      streak: 1,
      changed: true,
    });
  });

  it('resets on an unreadable stored date', () => {
    expect(nextStreak('not-a-date', '2026-08-10', '4')).toEqual({
      streak: 1,
      changed: true,
    });
    expect(nextStreak('2026-02-31', '2026-08-10', '4')).toEqual({
      streak: 1,
      changed: true,
    });
  });

  it('never yields NaN from a corrupt stored count', () => {
    const { streak } = nextStreak('2026-08-09', '2026-08-10', 'NaN');
    expect(Number.isFinite(streak)).toBe(true);
    expect(streak).toBe(1);
  });

  it('shows at least 1 when today is already recorded but the count is missing', () => {
    expect(nextStreak('2026-08-10', '2026-08-10', null)).toEqual({
      streak: 1,
      changed: false,
    });
  });

  it('leaves storage alone when today cannot be determined', () => {
    expect(nextStreak('2026-08-09', null, '4').changed).toBe(false);
  });

  it('crosses month and year boundaries', () => {
    expect(nextStreak('2026-08-31', '2026-09-01', '3').streak).toBe(4);
    expect(nextStreak('2026-12-31', '2027-01-01', '3').streak).toBe(4);
  });

  /**
   * The composed behaviour, against the timezone the bug is worst in. An evening
   * user in New York crossed the UTC date boundary between two visits on the same
   * evening, and the old code read that as two consecutive days.
   */
  describe('an evening user in New York', () => {
    const originalTZ = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTZ;
    });

    it('does not gain two days from two visits in one evening', () => {
      process.env.TZ = 'America/New_York';

      const sixPM = new Date(Date.UTC(2026, 7, 10, 22, 0));      // Mon 18:00 local
      const halfNine = new Date(Date.UTC(2026, 7, 11, 1, 30));   // Mon 21:30 local

      let last = '2026-08-09';
      let streak = 4;

      for (const visit of [sixPM, halfNine]) {
        const result = nextStreak(last, localDayKey(visit), streak);
        streak = result.streak;
        if (result.changed) last = localDayKey(visit);
      }

      expect(streak).toBe(5);
      expect(last).toBe('2026-08-10');
    });

    it('still advances on the following evening', () => {
      process.env.TZ = 'America/New_York';

      const monEvening = new Date(Date.UTC(2026, 7, 11, 1, 30)); // Mon 21:30 local
      const tueEvening = new Date(Date.UTC(2026, 7, 12, 1, 30)); // Tue 21:30 local

      let last = null;
      let streak = 0;

      for (const visit of [monEvening, tueEvening]) {
        const result = nextStreak(last, localDayKey(visit), streak);
        streak = result.streak;
        if (result.changed) last = localDayKey(visit);
      }

      expect(streak).toBe(2);
    });
  });

  it('advances one per day over a run, and only once per day', () => {
    const days = [
      '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09',
      '2026-08-10', '2026-08-11',
    ];

    let last = null;
    let streak = 0;

    for (const day of days) {
      // Two visits on each day; the second must not count.
      for (let visit = 0; visit < 2; visit++) {
        const result = nextStreak(last, day, streak);
        streak = result.streak;
        if (result.changed) last = day;
      }
    }

    expect(streak).toBe(7);
  });
});
