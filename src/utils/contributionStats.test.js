import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readContributionStats,
  recordQuizAnswers,
  initContributionTracking,
  POINT_VALUES,
  REPORTS_KEY,
  CHALLENGE_POINTS_KEY,
  QUIZ_ANSWERS_KEY,
  STATS_CHANGED_EVENT,
} from './contributionStats';
import { eventBus } from '../core/events';

/** A stored report in CommunityHub's shape. */
function report(status = 'Pending') {
  return { id: crypto.randomUUID(), title: 'Smoke', status, votes: 0 };
}

describe('readContributionStats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts a new visitor at zero, not at the old seeded figures', () => {
    expect(readContributionStats()).toEqual({
      reports: 0,
      verified: 0,
      quizzes: 0,
      challengePoints: 0,
      points: 0,
    });
  });

  it('counts reports from the store CommunityHub writes to', () => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([report(), report(), report()]));

    const stats = readContributionStats();
    expect(stats.reports).toBe(3);
    expect(stats.points).toBe(3 * POINT_VALUES.report);
  });

  it('counts verified reports as verified and as submissions', () => {
    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify([report('Verified'), report('Pending')])
    );

    const stats = readContributionStats();
    expect(stats.reports).toBe(2);
    expect(stats.verified).toBe(1);
    expect(stats.points).toBe(2 * POINT_VALUES.report + POINT_VALUES.verifiedReport);
  });

  it('recognises the suffixed verified statuses CommunityHub produces', () => {
    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify([report('Verified via consensus'), report('Addressed')])
    );

    expect(readContributionStats().verified).toBe(1);
  });

  it('includes daily challenge points', () => {
    localStorage.setItem(CHALLENGE_POINTS_KEY, '40');
    expect(readContributionStats()).toMatchObject({ challengePoints: 40, points: 40 });
  });

  it('counts quiz answers', () => {
    localStorage.setItem(QUIZ_ANSWERS_KEY, '12');
    expect(readContributionStats()).toMatchObject({
      quizzes: 12,
      points: 12 * POINT_VALUES.quizAnswer,
    });
  });

  it('adds every source into one total', () => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([report('Verified'), report()]));
    localStorage.setItem(QUIZ_ANSWERS_KEY, '7');
    localStorage.setItem(CHALLENGE_POINTS_KEY, '30');

    expect(readContributionStats().points).toBe(
      2 * POINT_VALUES.report + POINT_VALUES.verifiedReport + 7 * POINT_VALUES.quizAnswer + 30
    );
  });

  it.each([
    ['not json', 'corrupt'],
    ['{}', 'an object rather than an array'],
    ['null', 'null'],
  ])('treats %s report storage (%s) as no reports', (raw) => {
    localStorage.setItem(REPORTS_KEY, raw);
    expect(readContributionStats().reports).toBe(0);
  });

  it.each([
    ['NaN', 'a stringified NaN'],
    ['-5', 'a negative count'],
    ['abc', 'junk'],
  ])('treats %s (%s) as zero', (raw) => {
    localStorage.setItem(QUIZ_ANSWERS_KEY, raw);
    localStorage.setItem(CHALLENGE_POINTS_KEY, raw);

    const stats = readContributionStats();
    expect(stats.quizzes).toBe(0);
    expect(stats.points).toBe(0);
  });

  it('never returns NaN points', () => {
    localStorage.setItem(CHALLENGE_POINTS_KEY, 'NaN');
    expect(Number.isFinite(readContributionStats().points)).toBe(true);
  });

  it('survives localStorage throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => readContributionStats()).not.toThrow();
    expect(readContributionStats().points).toBe(0);

    vi.restoreAllMocks();
  });
});

describe('recordQuizAnswers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accumulates across calls', () => {
    recordQuizAnswers(5);
    recordQuizAnswers(3);
    expect(readContributionStats().quizzes).toBe(8);
  });

  it('ignores a zero, negative or non-numeric count', () => {
    recordQuizAnswers(0);
    recordQuizAnswers(-4);
    recordQuizAnswers('abc');
    expect(readContributionStats().quizzes).toBe(0);
  });

  it('announces the change', () => {
    const seen = [];
    const listener = (payload) => seen.push(payload);
    eventBus.on(STATS_CHANGED_EVENT, listener);

    try {
      recordQuizAnswers(4);
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ quizzes: 4 });
    } finally {
      eventBus.off(STATS_CHANGED_EVENT, listener);
    }
  });
});

describe('quiz tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    initContributionTracking();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('records every question answered, not just the correct ones', () => {
    // A 10-question quiz scored 3/10 is still 10 answers.
    eventBus.emit('QUIZ_COMPLETED', { quizId: 'basics', score: 3, total: 10, percent: 30 });

    expect(readContributionStats().quizzes).toBe(10);
  });

  it('accumulates over several quizzes', () => {
    eventBus.emit('QUIZ_COMPLETED', { quizId: 'a', score: 5, total: 5, percent: 100 });
    eventBus.emit('QUIZ_COMPLETED', { quizId: 'b', score: 2, total: 8, percent: 25 });

    expect(readContributionStats().quizzes).toBe(13);
  });

  it('ignores a malformed payload', () => {
    eventBus.emit('QUIZ_COMPLETED', null);
    eventBus.emit('QUIZ_COMPLETED', {});
    eventBus.emit('QUIZ_COMPLETED', { total: 'lots' });

    expect(readContributionStats().quizzes).toBe(0);
  });

  it('subscribes only once however often init is called', () => {
    initContributionTracking();
    initContributionTracking();

    eventBus.emit('QUIZ_COMPLETED', { quizId: 'a', score: 1, total: 4, percent: 25 });

    expect(readContributionStats().quizzes).toBe(4);
  });
});
