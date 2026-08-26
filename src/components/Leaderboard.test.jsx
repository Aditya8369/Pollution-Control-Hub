import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Leaderboard from './Leaderboard';
import { eventBus } from '../core/events';
import { REPORTS_KEY, CHALLENGE_POINTS_KEY, QUIZ_ANSWERS_KEY } from '../utils/contributionStats';

function report(status = 'Pending') {
  return { id: crypto.randomUUID(), title: 'Smoke', status, votes: 0 };
}

const loginMock = vi.fn();
const logoutMock = vi.fn();
let mockAuthUser = null;
let mockIsAuthenticated = false;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isAuthenticated: mockIsAuthenticated,
    login: (userData) => {
      mockAuthUser = userData;
      mockIsAuthenticated = true;
      loginMock(userData);
    },
    logout: () => {
      mockAuthUser = null;
      mockIsAuthenticated = false;
      logoutMock();
    }
  })
}));

describe('Leaderboard - Guest & Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthUser = null;
    mockIsAuthenticated = false;
    loginMock.mockReset();
    logoutMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders sign in button when unauthenticated', () => {
    render(<Leaderboard />);
    expect(screen.getByTestId('join-leaderboard-btn')).toBeInTheDocument();
  });

  it('opens modal, handles registration, and logs in user', async () => {
    const { rerender } = render(<Leaderboard />);
    
    // Click join button
    fireEvent.click(screen.getByTestId('join-leaderboard-btn'));
    expect(screen.getByTestId('register-modal')).toBeInTheDocument();

    // Fill registration form
    fireEvent.change(screen.getByPlaceholderText('e.g. Aarav Sharma'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. aarav@example.com'), { target: { value: 'jane@example.com' } });
    
    // Choose avatar emoji
    const emojis = screen.getAllByRole('button');
    // find panda button or cycle button
    fireEvent.click(emojis.find(b => b.textContent === '🐼') || emojis[0]);

    // Submit
    fireEvent.click(screen.getByTestId('submit-register'));

    expect(loginMock).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      avatar: '🐼'
    });

    // Re-render to reflect new auth state
    rerender(<Leaderboard />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getByTestId('leaderboard-signout-btn')).toBeInTheDocument();
  });
});

describe('Leaderboard - user row is real', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthUser = null;
    mockIsAuthenticated = false;
  });

  it('starts a first-time visitor at zero', () => {
    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('0 pts');
  });

  it('reflects reports filed in the Community Hub', () => {
    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify([report('Verified'), report(), report()])
    );

    render(<Leaderboard />);

    // 3 submissions (30) + 1 verified (50)
    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('80 pts');
  });

  it('reflects daily challenge points', () => {
    localStorage.setItem(CHALLENGE_POINTS_KEY, '70');

    render(<Leaderboard />);

    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('70 pts');
  });

  it('refreshes when a report is submitted while it is open', () => {
    render(<Leaderboard />);

    localStorage.setItem(REPORTS_KEY, JSON.stringify([report()]));
    act(() => {
      eventBus.emit('COMMUNITY_REPORT_SUBMITTED', report());
    });

    expect(screen.getByTestId('leaderboard-user-points')).toHaveTextContent('10 pts');
  });
});

describe('Leaderboard - ranking', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthUser = null;
    mockIsAuthenticated = false;
  });

  it('ranks a guest visitor last', () => {
    render(<Leaderboard />);

    // Five sample contributors, so guest is #6
    expect(screen.getByTestId('leaderboard-user-rank')).toHaveTextContent('#6');
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
});
