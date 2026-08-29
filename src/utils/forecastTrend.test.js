import { describe, it, expect } from 'vitest';
import {
  hourlyTrend,
  attributionBarWidth,
  clampDayIndex,
  usableAttributions,
  attributedTotal,
} from './forecastTrend';

/** Cover for #1073. */

/** @param {number} aqiMax */
function hour(aqiMax) {
  return { hour: '09:00', aqiMin: aqiMax - 20, aqiMax, dominantPollutant: 'PM2.5' };
}

describe('hourlyTrend (#1073)', () => {
  it('reports rising when the hour is higher than the one before it', () => {
    expect(hourlyTrend(hour(180), hour(140)).direction).toBe('rising');
  });

  it('reports falling when the hour is lower', () => {
    expect(hourlyTrend(hour(140), hour(180)).direction).toBe('falling');
  });

  it('reports steady for a flat hour rather than calling it falling', () => {
    // The old ternary printed "↓ Falling" for this, so a smoothed overnight
    // stretch read as hours of steady improvement.
    expect(hourlyTrend(hour(150), hour(150)).direction).toBe('steady');
    expect(hourlyTrend(hour(150), hour(150)).label).toBe('Steady');
  });

  it('has no answer for the first hour of a day', () => {
    // The specific defect: index 0 has nothing to compare against, and was
    // labelled "↓ Falling" on every day of every forecast.
    const trend = hourlyTrend(hour(150), undefined);
    expect(trend.direction).toBe('unknown');
    expect(trend.label).not.toMatch(/falling/i);
  });

  it('does not point an arrow where there is no direction', () => {
    expect(hourlyTrend(hour(150), undefined).symbol).toBe('—');
  });

  it('has no answer when either reading is missing', () => {
    expect(hourlyTrend({ hour: '01:00' }, hour(120)).direction).toBe('unknown');
    expect(hourlyTrend(hour(120), { hour: '00:00' }).direction).toBe('unknown');
  });

  it('does not coerce a stringified reading into a comparison', () => {
    // '90' > 80 is true in JS. Comparing them would report rising off a value
    // that is not a reading.
    expect(hourlyTrend({ aqiMax: '90' }, hour(80)).direction).toBe('unknown');
  });

  it('has no answer for NaN', () => {
    expect(hourlyTrend({ aqiMax: NaN }, hour(80)).direction).toBe('unknown');
  });

  it('colours rising and falling differently', () => {
    expect(hourlyTrend(hour(180), hour(140)).className)
      .not.toBe(hourlyTrend(hour(140), hour(180)).className);
  });
});

describe('attributionBarWidth (#1073)', () => {
  it('draws a share at its own width, not relative to the largest', () => {
    // The old code drew this at 100% because it was the largest of the set.
    expect(attributionBarWidth(22)).toBe(22);
    expect(attributionBarWidth(80)).toBe(80);
  });

  it('keeps five near-equal shares near-equal and short', () => {
    const shares = [22, 20, 19, 19, 20].map(attributionBarWidth);
    expect(Math.max(...shares)).toBeLessThan(25);
  });

  it('clamps a share above 100', () => {
    expect(attributionBarWidth(140)).toBe(100);
  });

  it('clamps a negative share to zero', () => {
    expect(attributionBarWidth(-5)).toBe(0);
  });

  it('draws nothing for a missing share', () => {
    expect(attributionBarWidth(undefined)).toBe(0);
    expect(attributionBarWidth('40')).toBe(0);
  });
});

describe('clampDayIndex (#1073)', () => {
  it('leaves a valid selection alone', () => {
    expect(clampDayIndex(2, 3)).toBe(2);
  });

  it('pulls a stale selection back onto a shorter forecast', () => {
    expect(clampDayIndex(5, 3)).toBe(2);
  });

  it('returns 0 when there is nothing to select', () => {
    expect(clampDayIndex(2, 0)).toBe(0);
    expect(clampDayIndex(2, undefined)).toBe(0);
  });

  it('rejects a negative or fractional index', () => {
    expect(clampDayIndex(-1, 3)).toBe(0);
    expect(clampDayIndex(1.5, 3)).toBe(0);
  });
});

describe('usableAttributions (#1073)', () => {
  it('keeps well-formed entries as they are', () => {
    const input = [{ source: 'VEHICULAR', percentage: 40, indicators: ['NO₂ peak'] }];
    expect(usableAttributions(input)).toEqual(input);
  });

  it('drops an entry with no source', () => {
    expect(usableAttributions([{ percentage: 40 }])).toEqual([]);
  });

  it('defaults a missing percentage to zero rather than NaN', () => {
    expect(usableAttributions([{ source: 'NATURAL' }])[0].percentage).toBe(0);
  });

  it('defaults missing indicators to an empty list', () => {
    expect(usableAttributions([{ source: 'NATURAL', percentage: 5 }])[0].indicators).toEqual([]);
  });

  it('returns an empty list for a non-array', () => {
    expect(usableAttributions(undefined)).toEqual([]);
    expect(usableAttributions({ VEHICULAR: 40 })).toEqual([]);
  });
});

describe('attributedTotal (#1073)', () => {
  it('sums the shares', () => {
    expect(attributedTotal([{ percentage: 40 }, { percentage: 35 }, { percentage: 25 }])).toBe(100);
  });

  it('reports an incomplete account as incomplete', () => {
    expect(attributedTotal([{ percentage: 40 }, { percentage: 35 }])).toBe(75);
  });

  it('ignores entries with no usable share', () => {
    expect(attributedTotal([{ percentage: 40 }, { percentage: null }])).toBe(40);
  });

  it('returns 0 for a non-array', () => {
    expect(attributedTotal(null)).toBe(0);
  });
});
