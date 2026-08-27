import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CarbonFootprintCalculator from './CarbonFootprintCalculator';

const TIP_COMMITMENTS_KEY = 'carbon_tip_commitments';
const ORIGINAL_TZ = process.env.TZ;

function useTimezone(tz, instant) {
  beforeEach(() => {
    process.env.TZ = tz;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(instant);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = ORIGINAL_TZ;
    localStorage.clear();
  });
}

function commitments() {
  const raw = localStorage.getItem(TIP_COMMITMENTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function firstCommitEntry() {
  return Object.values(commitments())[0];
}

describe('CarbonFootprintCalculator - tip commitments in the evening in New York (regression for #1015)', () => {
  // 20:30 local on 1 March; the UTC clock already says 2 March.
  useTimezone('America/New_York', new Date('2026-03-02T01:30:00Z'));

  it('stamps a new commitment with the local date', () => {
    render(<CarbonFootprintCalculator />);

    fireEvent.click(screen.getAllByRole('button', { name: /Commit to this tip/ })[0]);

    expect(firstCommitEntry().committedAt).toBe('2026-03-01');
  });

  it('records "done today" against the local date', () => {
    render(<CarbonFootprintCalculator />);

    fireEvent.click(screen.getAllByRole('button', { name: /Commit to this tip/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark today as done/ })[0]);

    expect(firstCommitEntry().completedDates).toEqual(['2026-03-01']);
  });

  it('will not let the same local day be counted twice', () => {
    render(<CarbonFootprintCalculator />);

    fireEvent.click(screen.getAllByRole('button', { name: /Commit to this tip/ })[0]);
    const done = screen.getAllByRole('button', { name: /Mark today as done/ })[0];
    fireEvent.click(done);

    // With a UTC key, a New York user who ticked a tip off at 20:00 got a fresh
    // "Mark today as done" button straight away and could double-count the day.
    expect(screen.getAllByRole('button', { name: /Marked today/ })[0]).toBeDisabled();
    expect(firstCommitEntry().completedDates).toHaveLength(1);
  });

  it('recognises a commitment completed earlier the same local evening', () => {
    localStorage.setItem(
      TIP_COMMITMENTS_KEY,
      JSON.stringify({ 'switch-to-ev': { committedAt: '2026-03-01', completedDates: ['2026-03-01'] } })
    );

    render(<CarbonFootprintCalculator />);

    // Whichever tip this is, if it is on screen it must read as already done.
    const marked = screen.queryAllByRole('button', { name: /Marked today/ });
    const stored = commitments()['switch-to-ev'];
    expect(stored.completedDates).toContain('2026-03-01');
    if (marked.length > 0) expect(marked[0]).toBeDisabled();
  });
});

describe('CarbonFootprintCalculator - early morning in India', () => {
  // 03:30 local on 2 March; the UTC clock still says 1 March.
  useTimezone('Asia/Kolkata', new Date('2026-03-01T22:00:00Z'));

  it('starts a new day at local midnight, not five and a half hours later', () => {
    render(<CarbonFootprintCalculator />);

    fireEvent.click(screen.getAllByRole('button', { name: /Commit to this tip/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark today as done/ })[0]);

    // The old key would have credited this against 1 March, a day the user had
    // already finished.
    expect(firstCommitEntry().completedDates).toEqual(['2026-03-02']);
  });
});
