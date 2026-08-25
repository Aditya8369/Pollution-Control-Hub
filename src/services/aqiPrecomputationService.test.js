import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDate,
  mean,
  aggregateHistoricalAQI,
  getPrecomputedAverages
} from './aqiPrecomputationService';
import { cacheStore } from '../utils/cacheStore';

vi.mock('../utils/cacheStore', () => {
  const store = new Map();
  return {
    cacheStore: {
      getFresh: vi.fn((key) => store.get(key)),
      set: vi.fn((key, data) => {
        store.set(key, { data });
      })
    }
  };
});

describe('aqiPrecomputationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const date = new Date(2026, 7, 25); // August 25 (0-indexed month)
      expect(formatDate(date)).toBe('2026-08-25');
    });
  });

  describe('mean', () => {
    it('calculates average correctly', () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it('ignores non-numeric values', () => {
      expect(mean([10, null, undefined, 'abc', 20])).toBe(15);
    });

    it('returns null for empty lists', () => {
      expect(mean([])).toBeNull();
    });
  });

  describe('aggregateHistoricalAQI', () => {
    it('groups hourly values by day and returns weekly and monthly averages', () => {
      // Mock raw data with 8 days of hourly values (8 * 24 = 192 values)
      const times = [];
      const usAqi = [];
      for (let day = 1; day <= 8; day++) {
        const dateStr = `2026-08-0${day}`;
        for (let hour = 0; hour < 24; hour++) {
          times.push(`${dateStr}T${String(hour).padStart(2, '0')}:00`);
          // Day 1 to 7: AQI = 100
          // Day 8: AQI = 200
          usAqi.push(day === 8 ? 200 : 100);
        }
      }

      const rawData = {
        hourly: { time: times, us_aqi: usAqi }
      };

      const result = aggregateHistoricalAQI(rawData);

      // Weekly average should be mean of the last 7 days of daily averages:
      // Last 7 days: Days 2 to 7 (6 days of AQI 100) + Day 8 (1 day of AQI 200)
      // (100 * 6 + 200) / 7 = 800 / 7 = 114.28 -> round to 114
      expect(result.weekly).toBe(114);

      // Monthly average should be mean of all 8 days:
      // (100 * 7 + 200) / 8 = 900 / 8 = 112.5 -> round to 113
      expect(result.monthly).toBe(113);

      // Prediction should be round of the last day average (Day 8: 200) * 1.08 = 216
      expect(result.prediction).toBe(216);
    });

    it('safely handles empty data packages', () => {
      expect(aggregateHistoricalAQI({})).toEqual({
        weekly: null,
        monthly: null,
        prediction: null
      });
    });

    it('handles payload with all-null/invalid readings', () => {
      const rawData = {
        hourly: {
          time: ['2026-08-01T00:00', '2026-08-01T01:00'],
          us_aqi: [null, undefined]
        }
      };
      expect(aggregateHistoricalAQI(rawData)).toEqual({
        weekly: null,
        monthly: null,
        prediction: null
      });
    });
  });

  describe('getPrecomputedAverages', () => {
    const lat = 28.6139;
    const lon = 77.209;

    it('serves from cache when fresh', async () => {
      const mockCached = { weekly: 80, monthly: 90, prediction: 86 };
      vi.mocked(cacheStore.getFresh).mockResolvedValueOnce({ data: mockCached });

      const result = await getPrecomputedAverages(lat, lon);
      expect(result).toEqual(mockCached);
      expect(cacheStore.getFresh).toHaveBeenCalled();
    });

    it('fetches from API, aggregates, caches, and returns fresh values on cache miss', async () => {
      vi.mocked(cacheStore.getFresh).mockResolvedValueOnce(null);

      // Mock fetch
      const times = [];
      const usAqi = [];
      for (let hour = 0; hour < 24; hour++) {
        times.push(`2026-08-01T${String(hour).padStart(2, '0')}:00`);
        usAqi.push(100);
      }

      const mockResponse = {
        hourly: { time: times, us_aqi: usAqi }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getPrecomputedAverages(lat, lon);

      expect(result.weekly).toBe(100);
      expect(result.monthly).toBe(100);
      expect(result.prediction).toBe(108);
      expect(cacheStore.set).toHaveBeenCalled();
    });
  });
});
