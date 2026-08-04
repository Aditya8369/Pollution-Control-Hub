import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAirQualityByCoords } from '../services/airQualityService';
import { cacheStore } from '../utils/cacheStore';

vi.mock('../workers/apiWorker?worker', () => {
  return {
    default: class MockWorker {
      constructor() {}
      postMessage() {}
      terminate() {}
    }
  };
});

describe('fetchAirQualityByCoords - trend slicing', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('bounds startIndex to 0 when idx < 23', async () => {
    const today = new Date().toISOString().split('T')[0];
    const times = Array.from({ length: 12 }, (_, i) => {
      const hour = String(i).padStart(2, '0');
      return `${today}T${hour}:00`;
    });

    const mockData = {
      utc_offset_seconds: 0,
      hourly: {
        time: times,
        pm2_5: times.map((_, i) => i * 2),
        pm10: times.map((_, i) => i * 3),
        us_aqi: times.map((_, i) => i * 4),
        carbon_monoxide: times.map(() => 10),
        nitrogen_dioxide: times.map(() => 15),
        ozone: times.map(() => 20),
      }
    };

    vi.stubGlobal('navigator', { webdriver: true, onLine: true });
    const fetchSpy = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => mockData
    }));
    vi.stubGlobal('fetch', fetchSpy);

    // Mock real Date.now() hour matching times[5] (5 AM UTC)
    const mockNow = new Date();
    mockNow.setUTCHours(5, 15, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const result = await fetchAirQualityByCoords(28.6139, 77.2090, null, true);

    expect(result.trend).toBeDefined();
    // idx is 5. Without fix, startIndex would be 5 - 23 = -18 (slice(-18, 6) returning empty or wrong range).
    // With fix, startIndex = Math.max(0, 5 - 23) = 0.
    expect(result.trend.length).toBe(6);
    expect(result.trend[0].time).toBe(`${today}T00:00`);
    expect(result.trend[0].pm2_5).toBe(0);
    expect(result.trend[5].time).toBe(`${today}T05:00`);
    expect(result.trend[5].pm2_5).toBe(10);
  });

  it('correctly slices up to 24 hours of trend when idx >= 23', async () => {
    vi.stubGlobal('navigator', { webdriver: true, onLine: true });

    // Mock system time to hour 23 UTC
    const mockNow = new Date(Date.UTC(2026, 6, 28, 23, 15, 0));
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const fetchSpy = vi.fn().mockImplementation(async (url) => {
      // The window is requested as past_days/forecast_days now, so the upstream resolves
      // the dates against the location's own timezone (#545). With utc_offset_seconds 0
      // below, that is simply yesterday and today in UTC.
      const urlObj = new URL(url);
      const pastDays = Number(urlObj.searchParams.get('past_days') ?? 0);
      const forecastDays = Number(urlObj.searchParams.get('forecast_days') ?? 1);

      const dayStrings = [];
      for (let offset = -pastDays; offset < forecastDays; offset++) {
        const day = new Date(mockNow);
        day.setUTCDate(day.getUTCDate() + offset);
        dayStrings.push(day.toISOString().split('T')[0]);
      }

      const times = dayStrings.flatMap((date) =>
        Array.from({ length: 24 }, (_, i) => `${date}T${String(i).padStart(2, '0')}:00`)
      );

      return {
        ok: true,
        json: async () => ({
          utc_offset_seconds: 0,
          hourly: {
            time: times,
            pm2_5: times.map((_, i) => i * 2),
            pm10: times.map((_, i) => i * 3),
            us_aqi: times.map((_, i) => i * 4),
            carbon_monoxide: times.map(() => 10),
            nitrogen_dioxide: times.map(() => 15),
            ozone: times.map(() => 20),
          }
        })
      };
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchAirQualityByCoords(28.6139, 77.2090, null, true);

    const todayStr = mockNow.toISOString().split('T')[0];
    expect(result.trend.length).toBe(24);
    expect(result.trend[0].time).toBe(`${todayStr}T00:00`);
    expect(result.trend[23].time).toBe(`${todayStr}T23:00`);
  });
});

describe('get7DayForecast', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
  });

  it('retrieves 7-day forecast with confidence bounds', async () => {
    const { get7DayForecast } = await import('../services/airQualityService');
    const mockAqi = {
      hourly: {
        time: Array.from({ length: 168 }, (_, i) => `2026-07-${String(Math.floor(i / 24) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00`),
        us_aqi: Array.from({ length: 168 }, () => 100),
      },
    };
    const mockWeather = {
      daily: {
        time: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07'],
        weather_code: [0, 1, 2, 3, 45, 61, 80],
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (url.includes('daily=weather_code')) {
        return { ok: true, json: async () => mockWeather };
      }
      return { ok: true, json: async () => mockAqi };
    }));

    const forecast = await get7DayForecast(28.6139, 77.2090);
    expect(forecast.length).toBeGreaterThan(0);
    const day = forecast[0];
    expect(day.date).toBeDefined();
    expect(day.aqi).toBe(100);
    expect(day.predictedAQI).toBe(100);
    expect(typeof day.lowerBound).toBe('number');
    expect(typeof day.upperBound).toBe('number');
    expect(day.lowerBound).toBeLessThanOrEqual(day.aqi);
    expect(day.upperBound).toBeGreaterThanOrEqual(day.aqi);
    expect(Array.isArray(day.confidenceRange)).toBe(true);
  });

  it('throws an error if API request fails', async () => {
    const { get7DayForecast } = await import('../services/airQualityService');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({
      ok: false,
    })));

    await expect(get7DayForecast(28.6139, 77.2090)).rejects.toThrow('Failed to fetch 7-day forecast.');
  });
});
