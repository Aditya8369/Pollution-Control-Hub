import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAirQualityByCoords,
  resolveCurrentIndex,
  localHourStamp,
} from './airQualityService';
import { cacheStore } from '../utils/cacheStore';

/**
 * Regression cover for #545.
 *
 * The date window was built with `toISOString()` (always UTC) while `timezone=auto` made
 * the response local to the queried coordinates. East of UTC the local date runs ahead
 * during the morning, so today was never requested — and `getCurrentHourIndex`, which
 * matched on hour-of-day alone, quietly picked yesterday's sample at the same hour and
 * presented it as current.
 */

vi.mock('../workers/apiWorker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    terminate() {}
  },
}));

/** Builds an hourly timestamp block for the given local dates. */
function hoursFor(dates) {
  const times = [];
  for (const date of dates) {
    for (let h = 0; h < 24; h++) {
      times.push(`${date}T${String(h).padStart(2, '0')}:00`);
    }
  }
  return times;
}

describe('localHourStamp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the location wall clock, not the browser one', () => {
    // 2026-08-02T23:00Z. In a UTC+9 zone that is already 08:00 on 2026-08-03.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T23:00:00Z'));

    expect(localHourStamp(9 * 3600)).toBe('2026-08-03T08');
    expect(localHourStamp(0)).toBe('2026-08-02T23');
    // ...and west of UTC it is still the previous day.
    expect(localHourStamp(-5 * 3600)).toBe('2026-08-02T18');
  });

  it('zero-pads months, days and hours so the stamps stay comparable', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T04:00:00Z'));
    expect(localHourStamp(0)).toBe('2026-01-05T04');
  });
});

describe('resolveCurrentIndex', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T23:00:00Z')); // 2026-08-03T08:00 at UTC+9
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches on the full date and hour, not on the hour alone', () => {
    const times = hoursFor(['2026-08-02', '2026-08-03']);
    const result = resolveCurrentIndex(times, 9 * 3600);

    expect(result.exact).toBe(true);
    expect(result.timestamp).toBe('2026-08-03T08:00');
    // The old hour-only scan would have accepted 2026-08-02T08:00 (index 8).
    expect(result.index).toBe(32);
  });

  it('does not silently accept yesterday when today is missing', () => {
    // Only the two previous days came back — today is absent entirely.
    const times = hoursFor(['2026-08-01', '2026-08-02']);
    const result = resolveCurrentIndex(times, 9 * 3600);

    expect(result.exact).toBe(false);
  });

  it('falls back to the newest past sample, not to the oldest one', () => {
    const times = hoursFor(['2026-08-01', '2026-08-02']);
    const result = resolveCurrentIndex(times, 9 * 3600);

    // The previous implementation returned index 0 — the start of 2026-08-01, i.e. the
    // single stalest reading in the payload.
    expect(result.index).not.toBe(0);
    expect(result.timestamp).toBe('2026-08-02T23:00');
  });

  it('never returns a future sample as the current reading', () => {
    const times = hoursFor(['2026-08-03']);
    const result = resolveCurrentIndex(times, 9 * 3600);

    expect(result.timestamp).toBe('2026-08-03T08:00');
    expect(result.timestamp <= '2026-08-03T08:00').toBe(true);
  });

  it('handles an all-future window by taking the closest sample', () => {
    const times = hoursFor(['2026-08-10']);
    const result = resolveCurrentIndex(times, 9 * 3600);

    expect(result.index).toBe(0);
    expect(result.exact).toBe(false);
  });

  it('reports no index for an empty or missing array', () => {
    expect(resolveCurrentIndex([], 0).index).toBe(-1);
    expect(resolveCurrentIndex(undefined, 0).index).toBe(-1);
    expect(resolveCurrentIndex(null, 0).exact).toBe(false);
  });

  it('works for a location west of UTC too', () => {
    // 23:00Z is 18:00 on 2026-08-02 at UTC-5.
    const times = hoursFor(['2026-08-01', '2026-08-02']);
    const result = resolveCurrentIndex(times, -5 * 3600);

    expect(result.exact).toBe(true);
    expect(result.timestamp).toBe('2026-08-02T18:00');
  });
});

describe('fetchAirQualityByCoords - request window (regression for #545)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', { Worker: undefined });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T23:00:00Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cacheStore.invalidate();
  });

  it('asks for a relative window instead of UTC-derived dates', async () => {
    const seen = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        seen.push(String(url));
        return {
          ok: true,
          json: async () => ({
            utc_offset_seconds: 9 * 3600,
            hourly: {
              time: hoursFor(['2026-08-02', '2026-08-03']),
              pm2_5: Array(48).fill(10),
              pm10: Array(48).fill(20),
              us_aqi: Array(48).fill(42),
              carbon_monoxide: Array(48).fill(100),
              nitrogen_dioxide: Array(48).fill(15),
              ozone: Array(48).fill(30),
            },
          }),
        };
      })
    );

    await fetchAirQualityByCoords(35.68, 139.69, undefined, true);

    const request = seen.find((u) => u.includes('/air-quality'));
    const params = new URL(request).searchParams;

    expect(params.get('past_days')).toBe('1');
    expect(params.get('forecast_days')).toBe('1');
    expect(params.get('timezone')).toBe('auto');
    // The UTC-derived dates are what excluded the location's today.
    expect(params.get('start_date')).toBeNull();
    expect(params.get('end_date')).toBeNull();
  });

  it("returns the location's current hour, not the same hour a day earlier", async () => {
    const times = hoursFor(['2026-08-02', '2026-08-03']);
    // Yesterday reads 300; today reads 42. Picking the wrong day is unmistakable.
    const aqi = times.map((t) => (t.startsWith('2026-08-03') ? 42 : 300));

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          utc_offset_seconds: 9 * 3600,
          hourly: {
            time: times,
            pm2_5: times.map((t) => (t.startsWith('2026-08-03') ? 10 : 90)),
            pm10: times.map(() => 20),
            us_aqi: aqi,
            carbon_monoxide: times.map(() => 100),
            nitrogen_dioxide: times.map(() => 15),
            ozone: times.map(() => 30),
          },
        }),
      }))
    );

    const result = await fetchAirQualityByCoords(35.68, 139.69, undefined, true);

    expect(result.current.time).toBe('2026-08-03T08:00');
    expect(result.current.us_aqi).toBe(42);
    expect(result.current.us_aqi).not.toBe(300); // yesterday's value
    expect(result.isCurrentHour).toBe(true);
    expect(result.readingTime).toBe('2026-08-03T08:00');
  });

  it('flags the reading as not-current when the hour is missing from the payload', async () => {
    const times = hoursFor(['2026-08-01', '2026-08-02']);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          utc_offset_seconds: 9 * 3600,
          hourly: {
            time: times,
            pm2_5: times.map(() => 10),
            pm10: times.map(() => 20),
            us_aqi: times.map(() => 55),
            carbon_monoxide: times.map(() => 100),
            nitrogen_dioxide: times.map(() => 15),
            ozone: times.map(() => 30),
          },
        }),
      }))
    );

    const result = await fetchAirQualityByCoords(35.68, 139.69, undefined, true);

    expect(result.isCurrentHour).toBe(false);
    // Newest available sample, rather than the oldest one in the window.
    expect(result.readingTime).toBe('2026-08-02T23:00');
  });

  it('builds the 24-hour trend backwards from the resolved hour', async () => {
    const times = hoursFor(['2026-08-02', '2026-08-03']);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          utc_offset_seconds: 9 * 3600,
          hourly: {
            time: times,
            pm2_5: times.map((_, i) => i),
            pm10: times.map(() => 20),
            us_aqi: times.map((_, i) => i),
            carbon_monoxide: times.map(() => 100),
            nitrogen_dioxide: times.map(() => 15),
            ozone: times.map(() => 30),
          },
        }),
      }))
    );

    const result = await fetchAirQualityByCoords(35.68, 139.69, undefined, true);

    expect(result.trend).toHaveLength(24);
    expect(result.trend[result.trend.length - 1].time).toBe('2026-08-03T08:00');
    expect(result.trend[0].time).toBe('2026-08-02T09:00');
  });
});
