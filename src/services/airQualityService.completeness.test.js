import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAirQualityByCoords,
  getAQIBand,
  getPollutantColor,
  estimateWeeklyMonthlyAverages,
  estimateExposureTime,
  UNKNOWN_AQI_BAND,
} from './airQualityService';
import { cacheStore } from '../utils/cacheStore';

/**
 * Regression cover for #546.
 *
 * Two defects compounded: computeConfidence counted a pollutant series as complete when
 * a single sample in it was non-null, and every reading was pulled with `?? 0`. A mostly
 * empty response therefore rendered as a green "AQI 0 — Good" card stamped
 * "High confidence, 100% complete".
 */

vi.mock('../workers/apiWorker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    terminate() {}
  },
}));

const FIELDS = ['pm2_5', 'pm10', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone', 'us_aqi'];

/** 24 local hours for today, so the current-hour lookup lands inside the window. */
function todayHours() {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: 24 }, (_, i) => `${today}T${String(i).padStart(2, '0')}:00`);
}

/**
 * Builds a payload where `fill(hourIndex)` decides each hour's value (null = a gap).
 *
 * @param {(hour: number) => number|null} fill
 */
function payloadWith(fill) {
  const times = todayHours();
  const hourly = { time: times };
  for (const field of FIELDS) {
    hourly[field] = times.map((_, i) => fill(i));
  }
  return { utc_offset_seconds: 0, hourly };
}

function stubFetch(payload) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => payload })));
}

describe('getAQIBand', () => {
  it('classifies real values exactly as before', () => {
    expect(getAQIBand(0).label).toBe('Good');
    expect(getAQIBand(50).label).toBe('Good');
    expect(getAQIBand(75).label).toBe('Moderate');
    expect(getAQIBand(160).label).toBe('Unhealthy');
    expect(getAQIBand(400).label).toBe('Hazardous');
  });

  it('does not call a missing reading "Good"', () => {
    // `null <= 50` is true in JavaScript, so the old first branch caught it.
    expect(getAQIBand(null)).toEqual(UNKNOWN_AQI_BAND);
    expect(getAQIBand(undefined)).toEqual(UNKNOWN_AQI_BAND);
    expect(getAQIBand(NaN)).toEqual(UNKNOWN_AQI_BAND);
    expect(getAQIBand(null).label).not.toBe('Good');
    expect(getAQIBand(null).color).not.toBe('#1f9d55');
  });
});

describe('getPollutantColor', () => {
  it('keeps its existing ratio bands', () => {
    expect(getPollutantColor(5, 50)).toBe('#1f9d55');
    expect(getPollutantColor(40, 50)).toBe('#f59e0b');
    expect(getPollutantColor(200, 50)).toBe('#7f1d1d');
  });

  it('does not paint a missing pollutant as well within the limit', () => {
    // null / 50 === 0, which used to satisfy `ratio <= 0.5`.
    expect(getPollutantColor(null, 50)).toBe(UNKNOWN_AQI_BAND.color);
    expect(getPollutantColor(undefined, 50)).not.toBe('#1f9d55');
  });
});

describe('computeConfidence via fetchAirQualityByCoords (regression for #546)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', { Worker: undefined });
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('does not report 100% complete for a series with one real sample', async () => {
    stubFetch(payloadWith((hour) => (hour === 0 ? 5 : null)));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    // 1 of 24 readings per field = ~4%.
    expect(result.dataCompleteness).toBeLessThanOrEqual(10);
    expect(result.dataCompleteness).not.toBe(100);
    expect(result.confidenceScore).not.toBe('High');
  });

  it('still reports high confidence for a genuinely complete response', async () => {
    stubFetch(payloadWith(() => 42));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    expect(result.dataCompleteness).toBe(100);
    expect(result.confidenceScore).toBe('High');
  });

  it('scales completeness with the proportion of readings actually present', async () => {
    // Every other hour has a value.
    stubFetch(payloadWith((hour) => (hour % 2 === 0 ? 30 : null)));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    expect(result.dataCompleteness).toBe(50);
  });

  it('reports nothing complete when every reading is missing', async () => {
    stubFetch(payloadWith(() => null));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    expect(result.dataCompleteness).toBe(0);
    expect(result.confidenceScore).toBe('Low');
  });
});

describe('missing readings stay missing (regression for #546)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', { Worker: undefined });
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('does not turn an absent current reading into 0', async () => {
    stubFetch(payloadWith(() => null));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    expect(result.current.us_aqi).toBeNull();
    expect(result.current.pm2_5).toBeNull();
    expect(result.current.ozone).toBeNull();
    // The combination the old code produced: 0, rendered green as "Good".
    expect(result.current.us_aqi).not.toBe(0);
    expect(getAQIBand(result.current.us_aqi).label).toBe('Unknown');
  });

  it('preserves a genuine zero reading as 0, not as missing', async () => {
    stubFetch(payloadWith(() => 0));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);

    expect(result.current.us_aqi).toBe(0);
    expect(getAQIBand(result.current.us_aqi).label).toBe('Good');
  });

  it('leaves gaps in the trend as null rather than dropping the line to zero', async () => {
    stubFetch(payloadWith((hour) => (hour % 2 === 0 ? 80 : null)));

    const result = await fetchAirQualityByCoords(28.61, 77.20, undefined, true);
    const values = result.trend.map((t) => t.us_aqi);

    expect(values).toContain(null);
    expect(values).toContain(80);
    expect(values).not.toContain(0);
  });
});

describe('estimateWeeklyMonthlyAverages with gaps', () => {
  it('averages only the hours that carry a reading', () => {
    const withGaps = [{ us_aqi: 100 }, { us_aqi: null }, { us_aqi: 100 }, { us_aqi: null }];
    const dense = [{ us_aqi: 100 }, { us_aqi: 100 }];

    // Counting nulls as 0 would have halved the average.
    expect(estimateWeeklyMonthlyAverages(withGaps)).toEqual(
      estimateWeeklyMonthlyAverages(dense)
    );
    expect(estimateWeeklyMonthlyAverages(withGaps).weekly).toBe(105);
  });

  it('returns nulls rather than 0 when there is nothing to average', () => {
    expect(estimateWeeklyMonthlyAverages([{ us_aqi: null }])).toEqual({
      weekly: null,
      monthly: null,
      prediction: null,
    });
    expect(estimateWeeklyMonthlyAverages([])).toEqual({
      weekly: null,
      monthly: null,
      prediction: null,
    });
  });
});

describe('estimateExposureTime with gaps', () => {
  it('takes its slope between readings that exist', () => {
    const trend = [{ us_aqi: 50 }, { us_aqi: null }, { us_aqi: 70 }];
    const result = estimateExposureTime(trend, 60, 120);

    expect(result).not.toBeNull();
    expect(result.estimated).toBe(true);
    expect(result.message).toMatch(/hour|minute/i);
  });

  it('declines to estimate from fewer than two readings', () => {
    // A single point divided by (length - 1) === 0, producing NaN — which fell through
    // every branch to the reassuring "Likely Safe for several hours".
    expect(estimateExposureTime([{ us_aqi: 50 }], 40, 120)).toBeNull();
    expect(estimateExposureTime([{ us_aqi: null }, { us_aqi: null }], 40, 120)).toBeNull();
  });

  it('declines to estimate when the current AQI itself is missing', () => {
    expect(estimateExposureTime([{ us_aqi: 50 }, { us_aqi: 70 }], null, 120)).toBeNull();
  });
});
