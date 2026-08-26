import { eventBus } from '../core/events';

/**
 * The visitor's own contribution record, derived from what the app actually stored.
 *
 * The leaderboard used to seed a new visitor with `{ points: 125, reports: 2,
 * verified: 1, quizzes: 55 }` and present it, in the first person, as their
 * history. None of it had happened, and none of it could be checked against
 * anything. It also invented a storage key of its own — `pollution-hub-user-points`
 * — that nothing else in the codebase ever wrote to, so real activity elsewhere in
 * the app never moved the total.
 *
 * Everything here reads the keys the rest of the app already maintains.
 */

/** Written by CommunityHub. */
export const REPORTS_KEY = 'pollution-community-reports';
/** Written by ChallengesWidget. */
export const CHALLENGE_POINTS_KEY = 'pollution_hub_total_points';
/** Maintained here, from QUIZ_COMPLETED. Nothing persisted an answer count before. */
export const QUIZ_ANSWERS_KEY = 'pollution-hub-quiz-answers';

/** Emitted when a recorded figure changes, so open views can refresh. */
export const STATS_CHANGED_EVENT = 'CONTRIBUTION_STATS_CHANGED';

/**
 * What each recorded action is worth.
 *
 * A verified report earns the submission points as well — it is still a
 * submission — so a verified report is worth 60, not 50.
 */
export const POINT_VALUES = {
  report: 10,
  verifiedReport: 50,
  quizAnswer: 1,
};

/** @param {string} key */
function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * A non-negative integer from whatever is in storage.
 *
 * @param {any} value
 * @returns {number}
 */
function toCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * The reports CommunityHub has stored locally.
 *
 * Reports are localStorage-only today (see #152), so every report in the store was
 * filed by this visitor. If that changes, this is the place that needs an author
 * filter rather than the component.
 *
 * @returns {any[]}
 */
function readReports() {
  const raw = readRaw(REPORTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Trust ladder for #926, lowest rung first.
 *
 * Derived from the points a visitor has actually earned, like everything else
 * here. A version of this shipped as a hard-coded array of fictional users with
 * fictional email addresses in a shadow `Leaderboard.tsx` — the same mistake
 * this module was written to undo, in a file the bundler never even reached.
 */
export const TRUST_LEVELS = Object.freeze([
  { name: 'Newcomer', minPoints: 0 },
  { name: 'Contributor', minPoints: 50 },
  { name: 'Trusted', minPoints: 200 },
  { name: 'Advanced', minPoints: 500 },
  { name: 'Expert', minPoints: 1000 },
]);

/**
 * Badges, each with the recorded activity that earns it.
 *
 * A badge is a claim about what someone did, so every one of these has to be
 * answerable from the stats. Nothing is awarded for showing up.
 */
export const BADGE_DEFINITIONS = Object.freeze([
  { id: 'first-report', label: 'First Report', icon: '📝', earned: (s) => s.reports >= 1 },
  { id: 'verified-reporter', label: 'Verified Reporter', icon: '🛡️', earned: (s) => s.verified >= 1 },
  { id: 'first-responder', label: 'First Responder', icon: '🚨', earned: (s) => s.reports >= 5 },
  { id: 'learner', label: 'Learner', icon: '🧠', earned: (s) => s.quizzes >= 10 },
  { id: 'scholar', label: 'Scholar', icon: '🎓', earned: (s) => s.quizzes >= 50 },
  { id: 'challenger', label: 'Challenger', icon: '🏅', earned: (s) => s.challengePoints >= 100 },
]);

/**
 * The highest trust level a points total reaches.
 *
 * @param {number} points
 * @returns {string}
 */
export function trustLevelForPoints(points) {
  const total = Number.isFinite(points) ? points : 0;
  let current = TRUST_LEVELS[0].name;
  for (const level of TRUST_LEVELS) {
    if (total >= level.minPoints) current = level.name;
  }
  return current;
}

/**
 * The next rung, and how far away it is. Null once the top has been reached.
 *
 * @param {number} points
 * @returns {{name: string, pointsAway: number} | null}
 */
export function nextTrustLevel(points) {
  const total = Number.isFinite(points) ? points : 0;
  const next = TRUST_LEVELS.find((level) => total < level.minPoints);
  return next ? { name: next.name, pointsAway: next.minPoints - total } : null;
}

/**
 * The badges a set of stats has earned.
 *
 * @param {{reports: number, verified: number, quizzes: number, challengePoints: number}} stats
 * @returns {{id: string, label: string, icon: string}[]}
 */
export function earnedBadges(stats) {
  const safe = {
    reports: toCount(stats?.reports),
    verified: toCount(stats?.verified),
    quizzes: toCount(stats?.quizzes),
    challengePoints: toCount(stats?.challengePoints),
  };
  return BADGE_DEFINITIONS.filter((badge) => badge.earned(safe))
    .map(({ id, label, icon }) => ({ id, label, icon }));
}

/**
 * @typedef {Object} ContributionStats
 * @property {number} reports - Reports submitted.
 * @property {number} verified - Of those, how many reached a verified status.
 * @property {number} quizzes - Quiz questions answered.
 * @property {number} challengePoints - Points earned from daily challenges.
 * @property {number} points - The weighted total.
 * @property {string} trustLevel - Trust rung the total has reached.
 * @property {{id: string, label: string, icon: string}[]} badges - Badges earned.
 */

/**
 * The visitor's stats, derived fresh from storage.
 *
 * Derived rather than accumulated: a stored total can drift from the activity it
 * is meant to summarise, and there is no way to tell once it has.
 *
 * @returns {ContributionStats}
 */
export function readContributionStats() {
  const reports = readReports();
  const reportCount = reports.length;
  const verifiedCount = reports.filter(
    (report) => typeof report?.status === 'string' && report.status.startsWith('Verified')
  ).length;

  const quizzes = toCount(readRaw(QUIZ_ANSWERS_KEY));
  const challengePoints = toCount(readRaw(CHALLENGE_POINTS_KEY));

  const points =
    reportCount * POINT_VALUES.report +
    verifiedCount * POINT_VALUES.verifiedReport +
    quizzes * POINT_VALUES.quizAnswer +
    challengePoints;

  const base = { reports: reportCount, verified: verifiedCount, quizzes, challengePoints, points };

  return {
    ...base,
    trustLevel: trustLevelForPoints(points),
    badges: earnedBadges(base),
  };
}

/**
 * Adds to the running count of quiz questions answered.
 *
 * @param {number} count
 * @returns {number} The new total.
 */
export function recordQuizAnswers(count) {
  const delta = toCount(count);
  const total = toCount(readRaw(QUIZ_ANSWERS_KEY)) + delta;

  if (delta > 0) {
    writeRaw(QUIZ_ANSWERS_KEY, String(total));
    eventBus.emit(STATS_CHANGED_EVENT, readContributionStats());
  }

  return total;
}

/** @param {any} payload */
function handleQuizCompleted(payload) {
  // `total` is the number of questions in the quiz, all of which were answered by
  // the time the completion event fires. `score` is how many were right, which is
  // not what the leaderboard counts.
  recordQuizAnswers(payload?.total);
}

function handleReportSubmitted() {
  eventBus.emit(STATS_CHANGED_EVENT, readContributionStats());
}

let tracking = false;

/**
 * Subscribes to the events that change the stats. Safe to call more than once.
 */
export function initContributionTracking() {
  if (tracking) return;
  tracking = true;

  eventBus.on('QUIZ_COMPLETED', handleQuizCompleted);
  eventBus.on('COMMUNITY_REPORT_SUBMITTED', handleReportSubmitted);
}

// Self-register on first import, matching achievementsStore, so no extra wiring is
// needed. App.jsx imports this for its side effect: a quiz can be completed
// without the leaderboard ever having been mounted.
initContributionTracking();
