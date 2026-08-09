import { describe, it, expect } from 'vitest';
import {
  ACTIVITIES,
  SAFE_DAILY_EXPOSURE,
  WHO_PM25_24H_GUIDELINE,
  aqiToPm25,
  calculateExposure,
  getActivity,
  getSeverity,
} from './exposureModel';

/**
 * Regression cover for #548.
 *
 * The score was `hours × multiplier × AQI` and the benchmark was the constant 360. The
 * score scaled with AQI, the benchmark did not, so the ratio was meaningless — the
 * component's own default routine reported 214% at AQI 50 and 428% at AQI 100, both
 * shown as a red "HIGH EXPOSURE RISK".
 */

/** The routine the component ships with — a full 24-hour day. */
const DEFAULT_ROUTINE = [
  { id: 1, type: 'indoor_purified', hours: 8 },
  { id: 2, type: 'indoor_standard', hours: 14 },
  { id: 3, type: 'commute_transit', hours: 1 },
  { id: 4, type: 'outdoor_exercise', hours: 1 },
];

describe('aqiToPm25', () => {
  it('inverts the EPA breakpoints at the band boundaries', () => {
    expect(aqiToPm25(0)).toBe(0);
    expect(aqiToPm25(50)).toBe(12);
    expect(aqiToPm25(100)).toBe(35.4);
    expect(aqiToPm25(150)).toBe(55.4);
    expect(aqiToPm25(200)).toBe(150.4);
    expect(aqiToPm25(300)).toBe(250.4);
  });

  it('interpolates within a band', () => {
    const mid = aqiToPm25(75);
    expect(mid).toBeGreaterThan(12);
    expect(mid).toBeLessThan(35.4);
  });

  it('increases monotonically with AQI', () => {
    let previous = -1;
    for (let aqi = 0; aqi <= 500; aqi += 10) {
      const value = aqiToPm25(aqi);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('handles junk input without producing NaN', () => {
    expect(aqiToPm25(null)).toBe(0);
    expect(aqiToPm25(undefined)).toBe(0);
    expect(aqiToPm25(NaN)).toBe(0);
    expect(aqiToPm25(-20)).toBe(0);
  });

  it('caps at the top of the published scale', () => {
    expect(aqiToPm25(500)).toBe(500.4);
    expect(aqiToPm25(900)).toBe(500.4);
  });
});

describe('the benchmark is expressed in the score\'s own units', () => {
  it('is the WHO 24-hour guideline sustained for a day', () => {
    expect(SAFE_DAILY_EXPOSURE).toBe(WHO_PM25_24H_GUIDELINE * 24);
    expect(SAFE_DAILY_EXPOSURE).toBe(360);
  });

  it('scores a day spent breathing exactly the guideline at 100%', () => {
    // AQI 62.5 is the middle of the Moderate band; use the concentration directly
    // instead, via a routine whose multipliers sum to 1 per hour.
    const routine = [{ id: 1, type: 'neutral', hours: 24 }];
    const result = calculateExposure(routine, 100);

    // 'neutral' is unknown, so it falls back to indoor_standard (0.7).
    expect(result.breakdown[0].activity.id).toBe('indoor_standard');
    expect(result.exposure).toBe(Math.round(24 * 0.7 * 35.4));
  });
});

describe('calculateExposure (regression for #548)', () => {
  it('does not call a clean-air day high risk', () => {
    // AQI 50 is the top of the "Good" band. The old formula gave 770 points = 214%.
    const result = calculateExposure(DEFAULT_ROUTINE, 50);

    expect(result.percentOfGuideline).toBeLessThan(100);
    expect(result.severity.label).toBe('WITHIN GUIDELINE');
    expect(result.severity.color).not.toBe('#ef4444');
  });

  it('keeps a very clean day comfortably under the guideline', () => {
    const result = calculateExposure(DEFAULT_ROUTINE, 20);

    expect(result.percentOfGuideline).toBeLessThan(50);
    expect(result.severity.label).toBe('WITHIN GUIDELINE');
  });

  it('does flag a genuinely polluted day', () => {
    const result = calculateExposure(DEFAULT_ROUTINE, 250);

    expect(result.percentOfGuideline).toBeGreaterThan(100);
    expect(result.severity.label).toMatch(/HIGH EXPOSURE/);
  });

  it('separates clean from polluted days instead of pinning everything red', () => {
    const labels = [20, 50, 100, 200, 350].map(
      (aqi) => calculateExposure(DEFAULT_ROUTINE, aqi).severity.label
    );

    // The old model returned HIGH EXPOSURE RISK for every one of these.
    expect(new Set(labels).size).toBeGreaterThan(1);
    expect(labels[0]).toBe('WITHIN GUIDELINE');
    expect(labels[labels.length - 1]).toMatch(/HIGH EXPOSURE/);
  });

  it('scales the percentage linearly with concentration, not with the index', () => {
    const atFifty = calculateExposure(DEFAULT_ROUTINE, 50);
    const atHundred = calculateExposure(DEFAULT_ROUTINE, 100);

    // AQI 100 is ~2.95x the concentration of AQI 50 (35.4 vs 12.0), not 2x.
    const ratio = atHundred.exposure / atFifty.exposure;
    expect(ratio).toBeGreaterThan(2.8);
    expect(ratio).toBeLessThan(3.1);
  });

  it('reports the ambient concentration behind the AQI', () => {
    expect(calculateExposure(DEFAULT_ROUTINE, 100).ambientPm25).toBe(35.4);
  });
});

describe('calculateExposure - day coverage', () => {
  it('flags a routine shorter than a day', () => {
    const result = calculateExposure([{ id: 1, type: 'indoor_standard', hours: 6 }], 100);

    expect(result.totalHours).toBe(6);
    expect(result.dayCoverage).toBe('short');
  });

  it('flags a routine longer than a day', () => {
    const result = calculateExposure(
      [
        { id: 1, type: 'indoor_standard', hours: 20 },
        { id: 2, type: 'outdoor_walking', hours: 20 },
      ],
      100
    );

    expect(result.totalHours).toBe(40);
    expect(result.dayCoverage).toBe('long');
  });

  it('flags nothing when the routine is exactly a day', () => {
    const result = calculateExposure(DEFAULT_ROUTINE, 100);

    expect(result.totalHours).toBe(24);
    expect(result.dayCoverage).toBeNull();
  });
});

describe('calculateExposure - input handling', () => {
  it('returns a zeroed result for an empty routine', () => {
    const result = calculateExposure([], 100);

    expect(result.exposure).toBe(0);
    expect(result.totalHours).toBe(0);
    expect(result.percentOfGuideline).toBe(0);
    expect(result.dayCoverage).toBeNull();
  });

  it('ignores negative or non-numeric hours instead of producing NaN', () => {
    const result = calculateExposure(
      [
        { id: 1, type: 'indoor_standard', hours: -5 },
        { id: 2, type: 'indoor_standard', hours: 'abc' },
        { id: 3, type: 'indoor_standard', hours: 4 },
      ],
      100
    );

    expect(Number.isFinite(result.exposure)).toBe(true);
    expect(result.totalHours).toBe(4);
  });

  it('survives a missing activities list', () => {
    expect(calculateExposure(undefined, 100).exposure).toBe(0);
    expect(calculateExposure(null, 100).exposure).toBe(0);
  });

  it('produces no exposure when the AQI is unknown', () => {
    expect(calculateExposure(DEFAULT_ROUTINE, null).exposure).toBe(0);
    expect(calculateExposure(DEFAULT_ROUTINE, NaN).exposure).toBe(0);
  });
});

describe('getActivity', () => {
  it('resolves every shipped activity id', () => {
    for (const activity of ACTIVITIES) {
      expect(getActivity(activity.id).id).toBe(activity.id);
    }
  });

  it('falls back to standard indoors for an unknown id', () => {
    expect(getActivity('made_up').id).toBe('indoor_standard');
    expect(getActivity(undefined).id).toBe('indoor_standard');
  });
});

describe('getSeverity', () => {
  it('bands the ratio without leaving a gap', () => {
    expect(getSeverity(0).label).toBe('WITHIN GUIDELINE');
    expect(getSeverity(1).label).toBe('WITHIN GUIDELINE');
    expect(getSeverity(1.5).label).toBe('ABOVE GUIDELINE');
    expect(getSeverity(3).label).toBe('HIGH EXPOSURE');
    expect(getSeverity(10).label).toBe('VERY HIGH EXPOSURE');
  });
});
