import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCityComparisons } from '../services/airQualityService';
import { cacheStore } from '../utils/cacheStore';
import { CITY_COORDINATES } from '../constants/cities';

vi.mock('../workers/apiWorker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    terminate() {}
  },
}));

/**
 * Payload where every hour reports `aqi`, matching the Open-Meteo response shape.
 * @param {number} aqi
 */
function payload(aqi) {
  const today = new Date().toISOString().split('T')[0];
  const times = Array.from(
    { length: 24 },
    (_, i) => `${today}T${String(i).padStart(2, '0')}:00`
  );
  return {
    utc_offset_seconds: 0,
    hourly: {
      time: times,
      pm2_5: times.map(() => Math.round(aqi / 3)),
      pm10: times.map(() => Math.round(aqi / 2)),
      us_aqi: times.map(() => aqi),
      carbon_monoxide: times.map(() => 100),
      nitrogen_dioxide: times.map(() => 15),
      ozone: times.map(() => 30),
    },
  };
}

describe('fetchCityComparisons - failure handling (regression for #499)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', { Worker: undefined });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('marks every city unavailable when the endpoint is down, inventing nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    );

    const results = await fetchCityComparisons();

    expect(results).toHaveLength(CITY_COORDINATES.length);
    for (const entry of results) {
      expect(entry.unavailable).toBe(true);
      expect(entry.aqi).toBeNull();
      expect(entry.pm2_5).toBeNull();
      expect(entry.pm10).toBeNull();
      // The old fallback substituted these exact numbers.
      expect(entry.aqi).not.toBe(85);
      expect(entry.pm2_5).not.toBe(34);
      expect(entry.pm10).not.toBe(55);
    }
  });

  it('keeps measured cities and sorts unavailable ones last', async () => {
    const failing = new Set([CITY_COORDINATES[0].name]);
    const aqiByIndex = CITY_COORDINATES.map((_, i) => 40 + i * 10);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const lat = Number(new URL(String(url)).searchParams.get('latitude'));
        const index = CITY_COORDINATES.findIndex((c) => c.lat === lat);
        if (index !== -1 && failing.has(CITY_COORDINATES[index].name)) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return { ok: true, json: async () => payload(aqiByIndex[index] ?? 60) };
      })
    );

    const results = await fetchCityComparisons();
    const measured = results.filter((c) => !c.unavailable);
    const unavailable = results.filter((c) => c.unavailable);

    expect(unavailable.map((c) => c.city)).toEqual([CITY_COORDINATES[0].name]);
    expect(measured.length).toBe(CITY_COORDINATES.length - 1);

    // Measured cities keep their descending-AQI ordering...
    for (let i = 1; i < measured.length; i++) {
      expect(measured[i - 1].aqi).toBeGreaterThanOrEqual(measured[i].aqi);
    }
    // ...and every unavailable city sits after every measured one.
    const firstUnavailableIndex = results.findIndex((c) => c.unavailable);
    const lastMeasuredIndex = results.map((c) => c.unavailable).lastIndexOf(false);
    expect(firstUnavailableIndex).toBeGreaterThan(lastMeasuredIndex);
  });

  it('flags successful cities as available with real readings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => payload(120) }))
    );

    const results = await fetchCityComparisons();

    for (const entry of results) {
      expect(entry.unavailable).toBe(false);
      expect(entry.aqi).toBe(120);
      expect(typeof entry.pm2_5).toBe('number');
    }
  });

  it('propagates an AbortError instead of swallowing it as unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('Aborted', 'AbortError');
      })
    );

    await expect(fetchCityComparisons()).rejects.toThrow(/abort/i);
  });
});
