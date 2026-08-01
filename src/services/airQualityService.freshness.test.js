import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAirQualityByCoords,
  fetchLocalGrid,
  get7DayForecast,
  CACHE_TTL,
} from '../services/airQualityService';
import { cacheStore } from '../utils/cacheStore';

vi.mock('../workers/apiWorker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    terminate() {}
  },
}));

/**
 * Builds a full-day Open-Meteo air-quality payload where every hour reports `aqi`.
 * @param {number} aqi
 */
function airQualityPayload(aqi) {
  const today = new Date().toISOString().split('T')[0];
  const times = Array.from(
    { length: 24 },
    (_, i) => `${today}T${String(i).padStart(2, '0')}:00`
  );
  return {
    utc_offset_seconds: 0,
    hourly: {
      time: times,
      pm2_5: times.map(() => 10),
      pm10: times.map(() => 20),
      us_aqi: times.map(() => aqi),
      carbon_monoxide: times.map(() => 100),
      nitrogen_dioxide: times.map(() => 15),
      ozone: times.map(() => 30),
    },
  };
}

describe('airQualityService cache freshness', () => {
  /** @type {any} */
  let currentPayload;
  /** @type {any} */
  let fetchSpy;

  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.useRealTimers();

    currentPayload = airQualityPayload(50);
    fetchSpy = vi.fn(async () => ({ ok: true, json: async () => currentPayload }));

    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', fetchSpy);
    // Force the plain-fetch branch rather than the web-worker branch.
    vi.stubGlobal('window', { Worker: undefined });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cacheStore.invalidate();
  });

  it('serves the cached reading while it is inside the TTL', async () => {
    const first = await fetchAirQualityByCoords(28.6139, 77.209, null, true);
    expect(first.current.us_aqi).toBe(50);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    currentPayload = airQualityPayload(300);
    const second = await fetchAirQualityByCoords(28.6139, 77.209, null, true);

    expect(second.current.us_aqi).toBe(50);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the reading is older than CACHE_TTL.CURRENT', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    const first = await fetchAirQualityByCoords(28.6139, 77.209, null, true);
    expect(first.current.us_aqi).toBe(50);

    // Upstream AQI spikes while the user leaves the tab open.
    currentPayload = airQualityPayload(300);
    vi.setSystemTime(start + CACHE_TTL.CURRENT + 1000);

    const second = await fetchAirQualityByCoords(28.6139, 77.209, null, true);

    expect(second.current.us_aqi).toBe(300);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not replay a day-old reading (the pre-fix behaviour)', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    await fetchAirQualityByCoords(19.076, 72.8777, null, true);

    currentPayload = airQualityPayload(410);
    vi.setSystemTime(start + 23 * 60 * 60 * 1000);

    const later = await fetchAirQualityByCoords(19.076, 72.8777, null, true);
    expect(later.current.us_aqi).toBe(410);
  });

  it('expires the hotspot grid after CACHE_TTL.GRID', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    const first = await fetchLocalGrid(28.6, 77.2, 6);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].aqi).toBe(50);

    const callsAfterFirst = fetchSpy.mock.calls.length;

    // Inside the window the 8 surrounding requests are not repeated.
    await fetchLocalGrid(28.6, 77.2, 6);
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);

    currentPayload = airQualityPayload(220);
    vi.setSystemTime(start + CACHE_TTL.GRID + 1000);

    const refreshed = await fetchLocalGrid(28.6, 77.2, 6);
    expect(refreshed[0].aqi).toBe(220);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('holds the 7-day forecast for the longer CACHE_TTL.FORECAST window', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    const today = new Date(start).toISOString().split('T')[0];
    const forecastPayload = {
      hourly: { time: [`${today}T00:00`, `${today}T01:00`], us_aqi: [90, 110] },
    };
    const weatherPayload = { daily: { time: [today], weather_code: [0] } };

    fetchSpy.mockImplementation(async (url) => ({
      ok: true,
      json: async () =>
        String(url).includes('air-quality') ? forecastPayload : weatherPayload,
    }));

    await get7DayForecast(28.6139, 77.209);
    const callsAfterFirst = fetchSpy.mock.calls.length;

    // A forecast is still valid well past the 5-minute live-reading window.
    vi.setSystemTime(start + CACHE_TTL.CURRENT + 1000);
    await get7DayForecast(28.6139, 77.209);
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);

    vi.setSystemTime(start + CACHE_TTL.FORECAST + 1000);
    await get7DayForecast(28.6139, 77.209);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('exposes TTLs ordered from the most to the least volatile data', () => {
    expect(CACHE_TTL.CURRENT).toBeLessThanOrEqual(CACHE_TTL.FORECAST);
    expect(CACHE_TTL.GRID).toBeLessThanOrEqual(CACHE_TTL.FORECAST);
    expect(CACHE_TTL.CURRENT).toBeGreaterThan(0);
  });
});

describe('cacheStore.getFresh', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.useRealTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cacheStore.invalidate();
  });

  it('returns an entry that is within the ttl', async () => {
    await cacheStore.set('fresh-key', { value: 1 });
    const entry = await cacheStore.getFresh('fresh-key', 60_000);
    expect(entry?.data).toEqual({ value: 1 });
  });

  it('returns null for an entry older than the ttl', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    await cacheStore.set('aging-key', { value: 1 });

    vi.setSystemTime(start + 61_000);
    expect(await cacheStore.getFresh('aging-key', 60_000)).toBeNull();

    // The raw accessor still sees it — getFresh is the freshness-aware one.
    expect(await cacheStore.get('aging-key')).not.toBeNull();
  });

  it('returns null for a key that was never written', async () => {
    expect(await cacheStore.getFresh('missing-key', 60_000)).toBeNull();
  });

  it('treats an omitted ttl as no expiry', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    await cacheStore.set('eternal-key', { value: 1 });
    vi.setSystemTime(start + 10 * 60 * 60 * 1000);

    expect(await cacheStore.getFresh('eternal-key', undefined)).not.toBeNull();
  });

  it('applies the same ttl rule to getFromMemory', async () => {
    const start = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(start);

    await cacheStore.set('mem-key', { value: 7 });
    expect(cacheStore.getFromMemory('mem-key', 60_000)?.data).toEqual({ value: 7 });

    vi.setSystemTime(start + 61_000);
    expect(cacheStore.getFromMemory('mem-key', 60_000)).toBeNull();
    // Without a ttl the memory tier behaves exactly as before.
    expect(cacheStore.getFromMemory('mem-key')).not.toBeNull();
  });
});
