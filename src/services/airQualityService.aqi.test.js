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
    // 23.75 rounds to 23.8, which gives score 76.
    expect(subAqi(23.75, BP_PM25)).toBe(76);
  });
});

describe('subAqi - breakpoint gaps (regression for #496)', () => {
  it('rounds PM2.5 values between 12.0 and 12.1 correctly rather than truncating or reporting 0', () => {
    // 12.04 rounds down to 12.0 (score 50)
    expect(subAqi(12.04, BP_PM25)).toBe(50);
    // 12.05 rounds up to 12.1 (score 51)
    expect(subAqi(12.05, BP_PM25)).toBe(51);
    // 12.09 rounds up to 12.1 (score 51)
    expect(subAqi(12.09, BP_PM25)).toBe(51);
  });

  it('rounds values correctly in the higher PM2.5 gaps', () => {
    // Gap 35.4 to 35.5
    expect(subAqi(35.44, BP_PM25)).toBe(100);
    expect(subAqi(35.45, BP_PM25)).toBe(101);
    
    // Gap 55.4 to 55.5
    expect(subAqi(55.44, BP_PM25)).toBe(150);
    expect(subAqi(55.45, BP_PM25)).toBe(151);

    // Gap 150.4 to 150.5
    expect(subAqi(150.44, BP_PM25)).toBe(200);
    expect(subAqi(150.45, BP_PM25)).toBe(201);
    
    // Gap 250.4 to 250.5
    expect(subAqi(250.44, BP_PM25)).toBe(300);
    expect(subAqi(250.45, BP_PM25)).toBe(301);
  });

  it('rounds fractional values correctly in the integer-precision tables', () => {
    // PM10: 54.4 -> 54 (score 50), 54.5 -> 55 (score 51)
    expect(subAqi(54.4, BP_PM10)).toBe(50);
    expect(subAqi(54.5, BP_PM10)).toBe(51);

    // NO2: 100.4 -> 100 (score 50), 100.5 -> 101 (score 51)
    expect(subAqi(100.4, BP_NO2)).toBe(50);
    expect(subAqi(100.5, BP_NO2)).toBe(51);
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
    // 12.05, 54.5, 100.5, 116.5, 4700.5 all round up to the next band (score 51)
    const score = estimateAQI(12.05, 54.5, 100.5, 116.5, 4700.5);
    expect(score).toBe(51);
    expect(getAQIBand(score).label).toBe('Moderate');
  });

  it('does not label genuinely unhealthy air as Good because of a gap', () => {
    // 55.45 rounds up to 55.5 (score 151) which is "Unhealthy"
    const score = estimateAQI(55.45, 0, 0, 0, 0);
    expect(score).toBe(151);
    expect(getAQIBand(score).label).toBe('Unhealthy');
  });

  it('stays within the 0-500 scale for extreme inputs', () => {
    expect(estimateAQI(9999, 9999, 9999, 9999, 99999)).toBe(500);
    expect(estimateAQI(0, 0, 0, 0, 0)).toBe(0);
  });
});
