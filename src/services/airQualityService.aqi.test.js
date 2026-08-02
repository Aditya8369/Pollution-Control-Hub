import { describe, it, expect } from 'vitest';
import {
  subAqi,
  estimateAQI,
  getAQIBand,
  BP_PM25,
  BP_PM10,
  BP_NO2,
  BP_O3,
  BP_CO,
} from '../services/airQualityService';

const ALL_TABLES = [
  ['PM2.5', BP_PM25],
  ['PM10', BP_PM10],
  ['NO2', BP_NO2],
  ['O3', BP_O3],
  ['CO', BP_CO],
];

describe('subAqi - published breakpoint anchors', () => {
  it('reproduces the EPA anchor values for PM2.5', () => {
    expect(subAqi(0, BP_PM25)).toBe(0);
    expect(subAqi(12.0, BP_PM25)).toBe(50);
    expect(subAqi(12.1, BP_PM25)).toBe(51);
    expect(subAqi(35.4, BP_PM25)).toBe(100);
    expect(subAqi(55.4, BP_PM25)).toBe(150);
    expect(subAqi(150.4, BP_PM25)).toBe(200);
    expect(subAqi(250.4, BP_PM25)).toBe(300);
    expect(subAqi(500.4, BP_PM25)).toBe(500);
  });

  it('reproduces the EPA anchor values for PM10', () => {
    expect(subAqi(54, BP_PM10)).toBe(50);
    expect(subAqi(55, BP_PM10)).toBe(51);
    expect(subAqi(154, BP_PM10)).toBe(100);
    expect(subAqi(604, BP_PM10)).toBe(500);
  });

  it('interpolates linearly inside a band', () => {
    // Midpoint of the 12.1–35.4 band (index 51–100).
    expect(subAqi(23.75, BP_PM25)).toBe(75);
  });
});

describe('subAqi - breakpoint gaps (regression for #496)', () => {
  it('does not report 0 for PM2.5 values between 12.0 and 12.1', () => {
    for (const value of [12.01, 12.05, 12.09]) {
      const score = subAqi(value, BP_PM25);
      expect(score, `PM2.5 ${value}`).not.toBe(0);
      // Truncated to the table's precision (12.0), per the EPA algorithm.
      expect(score, `PM2.5 ${value}`).toBe(50);
    }
  });

  it('does not report 0 for values in the higher PM2.5 gaps', () => {
    expect(subAqi(35.45, BP_PM25)).toBe(100);
    expect(subAqi(55.45, BP_PM25)).toBe(150);
    expect(subAqi(150.45, BP_PM25)).toBe(200);
    expect(subAqi(250.45, BP_PM25)).toBe(300);
  });

  it('does not report 0 for fractional values in the integer-precision tables', () => {
    expect(subAqi(54.5, BP_PM10)).toBe(50);
    expect(subAqi(100.5, BP_NO2)).toBe(50);
    expect(subAqi(116.5, BP_O3)).toBe(50);
    expect(subAqi(4700.5, BP_CO)).toBe(50);
  });

  it('leaves no gap between any two adjacent bands in any table', () => {
    for (const [name, table] of ALL_TABLES) {
      for (let i = 0; i < table.length - 1; i++) {
        const between = (table[i].cHigh + table[i + 1].cLow) / 2;
        if (between === table[i].cHigh) continue; // contiguous already
        expect(subAqi(between, table), `${name} @ ${between}`).toBeGreaterThan(0);
      }
    }
  });

  it('is monotonically non-decreasing across each table', () => {
    for (const [name, table] of ALL_TABLES) {
      const ceiling = table[table.length - 1].cHigh;
      const step = ceiling / 400;
      let previous = -1;
      for (let c = step; c <= ceiling; c += step) {
        const score = subAqi(c, table);
        expect(score, `${name} @ ${c.toFixed(3)}`).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });
});

describe('subAqi - out-of-range and malformed input', () => {
  it('returns 500 above the top of the table', () => {
    expect(subAqi(900, BP_PM25)).toBe(500);
    expect(subAqi(1000, BP_PM10)).toBe(500);
  });

  it('treats negative readings as unmeasurable rather than clean', () => {
    expect(subAqi(-5, BP_PM25)).toBe(0);
  });

  it('returns 0 for NaN, Infinity and non-numeric input', () => {
    // Non-finite values are broken data, not off-scale readings, so they are treated
    // the same as a missing measurement rather than being mapped to the 500 ceiling.
    expect(subAqi(NaN, BP_PM25)).toBe(0);
    expect(subAqi(Infinity, BP_PM25)).toBe(0);
    expect(subAqi(-Infinity, BP_PM25)).toBe(0);
    // @ts-ignore - deliberately wrong type
    expect(subAqi('12.5', BP_PM25)).toBe(0);
    // @ts-ignore - deliberately wrong type
    expect(subAqi(undefined, BP_PM25)).toBe(0);
  });

  it('returns 0 when the breakpoint table is missing or empty', () => {
    expect(subAqi(25, [])).toBe(0);
    // @ts-ignore - deliberately wrong type
    expect(subAqi(25, undefined)).toBe(0);
  });
});

describe('estimateAQI', () => {
  it('reports the governing (highest) pollutant sub-index', () => {
    // PM10 at 155 → 101; everything else is well below that.
    expect(estimateAQI(5, 155, 10, 20, 500)).toBe(101);
  });

  it('no longer collapses to 0 when every pollutant lands in a gap', () => {
    const score = estimateAQI(12.05, 54.5, 100.5, 116.5, 4700.5);
    expect(score).toBe(50);
    expect(getAQIBand(score).label).toBe('Good');
  });

  it('does not label genuinely unhealthy air as Good because of a gap', () => {
    // PM2.5 just past the 55.4/55.5 boundary is "Unhealthy for Sensitive Groups".
    const score = estimateAQI(55.45, 0, 0, 0, 0);
    expect(score).toBe(150);
    expect(getAQIBand(score).label).toBe('Unhealthy (Sensitive)');
  });

  it('stays within the 0-500 scale for extreme inputs', () => {
    expect(estimateAQI(9999, 9999, 9999, 9999, 99999)).toBe(500);
    expect(estimateAQI(0, 0, 0, 0, 0)).toBe(0);
  });
});
