import { describe, it, expect } from 'vitest';
import {
  AQI_STANDARDS,
  CPCB_STANDARD,
  calculateIndex,
  convertToStandardUnit,
  getBand,
  getStandard,
  subIndex,
} from './aqiStandards';
import { subAqi, BP_PM25 } from './airQualityService';

/**
 * The band boundaries are the load-bearing part of a breakpoint table: they are where a
 * reading changes what the app tells someone to do. Every test that pins a number here
 * pins it to a value derivable from the tables CPCB publishes, so the tables can be
 * checked against the source document rather than trusted.
 */

describe('CPCB standard — table integrity', () => {
  it('registers itself under its id', () => {
    expect(getStandard('cpcb')).toBe(CPCB_STANDARD);
    expect(AQI_STANDARDS.cpcb).toBe(CPCB_STANDARD);
  });

  it('returns null for an unknown or non-string id', () => {
    expect(getStandard('us-epa-v2')).toBeNull();
    expect(getStandard('')).toBeNull();
    expect(getStandard(undefined)).toBeNull();
    // @ts-expect-error — callers are JS; the guard exists for exactly this.
    expect(getStandard(42)).toBeNull();
  });

  it('scores the seven pollutants Open-Meteo can supply', () => {
    expect(Object.keys(CPCB_STANDARD.pollutants).sort()).toEqual([
      'ammonia',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'ozone',
      'pm10',
      'pm2_5',
      'sulphur_dioxide',
    ]);
  });

  it('keys every pollutant spec by its own key', () => {
    for (const [key, spec] of Object.entries(CPCB_STANDARD.pollutants)) {
      expect(spec.key).toBe(key);
    }
  });

  it('gives every breakpoint table ascending, non-overlapping rows', () => {
    for (const spec of Object.values(CPCB_STANDARD.pollutants)) {
      let previousHigh = -Infinity;
      let previousIndexHigh = -Infinity;

      for (const bp of spec.breakpoints) {
        expect(bp.cHigh).toBeGreaterThan(bp.cLow);
        expect(bp.iHigh).toBeGreaterThan(bp.iLow);
        expect(bp.cLow).toBeGreaterThan(previousHigh);
        expect(bp.iLow).toBeGreaterThan(previousIndexHigh);
        previousHigh = bp.cHigh;
        previousIndexHigh = bp.iHigh;
      }
    }
  });

  it('lands every table on the same index boundaries', () => {
    // A sub-index is only comparable across pollutants because every table maps onto the
    // same scale. A table that stopped at 300 would make its pollutant unable to ever
    // dominate, which is a silent failure rather than a visible one.
    const expected = [50, 100, 200, 300, 400, 500];

    for (const spec of Object.values(CPCB_STANDARD.pollutants)) {
      expect(spec.breakpoints.map((bp) => bp.iHigh)).toEqual(expected);
    }
  });

  it('records CO in mg/m3 and everything else in ug/m3', () => {
    expect(CPCB_STANDARD.pollutants.carbon_monoxide.unit).toBe('mg/m3');

    for (const [key, spec] of Object.entries(CPCB_STANDARD.pollutants)) {
      if (key === 'carbon_monoxide') continue;
      expect(spec.unit).toBe('ug/m3');
    }
  });

  it('records the averaging window each pollutant is defined against', () => {
    // CO and O3 are 8-hour; the rest are 24-hour. Getting this wrong produces a
    // plausible number from the wrong input, which is the hardest kind of bug to see.
    expect(CPCB_STANDARD.pollutants.carbon_monoxide.averaging).toBe('8h');
    expect(CPCB_STANDARD.pollutants.ozone.averaging).toBe('8h');
    expect(CPCB_STANDARD.pollutants.pm2_5.averaging).toBe('24h');
    expect(CPCB_STANDARD.pollutants.pm10.averaging).toBe('24h');
    expect(CPCB_STANDARD.pollutants.nitrogen_dioxide.averaging).toBe('24h');
    expect(CPCB_STANDARD.pollutants.sulphur_dioxide.averaging).toBe('24h');
    expect(CPCB_STANDARD.pollutants.ammonia.averaging).toBe('24h');
  });
});

describe('CPCB bands', () => {
  it('covers 0 to 500 with six contiguous bands', () => {
    expect(CPCB_STANDARD.bands).toHaveLength(6);
    expect(CPCB_STANDARD.bands[0].min).toBe(0);
    expect(CPCB_STANDARD.bands[5].max).toBe(500);

    for (let i = 1; i < CPCB_STANDARD.bands.length; i++) {
      expect(CPCB_STANDARD.bands[i].min).toBe(
        CPCB_STANDARD.bands[i - 1].max + 1
      );
    }
  });

  it('uses the CPCB band names, not the EPA ones', () => {
    expect(CPCB_STANDARD.bands.map((b) => b.label)).toEqual([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]);
  });

  it('carries a health advisory on every band', () => {
    for (const band of CPCB_STANDARD.bands) {
      expect(band.advisory.length).toBeGreaterThan(10);
    }
  });

  it('resolves each band boundary to the right band', () => {
    /** @type {Array<[number, string]>} */
    const cases = [
      [0, 'Good'],
      [50, 'Good'],
      [51, 'Satisfactory'],
      [100, 'Satisfactory'],
      [101, 'Moderate'],
      [200, 'Moderate'],
      [201, 'Poor'],
      [300, 'Poor'],
      [301, 'Very Poor'],
      [400, 'Very Poor'],
      [401, 'Severe'],
      [500, 'Severe'],
    ];

    for (const [index, label] of cases) {
      expect(getBand(index, CPCB_STANDARD).label).toBe(label);
    }
  });

  it('reports anything above the scale as Severe rather than unclassifiable', () => {
    // The air is not "unknown", it is off the top of the chart.
    expect(getBand(750, CPCB_STANDARD).label).toBe('Severe');
  });

  it('rejects values that are not usable index numbers', () => {
    expect(getBand(-1, CPCB_STANDARD)).toBeNull();
    expect(getBand(NaN, CPCB_STANDARD)).toBeNull();
    expect(getBand(Infinity, CPCB_STANDARD)).toBeNull();
    // @ts-expect-error — a string index is what a bad API payload looks like.
    expect(getBand('100', CPCB_STANDARD)).toBeNull();
  });
});

describe('subIndex — CPCB sub-index formula', () => {
  const PM25 = CPCB_STANDARD.pollutants.pm2_5.breakpoints;
  const PM10 = CPCB_STANDARD.pollutants.pm10.breakpoints;

  it('returns the band floor at each band floor', () => {
    expect(subIndex(0, PM25)).toBe(0);
    expect(subIndex(31, PM25)).toBe(51);
    expect(subIndex(61, PM25)).toBe(101);
    expect(subIndex(91, PM25)).toBe(201);
    expect(subIndex(121, PM25)).toBe(301);
    expect(subIndex(251, PM25)).toBe(401);
  });

  it('returns the band ceiling at each band ceiling', () => {
    expect(subIndex(30, PM25)).toBe(50);
    expect(subIndex(60, PM25)).toBe(100);
    expect(subIndex(90, PM25)).toBe(200);
    expect(subIndex(120, PM25)).toBe(300);
    expect(subIndex(250, PM25)).toBe(400);
  });

  it('interpolates linearly inside a band', () => {
    // 51 + (100-51)/(60-31) x (40-31) = 66.2 → 66
    expect(subIndex(40, PM25)).toBe(66);
    // 201 + (300-201)/(120-91) x (100-91) = 231.7 → 232
    expect(subIndex(100, PM25)).toBe(232);
    // 101 + (200-101)/(250-101) x (175-101) = 150.2 → 150
    expect(subIndex(175, PM10)).toBe(150);
  });

  it('closes the gaps between published bands by rounding', () => {
    // The tables jump 30 → 31.
    // 30.4 rounds to 30.
    expect(subIndex(30.4, PM25)).toBe(50);
    // 30.5 rounds to 31 (score 51).
    expect(subIndex(30.5, PM25)).toBe(51);
    // 30.9 rounds to 31 (score 51).
    expect(subIndex(30.9, PM25)).toBe(51);
    
    // 60.4 rounds to 60.
    expect(subIndex(60.4, PM25)).toBe(100);
    // 60.7 rounds to 61 (score 101).
    expect(subIndex(60.7, PM25)).toBe(101);
  });

  it('handles rounding at decimal precisions (CO mg/m3)', () => {
    const CO = CPCB_STANDARD.pollutants.carbon_monoxide.breakpoints;
    // CO table jumps from 1.0 to 1.1. It has 1 decimal place precision.
    // 1.04 rounds to 1.0.
    expect(subIndex(1.04, CO)).toBe(50);
    // 1.05 rounds to 1.1.
    expect(subIndex(1.05, CO)).toBe(51);
    // 2.04 rounds to 2.0.
    expect(subIndex(2.04, CO)).toBe(100);
    // 2.05 rounds to 2.1.
    expect(subIndex(2.05, CO)).toBe(101);
  });

  it('caps readings above the top band at the scale maximum', () => {
    expect(subIndex(9000, PM25)).toBe(500);
    expect(subIndex(9000, PM25, 500)).toBe(500);
  });

  it('returns null rather than 0 for unusable readings', () => {
    // Null keeps a bad reading out of the pollutant count as well as out of the
    // maximum, so noise cannot help satisfy the three-pollutant minimum.
    expect(subIndex(-5, PM25)).toBeNull();
    expect(subIndex(NaN, PM25)).toBeNull();
    expect(subIndex(Infinity, PM25)).toBeNull();
    // @ts-expect-error — deliberately unusable input; the guard is the subject.
    expect(subIndex('40', PM25)).toBeNull();
    expect(subIndex(null, PM25)).toBeNull();
    expect(subIndex(40, [])).toBeNull();
    expect(subIndex(40, null)).toBeNull();
  });

  it('is monotonic across the full PM2.5 scale', () => {
    let previous = -1;
    for (let c = 0; c <= 300; c += 1) {
      const value = subIndex(c, PM25);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe('convertToStandardUnit', () => {
  it('converts ug/m3 to mg/m3 for CO', () => {
    expect(convertToStandardUnit(2000, 'mg/m3')).toBe(2);
    expect(convertToStandardUnit(1500, 'mg/m3')).toBe(1.5);
  });

  it('leaves ug/m3 readings alone', () => {
    expect(convertToStandardUnit(2000, 'ug/m3')).toBe(2000);
  });

  it('is what stops clean CO air scoring 500', () => {
    const CO = CPCB_STANDARD.pollutants.carbon_monoxide.breakpoints;
    const readingInMicrograms = 900; // 0.9 mg/m3 — comfortably "Good"

    expect(subIndex(readingInMicrograms, CO)).toBe(500); // unconverted: nonsense
    expect(subIndex(convertToStandardUnit(readingInMicrograms, 'mg/m3'), CO)).toBe(45);
  });
});

describe('calculateIndex — the minimum-data rule', () => {
  it('refuses to publish an index from fewer than three pollutants', () => {
    const result = calculateIndex({ pm2_5: 100, pm10: 180 });

    expect(result.sufficient).toBe(false);
    expect(result.index).toBeNull();
    expect(result.band).toBeNull();
    expect(result.reason).toContain('at least 3 pollutants');
    // The sub-indices that did compute are still returned, so a caller can show the
    // breakdown while declining to show an index.
    expect(result.subIndices).toHaveLength(2);
  });

  it('refuses to publish an index built from gases alone', () => {
    const result = calculateIndex({
      nitrogen_dioxide: 50,
      ozone: 90,
      sulphur_dioxide: 60,
      ammonia: 300,
    });

    expect(result.sufficient).toBe(false);
    expect(result.index).toBeNull();
    expect(result.reason).toContain('pm2_5 or pm10');
  });

  it('publishes once three pollutants including PM are present', () => {
    const result = calculateIndex({
      pm2_5: 100,
      nitrogen_dioxide: 50,
      ozone: 90,
    });

    expect(result.sufficient).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.index).toBe(232);
  });

  it('does not let an unusable reading count toward the minimum', () => {
    // Three keys present, but one is noise. Counting it would publish an index from
    // two real pollutants, which is exactly what the rule exists to prevent.
    const result = calculateIndex({
      pm2_5: 100,
      pm10: 180,
      nitrogen_dioxide: -7,
    });

    expect(result.sufficient).toBe(false);
    expect(result.subIndices).toHaveLength(2);
  });

  it('skips missing and non-numeric entries rather than reading them as zero', () => {
    const result = calculateIndex({
      pm2_5: 100,
      pm10: null,
      nitrogen_dioxide: undefined,
      // @ts-expect-error — a string where a number belongs, as a bad payload supplies.
      ozone: 'ninety',
    });

    expect(result.subIndices).toHaveLength(1);
    expect(result.sufficient).toBe(false);
  });

  it('handles a missing or malformed readings object without throwing', () => {
    for (const input of [undefined, null, 'readings', 42]) {
      // @ts-expect-error — the point of the test is that none of these throw.
      const result = calculateIndex(input);
      expect(result.sufficient).toBe(false);
      expect(result.index).toBeNull();
      expect(result.subIndices).toEqual([]);
    }
  });
});

describe('calculateIndex — the published index', () => {
  const fullReading = {
    pm2_5: 100,
    pm10: 180,
    nitrogen_dioxide: 50,
    ozone: 90,
    carbon_monoxide: 1500,
    sulphur_dioxide: 60,
    ammonia: 300,
  };

  it('takes the maximum sub-index, not an average', () => {
    const result = calculateIndex(fullReading);

    expect(result.index).toBe(232);
    expect(result.band.label).toBe('Poor');
  });

  it('names the pollutant that produced the index', () => {
    const result = calculateIndex(fullReading);

    expect(result.dominantPollutant.key).toBe('pm2_5');
    expect(result.dominantPollutant.label).toBe('PM2.5');
    expect(result.dominantPollutant.concentration).toBe(100);
  });

  it('returns every sub-index worst first', () => {
    const result = calculateIndex(fullReading);
    const indices = result.subIndices.map((entry) => entry.index);

    expect(result.subIndices).toHaveLength(7);
    expect([...indices].sort((a, b) => b - a)).toEqual(indices);
  });

  it('reports concentrations as supplied, in ug/m3, even for CO', () => {
    const result = calculateIndex(fullReading);
    const co = result.subIndices.find((entry) => entry.key === 'carbon_monoxide');

    // The conversion is an implementation detail of the lookup. A caller rendering the
    // breakdown wants the number the API gave, in the unit the rest of the app uses.
    expect(co.concentration).toBe(1500);
    // 1500 ug/m3 is 1.5 mg/m3, in the 1.1-2.0 band:
    // 51 + (100-51)/(2.0-1.1) x (1.5-1.1) = 72.8 → 73
    expect(co.index).toBe(73);
  });

  it('lets a gas dominate when it is genuinely the worst', () => {
    const result = calculateIndex({
      pm2_5: 20,
      pm10: 40,
      sulphur_dioxide: 700,
    });

    expect(result.dominantPollutant.key).toBe('sulphur_dioxide');
    expect(result.band.label).toBe('Poor');
  });

  it('tags the result with the standard that produced it', () => {
    expect(calculateIndex(fullReading).standardId).toBe('cpcb');
  });

  it('carries the advisory for the band it reports', () => {
    const result = calculateIndex(fullReading);
    expect(result.band.advisory).toContain('prolonged exposure');
  });
});

describe('CPCB versus US EPA', () => {
  /**
   * The reason this module exists. If these ever agree, one of the two tables is wrong.
   */
  it('disagrees with the EPA on both the number and the direction', () => {
    const naqiAt40 = subIndex(40, CPCB_STANDARD.pollutants.pm2_5.breakpoints);
    const epaAt40 = subAqi(40, BP_PM25);

    const naqiAt100 = subIndex(100, CPCB_STANDARD.pollutants.pm2_5.breakpoints);
    const epaAt100 = subAqi(100, BP_PM25);

    expect(epaAt40).toBe(112);
    expect(naqiAt40).toBe(66);
    expect(naqiAt40).toBeLessThan(epaAt40);

    expect(epaAt100).toBe(174);
    expect(naqiAt100).toBe(232);
    // Reversed at the higher reading, which is why no single offset converts between
    // the two standards and why the app has to compute the one it intends to show.
    expect(naqiAt100).toBeGreaterThan(epaAt100);
  });

  it('puts the same air in differently named bands', () => {
    // 40 ug/m3 PM2.5 is "Satisfactory" to CPCB and past the EPA's sensitive-groups
    // threshold. Showing an EPA number under a CPCB band name would be worse than
    // showing no label at all.
    const naqiBand = getBand(66, CPCB_STANDARD);
    expect(naqiBand.label).toBe('Satisfactory');
  });
});
