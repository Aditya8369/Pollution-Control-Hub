import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MorningBriefing from './MorningBriefing';
import { eventBus } from '../core/events';
import { localDayKey } from '../utils/localDay';

const STREAK_KEY = 'appStreak';
const LAST_CHECK_IN_KEY = 'lastCheckIn';
const DISMISSED_KEY = 'briefingDismissed';

const current = { us_aqi: 120, pm2_5: 45 };

/** The local day key `offset` days from today. */
function dayKeyOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

describe('MorningBriefing - check-in streak (#669)', () => {
  /** @type {any[]} */
  let updates;
  /** @type {(payload: any) => void} */
  let onStreak;

  beforeEach(() => {
    localStorage.clear();
    updates = [];
    onStreak = (payload) => updates.push(payload);
    eventBus.on('STREAK_UPDATED', onStreak);
  });

  afterEach(() => {
    eventBus.off('STREAK_UPDATED', onStreak);
    vi.restoreAllMocks();
  });

  it('records the check-in against the local calendar date', () => {
    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(LAST_CHECK_IN_KEY)).toBe(localDayKey(new Date()));
  });

  it('starts a new user at 1', () => {
    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('1');
    expect(updates.at(-1)).toEqual({ streak: 1 });
  });

  it('increments when the last check-in was yesterday', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(-1));
    localStorage.setItem(STREAK_KEY, '6');

    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('7');
    expect(updates.at(-1)).toEqual({ streak: 7 });
  });

  it('does not increment a second time on the same day', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(-1));
    localStorage.setItem(STREAK_KEY, '6');

    render(<MorningBriefing current={current} />);
    expect(localStorage.getItem(STREAK_KEY)).toBe('7');

    cleanup();
    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('7');
    expect(updates.at(-1)).toEqual({ streak: 7 });
  });

  it('resets after a missed day', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(-3));
    localStorage.setItem(STREAK_KEY, '12');

    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('1');
  });

  it('resets rather than incrementing on a future-dated check-in', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(1));
    localStorage.setItem(STREAK_KEY, '12');

    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('1');
    expect(localStorage.getItem(LAST_CHECK_IN_KEY)).toBe(localDayKey(new Date()));
  });

  it('never persists NaN from a corrupt stored count', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(-1));
    localStorage.setItem(STREAK_KEY, 'NaN');

    render(<MorningBriefing current={current} />);

    expect(localStorage.getItem(STREAK_KEY)).toBe('1');
    expect(updates.at(-1).streak).toBe(1);
  });

  it('re-checks when the tab is brought back to the foreground', () => {
    localStorage.setItem(LAST_CHECK_IN_KEY, dayKeyOffset(-1));
    localStorage.setItem(STREAK_KEY, '2');

    render(<MorningBriefing current={current} />);
    expect(updates).toHaveLength(1);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Same local day, so the count must not move — only the re-check happens.
    expect(updates).toHaveLength(2);
    expect(updates.at(-1)).toEqual({ streak: 3 });
    expect(localStorage.getItem(STREAK_KEY)).toBe('3');
  });

  it('stops listening once unmounted', () => {
    const { unmount } = render(<MorningBriefing current={current} />);
    unmount();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(updates).toHaveLength(1);
  });

  it('survives localStorage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => render(<MorningBriefing current={current} />)).not.toThrow();
    expect(updates.at(-1)).toEqual({ streak: 1 });
  });
});

describe('MorningBriefing - dismissal (#669)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores the dismissal against the local calendar date', () => {
    render(<MorningBriefing current={current} />);

    fireEvent.click(screen.getByLabelText('Dismiss briefing'));

    expect(localStorage.getItem(DISMISSED_KEY)).toBe(localDayKey(new Date()));
  });

  it('stays hidden for the rest of the local day', () => {
    localStorage.setItem(DISMISSED_KEY, localDayKey(new Date()));

    const onDismiss = vi.fn();
    render(<MorningBriefing current={current} onDismiss={onDismiss} />);

    expect(screen.queryByLabelText('Dismiss briefing')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('comes back the next local day', () => {
    localStorage.setItem(DISMISSED_KEY, dayKeyOffset(-1));

    render(<MorningBriefing current={current} />);

    expect(screen.getByLabelText('Dismiss briefing')).toBeInTheDocument();
  });

  it('ignores a dismissal stored in the old UTC-derived format', () => {
    // Whatever an old build wrote is either today's local key or a different day;
    // either way it must not leave the briefing permanently hidden.
    localStorage.setItem(DISMISSED_KEY, '1970-01-01');

    render(<MorningBriefing current={current} />);

    expect(screen.getByLabelText('Dismiss briefing')).toBeInTheDocument();
  });
});
