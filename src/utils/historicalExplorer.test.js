import { describe, it, expect } from 'vitest';
import {
  POLLUTANTS, VIEWS, getPollutantByKey,
  resampleToView, computeMovingAverage, computePercentageChange,
  computeHalfRangeChange, identifyHighestPeriods, buildExplorerCsv,
} from './historicalExplorer';

function makeDailyRow(date, overrides = {}) {
  return {
    date, avgAqi: 50, maxAqi: 60, pm25: 20, pm10: 40,
    no2: 15, ozone: 30, co: 500, hasReading: true, hoursMeasured: 24,
    ...overrides,
  };
}

function makeDays(startDateStr, n) {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push(makeDailyRow(d.toISOString().split('T')[0]));
  }
  return out;
}

describe('POLLUTANTS / VIEWS / getPollutantByKey', () => {
  it('exposes the expected pollutant set', () => {
    const keys = POLLUTANTS.map((p) => p.key);
    expect(keys).toEqual(['aqi', 'pm25', 'pm10', 'no2', 'ozone', 'co']);
  });

  it('exposes the four view granularities', () => {
    expect(VIEWS).toEqual(['daily', 'weekly', 'monthly', 'yearly']);
  });

  it('looks up a pollutant by key', () => {
    expect(getPollutantByKey('pm25').label).toBe('PM2.5');
    expect(getPollutantByKey('no2').unit).toBe('µg/m³');
  });

  it('falls back to AQI for an unknown key', () => {
    expect(getPollutantByKey('not-a-real-key').key).toBe('aqi');
  });
});

describe('resampleToView', () => {
  it('returns an empty array for empty input', () => {
    expect(resampleToView([], 'daily')).toEqual([]);
    expect(resampleToView([], 'monthly')).toEqual([]);
  });

  it('throws on an unknown view', () => {
    expect(() => resampleToView([{ date: '2024-01-01' }], 'hourly')).toThrow();
  });

  it('daily view is a pass-through with label/start injected', () => {
    const rows = [makeDailyRow('2024-01-01'), makeDailyRow('2024-01-02')];
    const out = resampleToView(rows, 'daily');
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('2024-01-01');
    expect(out[0].start).toBe('2024-01-01');
    expect(out[0].pm25).toBe(20);
  });

  it('monthly view buckets by YYYY-MM', () => {
    const rows = makeDays('2024-01-01', 60);
    const out = resampleToView(rows, 'monthly');
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('2024-01');
    expect(out[0].start).toBe('2024-01-01');
    expect(out[1].label).toBe('2024-02');
    expect(out[1].start).toBe('2024-02-01');
    expect(out[0].days).toBe(31);
    expect(out[1].days).toBe(29);
    expect(out[0].pm25).toBe(20);
    expect(out[0].pm25_max).toBe(20);
  });

  it('yearly view buckets by YYYY', () => {
    const rows = makeDays('2023-06-01', 365 + 180);
    const out = resampleToView(rows, 'yearly');
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('2023');
    expect(out[1].label).toBe('2024');
    expect(out[0].days + out[1].days).toBe(365 + 180);
  });

  it('weekly view produces ISO week keys', () => {
    const rows = makeDays('2024-01-01', 14);
    const out = resampleToView(rows, 'weekly');
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('2024-W01');
    expect(out[1].label).toBe('2024-W02');
    expect(out[0].days).toBe(7);
  });

  it('ignores null readings in the mean', () => {
    const rows = [
      makeDailyRow('2024-01-01', { pm25: 10 }),
      makeDailyRow('2024-01-02', { pm25: null }),
      makeDailyRow('2024-01-03', { pm25: 30 }),
    ];
    const out = resampleToView(rows, 'monthly');
    expect(out[0].pm25).toBe(20);
  });

  it('sorts output ascending by start date regardless of input order', () => {
    const rows = [
      makeDailyRow('2024-03-01'),
      makeDailyRow('2024-01-01'),
      makeDailyRow('2024-02-01'),
    ];
    const out = resampleToView(rows, 'monthly');
    expect(out.map((r) => r.label)).toEqual(['2024-01', '2024-02', '2024-03']);
  });
});

describe('computeMovingAverage', () => {
  it('returns an empty array for empty input', () => {
    expect(computeMovingAverage([], 'pm25', 7)).toEqual([]);
  });

  it('throws on a non-positive window', () => {
    expect(() => computeMovingAverage([{ pm25: 1 }], 'pm25', 0)).toThrow();
    expect(() => computeMovingAverage([{ pm25: 1 }], 'pm25', -3)).toThrow();
  });

  it('emits null for the first window-1 points', () => {
    const rows = makeDays('2024-01-01', 10).map((r, i) => ({ ...r, pm25: 10 + i }));
    const ma = computeMovingAverage(rows, 'pm25', 7);
    expect(ma.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(ma[6]).not.toBeNull();
  });

  it('returns a smaller-than-window series of all nulls', () => {
    const rows = makeDays('2024-01-01', 3);
    const ma = computeMovingAverage(rows, 'pm25', 7);
    expect(ma).toEqual([null, null, null]);
  });

  it('computes the correct mean over a sliding window', () => {
    const rows = [{ pm25: 10 }, { pm25: 20 }, { pm25: 30 }, { pm25: 40 }];
    const ma = computeMovingAverage(rows, 'pm25', 2);
    expect(ma).toEqual([null, 15, 25, 35]);
  });

  it('skips null values without shrinking the window count', () => {
    const rows = [{ pm25: 10 }, { pm25: null }, { pm25: 30 }, { pm25: 40 }];
    const ma = computeMovingAverage(rows, 'pm25', 3);
    expect(ma[2]).toBe(20);
  });
});

describe('computePercentageChange', () => {
  it('returns null for null or undefined inputs', () => {
    expect(computePercentageChange(null, 10)).toBeNull();
    expect(computePercentageChange(10, null)).toBeNull();
    expect(computePercentageChange(undefined, 10)).toBeNull();
  });

  it('returns null for a non-finite input', () => {
    expect(computePercentageChange(NaN, 10)).toBeNull();
    expect(computePercentageChange(10, Infinity)).toBeNull();
  });

  it('returns null when the old value is 0', () => {
    expect(computePercentageChange(0, 10)).toBeNull();
  });

  it('returns +X% for a positive change', () => {
    expect(computePercentageChange(100, 120)).toBe(20);
  });

  it('returns -X% for a negative change', () => {
    expect(computePercentageChange(120, 100)).toBe(-16.7);
  });

  it('returns 0 for no change', () => {
    expect(computePercentageChange(50, 50)).toBe(0);
  });

  it('handles a negative old value correctly', () => {
    expect(computePercentageChange(-20, -10)).toBe(50);
  });
});

describe('computeHalfRangeChange', () => {
  it('returns null for an empty series', () => {
    expect(computeHalfRangeChange([], 'pm25')).toBeNull();
  });

  it('returns null for a single-row series', () => {
    expect(computeHalfRangeChange([{ pm25: 10 }], 'pm25')).toBeNull();
  });

  it('returns null when one half has no readings', () => {
    const rows = [{ pm25: 10 }, { pm25: 20 }, { pm25: null }, { pm25: null }];
    expect(computeHalfRangeChange(rows, 'pm25')).toBeNull();
  });

  it('returns the percentage change between halves', () => {
    const rows = [{ pm25: 10 }, { pm25: 20 }, { pm25: 30 }, { pm25: 30 }];
    expect(computeHalfRangeChange(rows, 'pm25')).toBe(100);
  });
});

describe('identifyHighestPeriods', () => {
  it('returns an empty array for empty input', () => {
    expect(identifyHighestPeriods([], 'pm25', 5)).toEqual([]);
  });

  it('returns the top-N highest by value', () => {
    const rows = [
      { label: 'A', start: '2024-01-01', days: 30, pm25: 10 },
      { label: 'B', start: '2024-02-01', days: 28, pm25: 80 },
      { label: 'C', start: '2024-03-01', days: 31, pm25: 50 },
      { label: 'D', start: '2024-04-01', days: 30, pm25: 90 },
      { label: 'E', start: '2024-05-01', days: 31, pm25: 60 },
    ];
    const out = identifyHighestPeriods(rows, 'pm25', 3);
    expect(out).toHaveLength(3);
    expect(out[0].label).toBe('D');
    expect(out[1].label).toBe('B');
    expect(out[2].label).toBe('E');
  });

  it('breaks ties by days (sustained > spike)', () => {
    const rows = [
      { label: 'A', start: '2024-01-01', days: 7, pm25: 50 },
      { label: 'B', start: '2024-02-01', days: 30, pm25: 50 },
    ];
    const out = identifyHighestPeriods(rows, 'pm25', 2);
    expect(out[0].label).toBe('B');
  });

  it('filters out rows with null values for the field', () => {
    const rows = [
      { label: 'A', start: '2024-01-01', days: 30, pm25: 10 },
      { label: 'B', start: '2024-02-01', days: 28, pm25: null },
      { label: 'C', start: '2024-03-01', days: 31, pm25: 40 },
    ];
    const out = identifyHighestPeriods(rows, 'pm25', 5);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.label)).toEqual(['C', 'A']);
  });

  it('respects the topN cap', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      label: `L${i}`, start: `2024-0${(i % 9) + 1}-01`, days: 30, pm25: i,
    }));
    expect(identifyHighestPeriods(rows, 'pm25', 5)).toHaveLength(5);
  });
});

describe('buildExplorerCsv', () => {
  it('returns a header-only CSV for empty input', () => {
    const csv = buildExplorerCsv([], 'pm25', 'monthly');
    expect(csv).toBe('Period,Start,Days,PM2.5 Mean,PM2.5 Max');
  });

  it('renders one row per input entry', () => {
    const rows = [
      { label: '2024-01', start: '2024-01-01', days: 31, pm25: 22.5, pm25_max: 60 },
      { label: '2024-02', start: '2024-02-01', days: 29, pm25: 18.2, pm25_max: 45 },
    ];
    const csv = buildExplorerCsv(rows, 'pm25', 'monthly');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Period,Start,Days,PM2.5 Mean,PM2.5 Max');
    expect(lines[1]).toBe('2024-01,2024-01-01,31,22.5,60');
    expect(lines[2]).toBe('2024-02,2024-02-01,29,18.2,45');
  });

  it('adapts the header to the selected pollutant', () => {
    const rows = [{ label: '2024', start: '2024-01-01', days: 365, avgAqi: 80, avgAqi_max: 200 }];
    const csv = buildExplorerCsv(rows, 'aqi', 'yearly');
    expect(csv.split('\n')[0]).toBe('Period,Start,Days,AQI Mean,AQI Max');
  });

  it('emits empty strings for null values', () => {
    const rows = [{ label: '2024-01', start: '2024-01-01', days: 31, pm25: null, pm25_max: null }];
    const csv = buildExplorerCsv(rows, 'pm25', 'monthly');
    const lines = csv.split('\n');
    expect(lines[1]).toBe('2024-01,2024-01-01,31,,');
  });
});
