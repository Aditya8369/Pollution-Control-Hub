import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Leaderboard from './Leaderboard';
import { eventBus } from '../core/events';
import { REPORTS_KEY, CHALLENGE_POINTS_KEY, QUIZ_ANSWERS_KEY } from '../utils/contributionStats';

function report(status = 'Pending') {
  return { id: crypto.randomUUID(), title: 'Smoke', status, votes: 0 };
}

describe('Leaderboard - the visitor row is real (#671)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts a first-time visitor at zero', () => {
    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-summary')).toHaveTextContent(
      '0 Verified Reports • 0 Submissions • 0 Quizzes Answered'
    );
    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('0 pts');
  });

  it('does not show the old seeded figures', () => {
    render(<Leaderboard />);

    const summary = screen.getByTestId('leaderboard-user-summary');
    expect(summary).not.toHaveTextContent('55 Quizzes');
    expect(summary).not.toHaveTextContent('2 Submissions');
    expect(screen.getByTestId('leaderboard-user-points')).not.toHaveTextContent('125 pts');
  });

  it('reflects reports filed in the Community Hub', () => {
    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify([report('Verified'), report(), report()])
    );

    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-summary')).toHaveTextContent(
      '1 Verified Reports • 3 Submissions'
    );
    // 3 submissions (30) + 1 verified (50)
    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('80 pts');
  });

  it('reflects daily challenge points, which it used to ignore entirely', () => {
    localStorage.setItem(CHALLENGE_POINTS_KEY, '70');

    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('70 pts');
  });

  it('reflects quiz answers', () => {
    localStorage.setItem(QUIZ_ANSWERS_KEY, '25');

    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-summary')).toHaveTextContent(
      '25 Quizzes Answered'
    );
  });

  it('refreshes when a report is submitted while it is open', () => {
    render(<Leaderboard />);
    expect(screen.getByTestId('leaderboard-user-summary')).toHaveTextContent('0 Submissions');

    localStorage.setItem(REPORTS_KEY, JSON.stringify([report()]));
    act(() => {
      eventBus.emit('COMMUNITY_REPORT_SUBMITTED', report());
    });

    expect(screen.getByTestId('leaderboard-user-summary')).toHaveTextContent('1 Submissions');
  });
});

describe('Leaderboard - ranking (#671)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ranks a zero-point visitor last rather than showing #0', () => {
    render(<Leaderboard />);

    // Five sample contributors, so the visitor is sixth.
    expect(screen.getByTestId('leaderboard-user-rank')).toHaveTextContent('#6');
    expect(screen.getByTestId('leaderboard-user-rank')).not.toHaveTextContent('#0');
  });

  it('moves the visitor up as their real total grows', () => {
    localStorage.setItem(CHALLENGE_POINTS_KEY, '500');

    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-rank')).toHaveTextContent('#1');
  });

  it('labels the mock entries as sample data', () => {
    render(<Leaderboard />);

    expect(screen.getAllByText('sample')).toHaveLength(5);
  });

  it('does not label the visitor row as sample', () => {
    render(<Leaderboard />);

    const userRow = screen.getByTestId('leaderboard-user-row');
    expect(userRow).toHaveTextContent('(You)');
    expect(userRow).not.toHaveTextContent('sample');
  });

  it('keys rows on a stable id, so a visitor named after a sample does not collide', () => {
    // Duplicate React keys would drop a row; six rows plus a header must survive.
    render(<Leaderboard />);

    expect(screen.getAllByRole('row')).toHaveLength(7);
  });
});

describe('Leaderboard - the point simulator (#671)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is absent from a production build', () => {
    vi.stubEnv('DEV', false);

    render(<Leaderboard />);

    expect(screen.queryByTestId('leaderboard-dev-tools')).not.toBeInTheDocument();
    expect(screen.queryByText('+50 Verified Report')).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('offers no way to award verified reports that were never filed', () => {
    render(<Leaderboard />);

    expect(screen.queryByText('+50 Verified Report')).not.toBeInTheDocument();
    expect(screen.queryByText('+10 New Report')).not.toBeInTheDocument();
  });
});
