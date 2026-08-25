import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExposureTracker from './ExposureTracker';

// jsdom has no ResizeObserver, which recharts' <ResponsiveContainer> needs to
// measure its container. Scoped to this file - only chart-rendering tests need it.
global.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

vi.mock('../services/geocodingService', () => ({ searchLocations: vi.fn(async () => []) }));
vi.mock('../services/airQualityService', () => ({ fetchAirQualityByCoords: vi.fn(async () => null) }));

const TODAY_ENTRIES_KEY = 'exposure-tracker-today';
const HISTORY_KEY = 'exposure-tracker-history';

const ORIGINAL_TZ = process.env.TZ;

/** The UTC calendar date — what the old `todayStr()` produced. */
function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

/** The local calendar date — what the user actually calls today. */
function localKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

/** The logged-activity rows, which is where a surviving entry shows up. */
function loggedLocations() {
  const table = document.querySelector('table');
  if (!table) return [];
  return [...table.querySelectorAll('tbody tr td:first-child')].map((cell) => cell.textContent.trim());
}

function seedEntries(dayKey, entries) {
  localStorage.setItem(TODAY_ENTRIES_KEY, JSON.stringify({ date: dayKey, entries }));
}

const ENTRY = {
  id: 'entry-1',
  type: 'commute_transit',
  hours: 1,
  transportMode: 'car',
  locationName: 'Brooklyn Bridge',
  aqi: 80,
  aqiStatus: 'done',
};

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

describe("ExposureTracker - evening in New York (regression for #1015)", () => {
  // 01:30 UTC on 2 March is 20:30 on 1 March in New York. The UTC date has
  // already rolled over; the user's has not, and will not for another 3.5 hours.
  const EVENING = new Date('2026-03-02T01:30:00Z');
  useTimezone('America/New_York', EVENING);

  it('the two day keys really do disagree at this instant', () => {
    // Guard for the tests below: if this ever stops being true the assertions
    // underneath are proving nothing.
    expect(localKey(new Date())).toBe('2026-03-01');
    expect(utcDayKey(new Date())).toBe('2026-03-02');
  });

  it('keeps a log written earlier the same evening', () => {
    seedEntries('2026-03-01', [ENTRY]);

    render(<ExposureTracker />);

    // The old build compared the stored '2026-03-01' against a UTC "today" of
    // '2026-03-02', decided the log was yesterday's, and threw the whole day away
    // at 19:00 or 20:00 local.
    expect(loggedLocations()).toContain('Brooklyn Bridge');
  });

  it('still discards a log from the previous local day', () => {
    seedEntries('2026-02-28', [ENTRY]);

    render(<ExposureTracker />);

    expect(loggedLocations()).not.toContain('Brooklyn Bridge');
  });

  it('stamps new writes with the local date', () => {
    seedEntries('2026-03-01', [ENTRY]);
    render(<ExposureTracker />);

    const stored = JSON.parse(localStorage.getItem(TODAY_ENTRIES_KEY));
    expect(stored.date).toBe('2026-03-01');
  });

  it('files a saved day under the local date', () => {
    seedEntries('2026-03-01', [ENTRY]);
    render(<ExposureTracker />);

    fireEvent.click(screen.getByTestId('exposure-save-day'));

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY));
    expect(history).toHaveLength(1);
    // With the UTC key the history chart's x-axis was a day ahead of the log it
    // came from, for every user west of UTC.
    expect(history[0].date).toBe('2026-03-01');
  });

  it('overwrites rather than duplicating when the same day is saved twice', () => {
    seedEntries('2026-03-01', [ENTRY]);
    render(<ExposureTracker />);

    fireEvent.click(screen.getByTestId('exposure-save-day'));
    fireEvent.click(screen.getByTestId('exposure-save-day'));

    expect(JSON.parse(localStorage.getItem(HISTORY_KEY))).toHaveLength(1);
  });
});

describe('ExposureTracker - early morning in India', () => {
  // 22:00 UTC on 1 March is 03:30 on 2 March in Kolkata. The user is five and a
  // half hours into a new day the UTC clock has not reached.
  const EARLY_MORNING = new Date('2026-03-01T22:00:00Z');
  useTimezone('Asia/Kolkata', EARLY_MORNING);

  it('the two day keys really do disagree at this instant', () => {
    expect(localKey(new Date())).toBe('2026-03-02');
    expect(utcDayKey(new Date())).toBe('2026-03-01');
  });

  it('treats an entry logged at 03:30 as part of the new day', () => {
    seedEntries('2026-03-02', [{ ...ENTRY, locationName: 'Connaught Place' }]);

    render(<ExposureTracker />);

    expect(loggedLocations()).toContain('Connaught Place');
  });

  it('does not carry yesterday forward into the small hours', () => {
    // The old build read the UTC date as '2026-03-01', matched the stored key, and
    // silently merged the new day's entries into a day the user had already saved.
    seedEntries('2026-03-01', [{ ...ENTRY, locationName: 'Connaught Place' }]);

    render(<ExposureTracker />);

    expect(loggedLocations()).not.toContain('Connaught Place');
  });

  it('stamps new writes with the new local day', () => {
    seedEntries('2026-03-02', [ENTRY]);
    render(<ExposureTracker />);

    expect(JSON.parse(localStorage.getItem(TODAY_ENTRIES_KEY)).date).toBe('2026-03-02');
  });
});

describe('ExposureTracker - UTC itself', () => {
  const NOON = new Date('2026-03-01T12:00:00Z');
  useTimezone('UTC', NOON);

  it('behaves exactly as before for a user actually on UTC', () => {
    seedEntries('2026-03-01', [ENTRY]);
    render(<ExposureTracker />);

    expect(loggedLocations()).toContain('Brooklyn Bridge');
    expect(JSON.parse(localStorage.getItem(TODAY_ENTRIES_KEY)).date).toBe(utcDayKey(new Date()));
  });
});
