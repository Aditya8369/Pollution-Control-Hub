import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChallengesWidget from './ChallengesWidget';
import { eventBus } from '../core/events';

describe('ChallengesWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders tabs and challenge points', () => {
    render(<ChallengesWidget />);
    
    expect(screen.getByText('🌱 Eco Challenges')).toBeInTheDocument();
    expect(screen.getByTestId('daily-tab-btn')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-tab-btn')).toBeInTheDocument();
    
    const pointsEl = screen.getByTestId('challenge-points');
    expect(pointsEl).toHaveTextContent('0 pts');
  });

  it('completing a manual daily challenge updates UI and points', async () => {
    render(<ChallengesWidget />);
    
    // Find a manual challenge checkmark button (e.g. for "Use public transport today" or similar)
    const doneButtons = screen.getAllByRole('button', { name: /done/i });
    expect(doneButtons.length).toBeGreaterThan(0);
    
    // Click the first manual done button
    fireEvent.click(doneButtons[0]);
    
    // Should display a checkmark
    expect(await screen.findByText('✔')).toBeInTheDocument();
    
    const pointsEl = screen.getByTestId('challenge-points');
    expect(pointsEl).toHaveTextContent('10 pts');
  });

  it('allows switching between Daily and Weekly challenge tabs', () => {
    render(<ChallengesWidget />);
    
    // Switch to weekly tab
    fireEvent.click(screen.getByTestId('weekly-tab-btn'));
    
    // Weekly challenge should display progress bar info e.g. "0/5" or similar
    expect(screen.getByText(/Plan 5 clean commute routes this week/i)).toBeInTheDocument();
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('auto-completes a daily challenge on event receipt', async () => {
    // Inject custom challenge structure to force "Report a symptom today" challenge to be active
    const today = new Date().toDateString();
    localStorage.setItem("pollution_hub_challenges_data", JSON.stringify({
      assignedDate: today,
      dailies: [
        { id: "report-symptom", text: "Report a symptom today", points: 15, type: "auto", event: "SYMPTOM_REPORT_SUBMITTED", completed: false },
        { id: "check-aqi", text: "Check AQI", points: 10, type: "manual", completed: false },
        { id: "avoid-plastic", text: "Avoid plastic", points: 10, type: "manual", completed: false }
      ]
    }));

    render(<ChallengesWidget />);
    
    expect(screen.getByText('Report a symptom today')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();

    // Trigger event
    act(() => {
      eventBus.emit("SYMPTOM_REPORT_SUBMITTED");
    });

    // Verify it is completed (checkmark is shown)
    expect(await screen.findByText('✔')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-points')).toHaveTextContent('15 pts');
  });

  it('progresses weekly challenges on event receipt', async () => {
    render(<ChallengesWidget />);
    
    // Switch to weekly tab
    fireEvent.click(screen.getByTestId('weekly-tab-btn'));
    expect(screen.getByText('0/5')).toBeInTheDocument();

    // Trigger route planned event
    act(() => {
      eventBus.emit("ROUTE_PLANNED");
    });

    // Progress should update to 1/5
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });
});
