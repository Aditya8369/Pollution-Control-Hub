import { describe, it, expect, beforeEach } from 'vitest';
import {
  TRUST_LEVELS,
  BADGE_DEFINITIONS,
  trustLevelForPoints,
  nextTrustLevel,
  earnedBadges,
  readContributionStats,
  REPORTS_KEY,
  QUIZ_ANSWERS_KEY,
  CHALLENGE_POINTS_KEY,
} from './contributionStats';

/**
 * Coverage for the reputation ladder from #926.
 *
 * It arrived as a hard-coded array of fictional users inside a
 * `Leaderboard.tsx` that the bundler never resolved (#990). The concept is kept
 * here, derived from recorded activity, which is the rule the rest of this
 * module already follows.
 */
describe('trust levels', () => {
  it('lists rungs in ascending order with no duplicate thresholds', () => {
    const thresholds = TRUST_LEVELS.map((level) => level.minPoints);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  it('starts at zero, so every visitor has a level', () => {
    expect(TRUST_LEVELS[0].minPoints).toBe(0);
    expect(trustLevelForPoints(0)).toBe('Newcomer');
  });

  it('is frozen, so a caller cannot redefine the ladder at runtime', () => {
    expect(Object.isFrozen(TRUST_LEVELS)).toBe(true);
    expect(Object.isFrozen(BADGE_DEFINITIONS)).toBe(true);
  });

  it.each([
    [0, 'Newcomer'],
    [49, 'Newcomer'],
    [50, 'Contributor'],
    [199, 'Contributor'],
    [200, 'Trusted'],
    [499, 'Trusted'],
    [500, 'Advanced'],
    [999, 'Advanced'],
    [1000, 'Expert'],
    [50000, 'Expert'],
  ])('puts %i points at %s', (points, expected) => {
    expect(trustLevelForPoints(points)).toBe(expected);
  });

  it('treats junk as zero rather than returning undefined', () => {
    for (const junk of [NaN, undefined, null, 'lots']) {
      // @ts-ignore - deliberately wrong types
      expect(trustLevelForPoints(junk)).toBe('Newcomer');
    }
  });

  it('reports the next rung and the distance to it', () => {
    expect(nextTrustLevel(0)).toEqual({ name: 'Contributor', pointsAway: 50 });
    expect(nextTrustLevel(49)).toEqual({ name: 'Contributor', pointsAway: 1 });
    expect(nextTrustLevel(50)).toEqual({ name: 'Trusted', pointsAway: 150 });
  });

  it('reports no next rung once the top is reached', () => {
    expect(nextTrustLevel(1000)).toBeNull();
    expect(nextTrustLevel(9999)).toBeNull();
  });

  it('never reports a non-positive distance to the next rung', () => {
    for (let points = 0; points < 1200; points += 7) {
      const next = nextTrustLevel(points);
      if (next) expect(next.pointsAway).toBeGreaterThan(0);
    }
  });
});

describe('badges', () => {
  const nothing = { reports: 0, verified: 0, quizzes: 0, challengePoints: 0 };

  it('awards nothing to a visitor who has done nothing', () => {
    expect(earnedBadges(nothing)).toEqual([]);
  });

  it('awards the first report badge on the first report', () => {
    const badges = earnedBadges({ ...nothing, reports: 1 }).map((badge) => badge.id);
    expect(badges).toContain('first-report');
    expect(badges).not.toContain('first-responder');
  });

  it('awards the first responder badge at five reports', () => {
    expect(earnedBadges({ ...nothing, reports: 4 }).map((b) => b.id)).not.toContain('first-responder');
    expect(earnedBadges({ ...nothing, reports: 5 }).map((b) => b.id)).toContain('first-responder');
  });

  it('awards the verified reporter badge only for a verified report', () => {
    expect(earnedBadges({ ...nothing, reports: 9 }).map((b) => b.id)).not.toContain('verified-reporter');
    expect(earnedBadges({ ...nothing, reports: 9, verified: 1 }).map((b) => b.id)).toContain('verified-reporter');
  });

  it('awards learner then scholar as quiz answers accumulate', () => {
    expect(earnedBadges({ ...nothing, quizzes: 9 }).map((b) => b.id)).toEqual([]);
    expect(earnedBadges({ ...nothing, quizzes: 10 }).map((b) => b.id)).toEqual(['learner']);
    expect(earnedBadges({ ...nothing, quizzes: 50 }).map((b) => b.id)).toEqual(['learner', 'scholar']);
  });

  it('awards the challenger badge from challenge points', () => {
    expect(earnedBadges({ ...nothing, challengePoints: 100 }).map((b) => b.id)).toContain('challenger');
  });

  it('returns a label and an icon with every badge, so nothing renders blank', () => {
    for (const badge of earnedBadges({ reports: 99, verified: 99, quizzes: 99, challengePoints: 999 })) {
      expect(badge.label).toBeTruthy();
      expect(badge.icon).toBeTruthy();
    }
  });

  it('awards every defined badge to a maximal contributor', () => {
    const all = earnedBadges({ reports: 99, verified: 99, quizzes: 99, challengePoints: 999 });
    expect(all).toHaveLength(BADGE_DEFINITIONS.length);
  });

  it('treats missing or malformed stats as zero rather than throwing', () => {
    expect(earnedBadges(undefined)).toEqual([]);
    // @ts-ignore - deliberately wrong types
    expect(earnedBadges({})).toEqual([]);
    // @ts-ignore - deliberately wrong types
    expect(earnedBadges({ reports: 'many', quizzes: -4 })).toEqual([]);
  });
});

describe('readContributionStats reputation fields', () => {
  beforeEach(() => localStorage.clear());

  it('gives a visitor with no history the bottom rung and no badges', () => {
    const stats = readContributionStats();
    expect(stats.points).toBe(0);
    expect(stats.trustLevel).toBe('Newcomer');
    expect(stats.badges).toEqual([]);
  });

  it('derives the level and badges from what was actually recorded', () => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([
      { id: '1', title: 'a', status: 'Verified (community)' },
      { id: '2', title: 'b', status: 'New' },
      { id: '3', title: 'c', status: 'New' },
    ]));
    localStorage.setItem(QUIZ_ANSWERS_KEY, '20');
    localStorage.setItem(CHALLENGE_POINTS_KEY, '120');

    const stats = readContributionStats();

    // 3 reports (30) + 1 verified (50) + 20 quiz answers (20) + 120 challenge
    expect(stats.points).toBe(220);
    expect(stats.trustLevel).toBe('Trusted');

    const badges = stats.badges.map((badge) => badge.id);
    expect(badges).toContain('first-report');
    expect(badges).toContain('verified-reporter');
    expect(badges).toContain('learner');
    expect(badges).toContain('challenger');
    expect(badges).not.toContain('first-responder'); // only 3 reports
    expect(badges).not.toContain('scholar');         // only 20 quiz answers
  });

  it('agrees with the standalone helpers, so the panel cannot drift from them', () => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([{ id: '1', status: 'New' }]));

    const stats = readContributionStats();
    expect(stats.trustLevel).toBe(trustLevelForPoints(stats.points));
    expect(stats.badges).toEqual(earnedBadges(stats));
  });
});
