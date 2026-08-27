import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Leaderboard from './Leaderboard';
import { eventBus } from '../core/events';
import {
  CHALLENGE_POINTS_KEY,
  REPORTS_KEY,
  STATS_CHANGED_EVENT,
  TRUST_LEVELS,
} from '../utils/contributionStats';

/**
 * Cover for #1051.
 *
 * The panel read a free variable `nextLevel` that nothing declared, so every
 * render threw `ReferenceError: nextLevel is not defined` and the whole
 * Leaderboard section blanked out. There is no error boundary above it.
 *
 * These assert the rendered sentence rather than the helper — `nextTrustLevel`
 * already has its own tests, and what broke was the wiring between the two.
 */

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: () => {},
    logout: () => {},
  }),
}));

/** @param {number} points */
function seedChallengePoints(points) {
  localStorage.setItem(CHALLENGE_POINTS_KEY, String(points));
}

describe('Leaderboard — trust level progress (#1051)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders without throwing', () => {
    expect(() => render(<Leaderboard />)).not.toThrow();
  });

  it('names the next rung and the gap to it for a visitor with no activity', () => {
    render(<Leaderboard />);

    const line = screen.getByTestId('leaderboard-user-trust');
    expect(line).toHaveTextContent('Newcomer');
    // Contributor is the second rung, at 50 points.
    expect(line).toHaveTextContent('50 pts to Contributor');
  });

  it('counts the gap from the points actually earned', () => {
    seedChallengePoints(120);

    render(<Leaderboard />);

    const line = screen.getByTestId('leaderboard-user-trust');
    // 120 points clears Contributor (50) but not Trusted (200).
    expect(line).toHaveTextContent('Contributor');
    expect(line).toHaveTextContent('80 pts to Trusted');
  });

  it('says the top has been reached rather than naming a rung that does not exist', () => {
    const top = TRUST_LEVELS[TRUST_LEVELS.length - 1];
    seedChallengePoints(top.minPoints + 500);

    render(<Leaderboard />);

    const line = screen.getByTestId('leaderboard-user-trust');
    expect(line).toHaveTextContent(top.name);
    expect(line).toHaveTextContent('top level reached');
    expect(line).not.toHaveTextContent('pts to');
  });

  it('recomputes when the recorded stats change', async () => {
    render(<Leaderboard />);
    expect(screen.getByTestId('leaderboard-user-trust')).toHaveTextContent(
      '50 pts to Contributor'
    );

    // Five reports at 10 points each. The panel refreshes off the event rather
    // than re-reading on an interval, so the derived rung has to follow it.
    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(
        Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, title: 'Smoke', status: 'Pending' }))
      )
    );

    await act(async () => {
      eventBus.emit(STATS_CHANGED_EVENT);
    });

    // 5 x 10 = 50 points, which is exactly the Contributor threshold.
    const line = screen.getByTestId('leaderboard-user-trust');
    expect(line).toHaveTextContent('Contributor');
    expect(line).toHaveTextContent('150 pts to Trusted');
  });
});
