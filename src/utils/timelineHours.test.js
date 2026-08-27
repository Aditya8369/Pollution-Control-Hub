import { describe, it, expect } from 'vitest';
import {
  HOURS_IN_DAY,
  clampHourIndex,
  formatHourLabel,
  getHourCount,
  getHourTime,
  getMaxHourIndex,
  initialHourIndex,
} from './timelineHours';

/** A grid point shaped like one entry from `fetchLocalGridTimeline`. */
function gridPoint(hours) {
  return {
    id: 'grid-center',
    lat: 28.6,
    lon: 77.2,
    areaName: 'Center',
    times: Array.from({ length: hours }, (_, i) => `2026-03-01T${String(i).padStart(2, '0')}:00`),
    hourly: { us_aqi: Array.from({ length: hours }, () => 100) },
  };
}

describe('getHourCount', () => {
  it('reports the length of the loaded series', () => {
    expect(getHourCount([gridPoint(24), gridPoint(24)])).toBe(24);
    expect(getHourCount([gridPoint(6)])).toBe(6);
  });

  it('returns 0 before anything has loaded', () => {
    expect(getHourCount([])).toBe(0);
    expect(getHourCount(undefined)).toBe(0);
    expect(getHourCount(null)).toBe(0);
  });

  it('does not throw when a grid point has no times array', () => {
    // `gridData[0]?.times.length` threw here: the optional chain stopped at the
    // array index and then dereferenced `.length` on undefined.
    expect(() => getHourCount([{ id: 'grid-center', hourly: {} }])).not.toThrow();
    expect(getHourCount([{ id: 'grid-center', hourly: {} }])).toBe(0);
  });

  it('does not throw when `times` is not an array', () => {
    expect(getHourCount([{ times: 'not-an-array' }])).toBe(0);
  });
});

describe('getMaxHourIndex', () => {
  it('is one below the count for a populated series', () => {
    expect(getMaxHourIndex(24)).toBe(23);
    expect(getMaxHourIndex(1)).toBe(0);
  });

  it('never goes below 0, so the range input keeps max >= min', () => {
    expect(getMaxHourIndex(0)).toBe(0);
    expect(getMaxHourIndex(-5)).toBe(0);
    expect(getMaxHourIndex(NaN)).toBe(0);
  });
});

describe('clampHourIndex', () => {
  it('leaves an in-range index alone', () => {
    expect(clampHourIndex(14, 24)).toBe(14);
    expect(clampHourIndex(0, 24)).toBe(0);
    expect(clampHourIndex(23, 24)).toBe(23);
  });

  it('pulls an index past the end back to the last hour', () => {
    // This is the case that blanked the map: hourIndex seeded to the local hour
    // (say 20) against a 6-hour series.
    expect(clampHourIndex(20, 6)).toBe(5);
  });

  it('pulls a negative index up to 0', () => {
    expect(clampHourIndex(-3, 24)).toBe(0);
  });

  it('returns 0 for an empty series', () => {
    expect(clampHourIndex(14, 0)).toBe(0);
  });

  it('falls back to 0 for non-finite input rather than propagating NaN into the slider', () => {
    expect(clampHourIndex(NaN, 24)).toBe(0);
    expect(clampHourIndex(Infinity, 24)).toBe(0);
    expect(clampHourIndex(undefined, 24)).toBe(0);
  });

  it('truncates a fractional index', () => {
    expect(clampHourIndex(7.9, 24)).toBe(7);
  });
});

describe('initialHourIndex', () => {
  it('opens on the current local hour when the series covers it', () => {
    const at14 = new Date(2026, 2, 1, 14, 30);
    expect(initialHourIndex(HOURS_IN_DAY, at14)).toBe(14);
  });

  it('opens on the last available hour when the series is short', () => {
    const at20 = new Date(2026, 2, 1, 20, 0);
    expect(initialHourIndex(6, at20)).toBe(5);
  });

  it('opens on 0 for an empty series', () => {
    expect(initialHourIndex(0, new Date(2026, 2, 1, 20, 0))).toBe(0);
  });
});

describe('getHourTime', () => {
  it('returns the timestamp at the index', () => {
    expect(getHourTime([gridPoint(24)], 3)).toBe('2026-03-01T03:00');
  });

  it('returns null past the end of the series instead of undefined', () => {
    expect(getHourTime([gridPoint(6)], 20)).toBeNull();
  });

  it('returns null with nothing loaded', () => {
    expect(getHourTime([], 0)).toBeNull();
    expect(getHourTime(undefined, 0)).toBeNull();
  });

  it('does not throw on a grid point with no times array', () => {
    expect(getHourTime([{ hourly: {} }], 0)).toBeNull();
  });
});

describe('formatHourLabel', () => {
  it('formats a timestamp as a clock time', () => {
    const label = formatHourLabel('2026-03-01T09:00');
    expect(label).toMatch(/09|9/);
  });

  it('returns an empty string rather than "Invalid Date"', () => {
    expect(formatHourLabel('not a date')).toBe('');
    expect(formatHourLabel(null)).toBe('');
    expect(formatHourLabel(undefined)).toBe('');
    expect(formatHourLabel('')).toBe('');
  });
});
