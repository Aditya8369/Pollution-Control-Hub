import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCleanRoute,
  routeCheckpoints,
  summarisePm25,
  UNMEASURED_SEGMENT_COLOR,
} from './routePlanner';

/**
 * Regression cover for #544.
 *
 * The planner used to answer every failed pollution request with 25.0 µg/m³. That number
 * reached the average, the inhaled dose, the segment colours and — worst of all — the
 * exposure score the routes are ranked by, so an outage produced a confident "cleanest
 * route" recommendation built entirely on a constant.
 */

const GEOMETRY_A = [
  [77.2090, 28.6139],
  [77.2115, 28.6164],
  [77.2140, 28.6189],
  [77.2165, 28.6214],
  [77.2190, 28.6239],
];

const GEOMETRY_B = [
  [77.2090, 28.6139],
  [77.2100, 28.6180],
  [77.2150, 28.6200],
  [77.2170, 28.6220],
  [77.2190, 28.6239],
];

/**
 * Wires up fetch so geocoding and routing always succeed and only the pollution
 * endpoint behaves the way a given test wants.
 *
 * @param {(lat: number, lon: number) => ({ ok: boolean, pm25?: number|null })} pollution
 * @param {object[]} [routes]
 */
function stubNetwork(pollution, routes = [{ distance: 5000, geometry: { coordinates: GEOMETRY_A } }]) {
  globalThis.fetch = vi.fn(async (url) => {
    const href = String(url);

    if (href.includes('nominatim')) {
      const q = new URL(href).searchParams.get('q') || '';
      return {
        ok: true,
        json: async () =>
          q.includes('Start')
            ? [{ lon: '77.2090', lat: '28.6139' }]
            : [{ lon: '77.2190', lat: '28.6239' }],
      };
    }

    if (href.includes('router.project-osrm.org')) {
      return { ok: true, json: async () => ({ code: 'Ok', routes }) };
    }

    const params = new URL(href).searchParams;
    const lat = Number(params.get('latitude'));
    const lon = Number(params.get('longitude'));
    const outcome = pollution(lat, lon);
    if (!outcome.ok) {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({ current: { pm2_5: outcome.pm25 } }) };
  });
}

describe('routeCheckpoints', () => {
  it('de-duplicates the fractional positions on short geometries', () => {
    // A two-point route produces [0, 0, 1, 1, 1] before de-duplication.
    expect(routeCheckpoints(2)).toEqual([0, 1]);
    expect(routeCheckpoints(1)).toEqual([0]);
  });

  it('spreads five ascending, unique samples across a long geometry', () => {
    const points = routeCheckpoints(100);
    expect(points).toEqual([0, 25, 50, 75, 99]);
    expect(new Set(points).size).toBe(points.length);
  });

  it('returns nothing for an empty geometry', () => {
    expect(routeCheckpoints(0)).toEqual([]);
  });
});

describe('summarisePm25', () => {
  it('ignores unmeasured checkpoints instead of counting them as zero', () => {
    const stats = summarisePm25([10, null, 30, null, 20]);
    expect(stats.average).toBe(20); // (10 + 30 + 20) / 3, not / 5
    expect(stats.highest).toBe(30);
    expect(stats.lowest).toBe(10);
    expect(stats.measuredCount).toBe(3);
    expect(stats.totalCount).toBe(5);
    expect(stats.coverage).toBeCloseTo(0.6);
  });

  it('reports nothing measurable when every checkpoint failed', () => {
    const stats = summarisePm25([null, null, null]);
    expect(stats.average).toBeNull();
    expect(stats.highest).toBeNull();
    expect(stats.lowest).toBeNull();
    expect(stats.measuredCount).toBe(0);
    expect(stats.coverage).toBe(0);
  });
});

describe('calculateCleanRoute - pollution data unavailable (regression for #544)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('invents no concentration when every pollution request fails', async () => {
    stubNetwork(() => ({ ok: false }));

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');
    const [route] = result.allRoutes;

    // The old code produced exactly these values from its 25.0 fallback.
    expect(route.pm25).not.toBe('25.0');
    expect(route.pm25).toBeNull();
    expect(route.inhaledDose).toBeNull();
    expect(route.highestPm).toBeNull();
    expect(route.lowestPm).toBeNull();
    expect(route.measured).toBe(false);
    expect(route.measuredCheckpoints).toBe(0);
  });

  it('refuses to name a cleanest route when nothing could be measured', async () => {
    stubNetwork(() => ({ ok: false }));

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');

    expect(result.cleanestRoute).toBeNull();
    expect(result.pollutionDataAvailable).toBe(false);
    expect(result.rankedRouteCount).toBe(0);
    // The roads themselves are still real and still worth showing.
    expect(result.allRoutes.length).toBeGreaterThan(0);
    expect(result.allRoutes[0].distance).toBe('5.00');
  });

  it('gives an unmeasured route no exposure score, so it cannot win the ranking', async () => {
    stubNetwork(() => ({ ok: false }));

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');

    for (const route of result.allRoutes) {
      expect(route.exposureScore).toBeNull();
    }
  });

  it('greys out segments it could not measure rather than colouring them green', async () => {
    stubNetwork(() => ({ ok: false }));

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');
    const [route] = result.allRoutes;

    expect(route.segments.length).toBeGreaterThan(0);
    for (const segment of route.segments) {
      expect(segment.measured).toBe(false);
      expect(segment.aqi).toBeNull();
      expect(segment.pm25).toBeNull();
      expect(segment.category).toBe('Unavailable');
      expect(segment.color).toBe(UNMEASURED_SEGMENT_COLOR);
      // '#1f9d55' is the "Good" green — an outage must never paint the map with it.
      expect(segment.color).not.toBe('#1f9d55');
    }
  });
});

describe('calculateCleanRoute - partial pollution coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('averages only the checkpoints that returned a reading', async () => {
    // The first sampled point answers, the rest do not.
    let call = 0;
    stubNetwork(() => {
      call += 1;
      return call === 1 ? { ok: true, pm25: 60 } : { ok: false };
    });

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');
    const [route] = result.allRoutes;

    expect(route.measured).toBe(true);
    expect(route.pm25).toBe('60.0'); // not dragged toward 25 by the failures
    expect(route.measuredCheckpoints).toBe(1);
    expect(route.totalCheckpoints).toBe(5);
    expect(route.coverage).toBeCloseTo(0.2);
  });

  it('marks a segment unmeasured unless both of its endpoints returned a reading', async () => {
    // Only the first two checkpoints answer, so only segment 0 spans two readings.
    let call = 0;
    stubNetwork(() => {
      call += 1;
      return call <= 2 ? { ok: true, pm25: 40 } : { ok: false };
    });

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');
    const [route] = result.allRoutes;

    expect(route.segments[0].measured).toBe(true);
    expect(route.segments[0].pm25).toBe(40);
    for (const segment of route.segments.slice(1)) {
      expect(segment.measured).toBe(false);
    }
  });

  it('treats a non-numeric reading as missing rather than as a value', async () => {
    stubNetwork(() => ({ ok: true, pm25: null }));

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');

    expect(result.allRoutes[0].measured).toBe(false);
    expect(result.cleanestRoute).toBeNull();
  });
});

describe('calculateCleanRoute - ranking with mixed availability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts unmeasured routes behind measured ones and picks a measured cleanest', async () => {
    const routes = [
      { distance: 5000, geometry: { coordinates: GEOMETRY_A } },
      { distance: 5000, geometry: { coordinates: GEOMETRY_B } },
    ];

    // Route B's geometry passes through 28.6180, which we make the failing latitude;
    // route A answers cleanly everywhere.
    stubNetwork((lat) => {
      const onRouteB = [28.6180, 28.6200, 28.6220].some((v) => Math.abs(lat - v) < 1e-6);
      return onRouteB ? { ok: false } : { ok: true, pm25: 30 };
    }, routes);

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');

    expect(result.pollutionDataAvailable).toBe(true);
    expect(result.cleanestRoute).not.toBeNull();
    expect(result.cleanestRoute.measured).toBe(true);

    // Every measured route precedes every unmeasured one.
    const measuredFlags = result.allRoutes.map((r) => r.measured);
    const lastMeasured = measuredFlags.lastIndexOf(true);
    const firstUnmeasured = measuredFlags.indexOf(false);
    if (firstUnmeasured !== -1) {
      expect(firstUnmeasured).toBeGreaterThan(lastMeasured);
    }
  });

  it('still ranks measured routes by ascending exposure score', async () => {
    const routes = [
      { distance: 5000, geometry: { coordinates: GEOMETRY_A } },
      { distance: 5000, geometry: { coordinates: GEOMETRY_B } },
    ];

    stubNetwork((lat) => {
      const onRouteB = [28.6180, 28.6200, 28.6220].some((v) => Math.abs(lat - v) < 1e-6);
      return { ok: true, pm25: onRouteB ? 80 : 20 };
    }, routes);

    const result = await calculateCleanRoute('Start Point', 'End Point', 'driving');
    const scores = result.allRoutes.map((r) => r.exposureScore);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeLessThanOrEqual(scores[i]);
    }
    expect(result.cleanestRoute.exposureScore).toBe(scores[0]);
  });
});
