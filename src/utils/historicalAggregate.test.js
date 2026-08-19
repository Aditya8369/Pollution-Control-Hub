import { describe, it, expect } from 'vitest';
import { aggregateHourlyToDaily, dayAqi } from './historicalAggregate';

/**
 * Builds an Open-Meteo-shaped payload from a list of [timestamp, us_aqi] pairs.
 * Pollutant series default to null so a test can isolate the AQI behaviour.
 */
function payload(rows, overrides = {}) {
  return {
    hourly: {
      time: rows.map((r) => r[0]),
      us_aqi: rows.map((r) => r[1]),
      pm2_5: rows.map(() => null),
      pm10: rows.map(() => null),
      carbon_monoxide: rows.map(() => null),
      nitrogen_dioxide: rows.map(() => null),
      ozone: rows.map(() => null),
      ...overrides,
    },
  };
}

/** A full day of 24 hourly slots, every one of them null. */
function emptyDay(date) {
  return Array.from({ length: 24 }, (_, h) => [
    `${date}T${String(h).padStart(2, '0')}:00`,
    null,
  ]);
}

describe('aggregateHourlyToDaily - days with no readings (regression for #645)', () => {
  it('reports a day of all-null AQI as null, not 0', () => {
    const { daily } = aggregateHourlyToDaily(payload(emptyDay('2024-03-01')));

    expect(daily).toHaveLength(1);
    expect(daily[0].date).toBe('2024-03-01');
    expect(daily[0].avgAqi).toBeNull();
    expect(daily[0].maxAqi).toBeNull();
    expect(daily[0].hasReading).toBe(false);
  });

  it('does not let an empty day masquerade as a reading of zero', () => {
    const { daily } = aggregateHourlyToDaily(
      payload([
        ...emptyDay('2024-03-01'),
        ['2024-03-02T00:00', 0], // a genuine measurement of 0
      ])
    );

    const [empty, measuredZero] = daily;

    // The whole point: these two must be distinguishable.
    expect(empty.maxAqi).toBeNull();
    expect(measuredZero.maxAqi).toBe(0);
    expect(empty.hasReading).toBe(false);
    expect(measuredZero.hasReading).toBe(true);
  });

  it('keeps empty days out of the overall average', () => {
    const rows = [
      ...emptyDay('2024-03-01'),
      ['2024-03-02T00:00', 100],
      ['2024-03-03T00:00', 200],
    ];

    const { overallAvg, daysInRange, daysWithReadings } = aggregateHourlyToDaily(payload(rows));

    // Old behaviour: (0 + 100 + 200) / 3 = 100, biased clean by the empty day.
    expect(overallAvg).toBe(150);
    expect(daysInRange).toBe(3);
    expect(daysWithReadings).toBe(2);
  });

  it('returns a null overall average when nothing at all was measured', () => {
    const result = aggregateHourlyToDaily(payload(emptyDay('2024-03-01')));

    expect(result.overallAvg).toBeNull();
    expect(result.daysWithReadings).toBe(0);
    expect(result.monthly).toEqual([]);
  });

  it('keeps empty days out of the monthly averages', () => {
    const rows = [
      ...emptyDay('2024-03-01'),
      ['2024-03-02T00:00', 90],
      ['2024-04-01T00:00', 40],
    ];

    const { monthly } = aggregateHourlyToDaily(payload(rows));

    expect(monthly).toEqual([
      { month: '2024-03', avgAqi: 90, maxAqi: 90, daysMeasured: 1 },
      { month: '2024-04', avgAqi: 40, maxAqi: 40, daysMeasured: 1 },
    ]);
  });

  it('records how many hours of a day carried a reading', () => {
    const rows = [
      ['2024-03-01T00:00', 50],
      ['2024-03-01T01:00', null],
      ['2024-03-01T02:00', 70],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    expect(daily[0].hoursMeasured).toBe(2);
    expect(daily[0].avgAqi).toBe(60);
  });
});

describe('aggregateHourlyToDaily - daily arithmetic', () => {
  it('averages and maxes the hours that have values', () => {
    const rows = [
      ['2024-03-01T00:00', 40],
      ['2024-03-01T01:00', 80],
      ['2024-03-01T02:00', 120],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    expect(daily[0].avgAqi).toBe(80);
    expect(daily[0].maxAqi).toBe(120);
  });

  it('ignores null hours inside an otherwise-measured day', () => {
    const rows = [
      ['2024-03-01T00:00', 100],
      ['2024-03-01T01:00', null],
      ['2024-03-01T02:00', 200],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    // Mean over the two real values, not over three with a null coerced to 0.
    expect(daily[0].avgAqi).toBe(150);
    expect(daily[0].maxAqi).toBe(200);
  });

  it('rejects non-numeric junk rather than poisoning the mean with NaN', () => {
    const rows = [
      ['2024-03-01T00:00', 100],
      ['2024-03-01T01:00', 'n/a'],
      ['2024-03-01T02:00', NaN],
      ['2024-03-01T03:00', 200],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    expect(daily[0].avgAqi).toBe(150);
    expect(Number.isFinite(daily[0].maxAqi)).toBe(true);
  });

  it('averages pollutants independently of the AQI series', () => {
    const rows = [
      ['2024-03-01T00:00', null],
      ['2024-03-01T01:00', null],
    ];

    const { daily } = aggregateHourlyToDaily(
      payload(rows, { pm2_5: [10, 20], pm10: [null, null] })
    );

    // No AQI, but PM2.5 was measured -- the day reports what it has and nulls the rest.
    expect(daily[0].maxAqi).toBeNull();
    expect(daily[0].pm25).toBe(15);
    expect(daily[0].pm10).toBeNull();
  });

  it('rounds pollutant means to one decimal', () => {
    const rows = [
      ['2024-03-01T00:00', 50],
      ['2024-03-01T01:00', 50],
      ['2024-03-01T02:00', 50],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows, { pm2_5: [10, 11, 11] }));

    expect(daily[0].pm25).toBe(10.7);
  });

  it('skips falsy timestamps without creating a bucket for them', () => {
    const rows = [
      ['2024-03-01T00:00', 50],
      [null, 999],
      ['', 999],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    expect(daily).toHaveLength(1);
    expect(daily[0].avgAqi).toBe(50);
  });
});

describe('aggregateHourlyToDaily - ordering and shape', () => {
  it('returns days in chronological order regardless of input order', () => {
    const rows = [
      ['2024-03-03T00:00', 30],
      ['2024-03-01T00:00', 10],
      ['2024-03-02T00:00', 20],
    ];

    const { daily } = aggregateHourlyToDaily(payload(rows));

    expect(daily.map((d) => d.date)).toEqual(['2024-03-01', '2024-03-02', '2024-03-03']);
  });

  it('sorts monthly buckets chronologically across a year boundary', () => {
    const rows = [
      ['2024-01-01T00:00', 10],
      ['2023-12-01T00:00', 20],
    ];

    const { monthly } = aggregateHourlyToDaily(payload(rows));

    expect(monthly.map((m) => m.month)).toEqual(['2023-12', '2024-01']);
  });

  it('handles an empty payload without throwing', () => {
    const result = aggregateHourlyToDaily({ hourly: { time: [], us_aqi: [] } });

    expect(result.daily).toEqual([]);
    expect(result.monthly).toEqual([]);
    expect(result.overallAvg).toBeNull();
    expect(result.daysInRange).toBe(0);
    expect(result.daysWithReadings).toBe(0);
  });

  it('handles a missing hourly block without throwing', () => {
    expect(() => aggregateHourlyToDaily({})).not.toThrow();
    expect(() => aggregateHourlyToDaily(null)).not.toThrow();
    expect(aggregateHourlyToDaily(null).daily).toEqual([]);
  });

  it('tolerates a payload missing some pollutant series entirely', () => {
    const result = aggregateHourlyToDaily({
      hourly: { time: ['2024-03-01T00:00'], us_aqi: [55] },
    });

    expect(result.daily[0].maxAqi).toBe(55);
    expect(result.daily[0].pm25).toBeNull();
    expect(result.daily[0].ozone).toBeNull();
  });
});

describe('dayAqi', () => {
  it('prefers maxAqi and falls back to aqi', () => {
    expect(dayAqi({ maxAqi: 80, aqi: 20 })).toBe(80);
    expect(dayAqi({ maxAqi: null, aqi: 20 })).toBe(20);
  });

  it('returns null for a day with no reading', () => {
    expect(dayAqi({ maxAqi: null, aqi: null })).toBeNull();
    expect(dayAqi({ date: '2024-03-01' })).toBeNull();
    expect(dayAqi(null)).toBeNull();
    expect(dayAqi(undefined)).toBeNull();
  });

  it('treats a measured zero as a reading', () => {
    // The distinction the whole fix rests on: 0 is a value, null is an absence.
    expect(dayAqi({ maxAqi: 0 })).toBe(0);
  });

  it('rejects non-finite values', () => {
    expect(dayAqi({ maxAqi: NaN })).toBeNull();
    expect(dayAqi({ maxAqi: Infinity })).toBeNull();
    expect(dayAqi({ maxAqi: '80' })).toBeNull();
  });

  it('never lets an unmeasured day satisfy a Good-band comparison', () => {
    // `null <= 50` is true in JS, which is how empty days were being filed as "Good".
    const unmeasured = { date: '2024-03-01', maxAqi: null };
    const value = dayAqi(unmeasured);

    expect(value).toBeNull();
    expect(value != null && value <= 50).toBe(false);
  });
});
