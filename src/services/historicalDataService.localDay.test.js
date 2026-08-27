import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchHistoricalData } from './historicalDataService';

const ORIGINAL_TZ = process.env.TZ;

/** The query string the request was built with. */
function requestedWindow(fetchMock) {
  const url = new URL(fetchMock.mock.calls[0][0]);
  return {
    start: url.searchParams.get('start_date'),
    end: url.searchParams.get('end_date'),
    timezone: url.searchParams.get('timezone'),
  };
}

function stubFetch() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ hourly: { time: [], us_aqi: [] } }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

describe('fetchHistoricalData - request window (regression for #1015)', () => {
  it('ends the window on the local date, not the UTC one, ahead of UTC', async () => {
    // 22:00 UTC on 1 March is 03:30 on 2 March in Kolkata. `timezone=auto` makes
    // Open-Meteo read these dates in the location's timezone, so a UTC-derived
    // end_date asked for a window ending yesterday and quietly dropped the most
    // recent day from the export and the heatmap.
    process.env.TZ = 'Asia/Kolkata';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T22:00:00Z'));

    const fetchMock = stubFetch();
    await fetchHistoricalData(28.6139, 77.209, 1);

    const { end, timezone } = requestedWindow(fetchMock);
    expect(timezone).toBe('auto');
    expect(end).toBe('2026-03-02');
  });

  it('ends the window on the local date behind UTC', async () => {
    // 01:30 UTC on 2 March is 20:30 on 1 March in New York. The UTC date is
    // already tomorrow as far as this location is concerned.
    process.env.TZ = 'America/New_York';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-02T01:30:00Z'));

    const fetchMock = stubFetch();
    await fetchHistoricalData(40.7128, -74.006, 1);

    expect(requestedWindow(fetchMock).end).toBe('2026-03-01');
  });

  it('starts the window `years` back from the same local day', async () => {
    process.env.TZ = 'Asia/Kolkata';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T22:00:00Z'));

    const fetchMock = stubFetch();
    await fetchHistoricalData(28.6139, 77.209, 3);

    const { start, end } = requestedWindow(fetchMock);
    expect(end).toBe('2026-03-02');
    expect(start).toBe('2023-03-02');
  });

  it('leaves a user actually on UTC exactly where they were', async () => {
    process.env.TZ = 'UTC';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

    const fetchMock = stubFetch();
    await fetchHistoricalData(51.5074, -0.1278, 1);

    const { start, end } = requestedWindow(fetchMock);
    expect(end).toBe('2026-03-01');
    expect(start).toBe('2025-03-01');
  });

  it('does not mutate the anchor date when computing the start', async () => {
    // `startDateObj` used to be a second `new Date()` rather than a copy, which
    // worked by accident; it is a copy now, so this pins that the end date is
    // unaffected by the setFullYear call.
    process.env.TZ = 'America/New_York';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-02T01:30:00Z'));

    const fetchMock = stubFetch();
    await fetchHistoricalData(40.7128, -74.006, 2);

    const { start, end } = requestedWindow(fetchMock);
    expect(end).toBe('2026-03-01');
    expect(start).toBe('2024-03-01');
  });
});
