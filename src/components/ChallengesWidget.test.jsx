import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ChallengesWidget from './ChallengesWidget';

describe('ChallengesWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders a challenge and points', () => {
    render(<ChallengesWidget />);
    
    expect(screen.getByText('🌱 Daily Challenge')).toBeInTheDocument();
    
    const pointsEl = screen.getByTestId('challenge-points');
    expect(pointsEl).toHaveTextContent('0');
    
    const markCompleteBtn = screen.getByRole('button', { name: /mark complete/i });
    expect(markCompleteBtn).toBeInTheDocument();
  });

  it('completing a challenge updates UI and points', () => {
    render(<ChallengesWidget />);
    
    const markCompleteBtn = screen.getByRole('button', { name: /mark complete/i });
    fireEvent.click(markCompleteBtn);
    
    expect(screen.getByText('✔ Challenge Completed')).toBeInTheDocument();
    
    const pointsEl = screen.getByTestId('challenge-points');
    expect(pointsEl).toHaveTextContent('10');
  });

  it('preserves challenge state across rerenders for the same day', () => {
    // Initial render and complete
    const { unmount } = render(<ChallengesWidget />);
    const markCompleteBtn = screen.getByRole('button', { name: /mark complete/i });
    fireEvent.click(markCompleteBtn);
    unmount();

    // Re-render, should still be completed and have 10 points
    render(<ChallengesWidget />);
    expect(screen.getByText('✔ Challenge Completed')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-points')).toHaveTextContent('10');
  });

  it('assigns a new challenge and resets completion on a new day', () => {
    // Simulate completing a challenge yesterday
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    localStorage.setItem("pollution_hub_daily_challenge", JSON.stringify({
      currentChallenge: "Test challenge",
      assignedDate: yesterday,
      completed: true
    }));
    localStorage.setItem("pollution_hub_total_points", "50");

    render(<ChallengesWidget />);
    
    // Should reset completion status for the new day
    const markCompleteBtn = screen.getByRole('button', { name: /mark complete/i });
    expect(markCompleteBtn).toBeInTheDocument();
    expect(screen.queryByText('✔ Challenge Completed')).not.toBeInTheDocument();
    
    // Should still have points from yesterday
    expect(screen.getByTestId('challenge-points')).toHaveTextContent('50');
  });
});
