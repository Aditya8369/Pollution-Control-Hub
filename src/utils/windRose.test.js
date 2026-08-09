import { describe, it, expect } from 'vitest';
import { buildWindRose, getCardinalDirection, DIRECTIONS } from './windRose';

/** Builds the two hourly blocks from a list of [bearing, pm2_5] pairs. */
function hourly(rows, extras = {}) {
  const air = {
    time: rows.map((_, i) => `2024-03-01T${String(i % 24).padStart(2, '0')}:00`),
    pm2_5: rows.map((r) => r[1]),
    pm10: rows.map((r) => r[1]),
    nitrogen_dioxide: rows.map((r) => r[1]),
    ozone: rows.map((r) => r[1]),
    ...extras.air,
  };
  const weather = {
    time: air.time.slice(),
    wind_direction_10m: rows.map((r) => r[0]),
    wind_speed_10m: rows.map(() => 10),
    ...extras.weather,
  };
  return [air, weather];
}

function sectorFor(rose, direction) {
  return rose.sectors.find((s) => s.direction === direction);
}

describe('getCardinalDirection', () => {
  it('maps each sector centre to its own label', () => {
    DIRECTIONS.forEach((label, i) => {
      expect(getCardinalDirection(i * 22.5)).toBe(label);
    });
  });

  it('wraps the top of the compass back to N', () => {
    // The % 16 after rounding is what stops 348.75-360 falling off the array.
    expect(getCardinalDirection(360)).toBe('N');
    expect(getCardinalDirection(359.9)).toBe('N');
    expect(getCardinalDirection(350)).toBe('N');
    expect(getCardinalDirection(348.75)).toBe('N');
  });

  it('places bearings just below a sector centre in the sector below', () => {
    expect(getCardinalDirection(347)).toBe('NNW');
    expect(getCardinalDirection(11)).toBe('N');
    expect(getCardinalDirection(12)).toBe('NNE');
  });

  it('normalises out-of-range and negative bearings', () => {
    expect(getCardinalDirection(450)).toBe('E');   // 450 - 360 = 90
    expect(getCardinalDirection(-90)).toBe('W');   // -90 + 360 = 270
    expect(getCardinalDirection(-1)).toBe('N');
  });

  it('rejects values that are not usable bearings', () => {
    expect(getCardinalDirection(null)).toBeNull();
    expect(getCardinalDirection(undefined)).toBeNull();
    expect(getCardinalDirection(NaN)).toBeNull();
    expect(getCardinalDirection('90')).toBeNull();
    expect(getCardinalDirection(Infinity)).toBeNull();
  });

  it('covers all 16 sectors and nothing else across a full sweep', () => {
    const seen = new Set();
    for (let deg = 0; deg < 360; deg += 0.5) {
      seen.add(getCardinalDirection(deg));
    }
    expect(seen.size).toBe(16);
    expect([...seen].sort()).toEqual([...DIRECTIONS].sort());
  });
});

describe('buildWindRose - unsampled sectors (regression for #647)', () => {
  it('reports a direction that was never observed as null, not 0', () => {
    const rose = buildWindRose(...hourly([[270, 48.2], [270, 48.2]]));

    const west = sectorFor(rose, 'W');
    const north = sectorFor(rose, 'N');

    expect(west.pm2_5).toBe(48.2);
    expect(west.hasData).toBe(true);

    // The bug: `count || 1` turned 0/0 into 0, which a radar chart reads as
    // "cleanest air comes from the north".
    expect(north.pm2_5).toBeNull();
    expect(north.pm10).toBeNull();
    expect(north.nitrogen_dioxide).toBeNull();
    expect(north.ozone).toBeNull();
    expect(north.hasData).toBe(false);
  });

  it('still returns all 16 sectors so the axis is complete', () => {
    const rose = buildWindRose(...hourly([[270, 30]]));

    expect(rose.sectors).toHaveLength(16);
    expect(rose.sectors.map((s) => s.direction)).toEqual(DIRECTIONS);
  });

  it('counts how many sectors carry data', () => {
    const rose = buildWindRose(...hourly([[0, 10], [90, 20], [90, 20]]));

    expect(rose.sampledSectors).toBe(2);
    expect(rose.totalObservations).toBe(3);
  });

  it('distinguishes an unsampled sector from one measuring genuine zero', () => {
    const rose = buildWindRose(...hourly([[0, 0]]));

    expect(sectorFor(rose, 'N').pm2_5).toBe(0);
    expect(sectorFor(rose, 'N').hasData).toBe(true);
    expect(sectorFor(rose, 'S').pm2_5).toBeNull();
    expect(sectorFor(rose, 'S').hasData).toBe(false);
  });
});

describe('buildWindRose - averaging', () => {
  it('averages pollutant readings within a sector', () => {
    const rose = buildWindRose(...hourly([[90, 10], [90, 20], [90, 30]]));

    expect(sectorFor(rose, 'E').pm2_5).toBe(20);
    expect(sectorFor(rose, 'E').frequency).toBe(3);
  });

  it('divides by the readings present, not by the sector hour count', () => {
    // Three hours of wind from the east, but only two with a pollutant reading.
    const rose = buildWindRose(...hourly([[90, 10], [90, null], [90, 30]]));

    expect(sectorFor(rose, 'E').pm2_5).toBe(20);
    expect(sectorFor(rose, 'E').frequency).toBe(3);
  });

  it('ignores non-numeric pollutant values', () => {
    const rose = buildWindRose(...hourly([[90, 10], [90, 'n/a'], [90, NaN], [90, 30]]));

    expect(sectorFor(rose, 'E').pm2_5).toBe(20);
  });

  it('averages wind speed independently of the pollutant series', () => {
    const [air, weather] = hourly([[90, 10], [90, 20]]);
    weather.wind_speed_10m = [4, null];

    const rose = buildWindRose(air, weather);

    expect(sectorFor(rose, 'E').avgWindSpeed).toBe(4);
  });

  it('reports a null wind speed when none was measured', () => {
    const [air, weather] = hourly([[90, 10]]);
    weather.wind_speed_10m = [null];

    expect(sectorFor(buildWindRose(air, weather), 'E').avgWindSpeed).toBeNull();
  });

  it('rounds means to one decimal', () => {
    const rose = buildWindRose(...hourly([[90, 10], [90, 11], [90, 11]]));

    expect(sectorFor(rose, 'E').pm2_5).toBe(10.7);
  });
});

describe('buildWindRose - frequency and dominance', () => {
  it('reports each sector as a share of observed hours', () => {
    const rose = buildWindRose(...hourly([[90, 5], [90, 5], [90, 5], [270, 5]]));

    expect(sectorFor(rose, 'E').frequencyPct).toBe(75);
    expect(sectorFor(rose, 'W').frequencyPct).toBe(25);
    expect(sectorFor(rose, 'N').frequencyPct).toBe(0);
  });

  it('identifies the most frequent direction', () => {
    const rose = buildWindRose(...hourly([[90, 5], [270, 5], [270, 5]]));

    expect(rose.dominantDirection).toBe('W');
  });

  it('has no dominant direction when nothing was observed', () => {
    const rose = buildWindRose(...hourly([[null, 5]]));

    expect(rose.dominantDirection).toBeNull();
    expect(rose.totalObservations).toBe(0);
    expect(rose.sampledSectors).toBe(0);
  });
});

describe('buildWindRose - input handling', () => {
  it('pairs only up to the shorter of the two time axes', () => {
    // The endpoints are separate requests; indexing past the shorter one would pair a
    // pollutant reading with a different hour's wind.
    const air = {
      time: ['t0', 't1', 't2'],
      pm2_5: [10, 20, 30],
      pm10: [10, 20, 30],
      nitrogen_dioxide: [10, 20, 30],
      ozone: [10, 20, 30],
    };
    const weather = {
      time: ['t0'],
      wind_direction_10m: [90],
      wind_speed_10m: [5],
    };

    const rose = buildWindRose(air, weather);

    expect(rose.totalObservations).toBe(1);
    expect(sectorFor(rose, 'E').pm2_5).toBe(10);
  });

  it('skips hours with no wind bearing', () => {
    const rose = buildWindRose(...hourly([[90, 10], [null, 999], [undefined, 999]]));

    expect(rose.totalObservations).toBe(1);
    expect(sectorFor(rose, 'E').pm2_5).toBe(10);
  });

  it('handles missing pollutant series without throwing', () => {
    const rose = buildWindRose(
      { time: ['t0'] },
      { time: ['t0'], wind_direction_10m: [90], wind_speed_10m: [5] }
    );

    expect(sectorFor(rose, 'E').pm2_5).toBeNull();
    expect(sectorFor(rose, 'E').frequency).toBe(1);
  });

  it('handles empty or absent blocks without throwing', () => {
    for (const args of [[{}, {}], [null, null], [undefined, undefined]]) {
      const rose = buildWindRose(...args);
      expect(rose.sectors).toHaveLength(16);
      expect(rose.totalObservations).toBe(0);
      expect(rose.sectors.every((s) => s.pm2_5 === null)).toBe(true);
    }
  });
});
