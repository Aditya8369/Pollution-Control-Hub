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
      // Parse start_date and end_date from requested URL
      const urlObj = new URL(url);
      const startDateStr = urlObj.searchParams.get('start_date');
      const endDateStr = urlObj.searchParams.get('end_date');

      const times = [
        ...Array.from({ length: 24 }, (_, i) => `${startDateStr}T${String(i).padStart(2, '0')}:00`),
        ...Array.from({ length: 24 }, (_, i) => `${endDateStr}T${String(i).padStart(2, '0')}:00`)
      ];

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
