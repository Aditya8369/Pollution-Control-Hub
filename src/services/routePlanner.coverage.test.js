import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pm25ToAQI,
  routeCheckpoints,
  summarisePm25,
  calculateCleanRoute,
} from './routePlanner';

/**
 * Additional unit test coverage for routePlanner.js, expanding on the existing
 * routePlanner.test.js and routePlanner.fallback.test.js suites.
 *
 * Focus areas: AQI band boundaries, checkpoint/summary edge cases, invalid or
 * empty inputs (geocoding failures, routing failures, empty route sets), and
 * ranking/exposure behaviour across the different travel modes.
 */

describe('pm25ToAQI - boundary coverage', () => {
  it('maps the boundary of every AQI band correctly', () => {
    expect(pm25ToAQI(0)).toBe(0);
    expect(pm25ToAQI(12.0)).toBe(50);
    expect(pm25ToAQI(12.1)).toBe(51);
    expect(pm25ToAQI(35.4)).toBe(100);
    expect(pm25ToAQI(35.5)).toBe(101);
    expect(pm25ToAQI(55.4)).toBe(150);
    expect(pm25ToAQI(55.5)).toBe(151);
    expect(pm25ToAQI(150.4)).toBe(200);
    expect(pm25ToAQI(150.5)).toBe(201);
    expect(pm25ToAQI(250.4)).toBe(300);
    expect(pm25ToAQI(250.5)).toBe(301);
  });

  it('extrapolates beyond the published table for extreme concentrations', () => {
    expect(pm25ToAQI(500.4)).toBe(500);
    expect(pm25ToAQI(1000)).toBeGreaterThan(500);
  });

  it('treats NaN the same as a missing value', () => {
    expect(pm25ToAQI(NaN)).toBe(0);
  });
});

describe('routeCheckpoints - invalid input handling', () => {
  it('returns an empty array for non-finite point counts', () => {
    expect(routeCheckpoints(NaN)).toEqual([]);
    expect(routeCheckpoints(Infinity)).toEqual([]);
  });

  it('returns an empty array for zero or negative point counts', () => {
    expect(routeCheckpoints(0)).toEqual([]);
    expect(routeCheckpoints(-10)).toEqual([]);
  });

  it('never produces an index outside the valid geometry range', () => {
    const points = routeCheckpoints(7);
    for (const idx of points) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(6);
    }
  });
});

describe('summarisePm25 - additional edge cases', () => {
  it('handles an empty readings array without dividing by zero', () => {
    const stats = summarisePm25([]);
    expect(stats.average).toBeNull();
    expect(stats.measuredCount).toBe(0);
    expect(stats.totalCount).toBe(0);
    expect(stats.coverage).toBe(0);
  });

  it('reports full coverage when every checkpoint is measured', () => {
    const stats = summarisePm25([10, 20, 30]);
    expect(stats.measuredCount).toBe(3);
    expect(stats.totalCount).toBe(3);
    expect(stats.coverage).toBe(1);
    expect(stats.average).toBe(20);
  });

  it('ignores non-numeric readings such as NaN or undefined', () => {
    const stats = summarisePm25([15, NaN, undefined, 25]);
    expect(stats.measuredCount).toBe(2);
    expect(stats.average).toBe(20);
  });
});

describe('calculateCleanRoute - invalid/empty input handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the origin cannot be geocoded', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('nominatim')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(
      calculateCleanRoute('Nowhere', 'Somewhere', 'driving')
    ).rejects.toThrow('Location not found');
  });

  it('throws when the geocoding request itself fails', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('nominatim')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(
      calculateCleanRoute('Nowhere', 'Somewhere', 'driving')
    ).rejects.toThrow('Failed to geocode');
  });

  it('throws when the routing engine cannot find a path', async () => {
    globalThis.fetch = vi.fn((url) => {
      const href = String(url);
      if (href.includes('nominatim')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ lon: '77.0', lat: '28.0' }]),
        });
      }
      if (href.includes('router.project-osrm.org')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 'NoRoute', routes: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await expect(
      calculateCleanRoute('Start', 'Dest', 'driving')
    ).rejects.toThrow('Could not calculate routes');
  });

  it('returns an empty result set when OSRM reports Ok with zero routes', async () => {
    globalThis.fetch = vi.fn((url) => {
      const href = String(url);
      if (href.includes('nominatim')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ lon: '77.0', lat: '28.0' }]),
        });
      }
      if (href.includes('router.project-osrm.org')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 'Ok', routes: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const result = await calculateCleanRoute('Start', 'Dest', 'driving');

    expect(result.allRoutes).toEqual([]);
    expect(result.cleanestRoute).toBeNull();
    expect(result.pollutionDataAvailable).toBe(false);
    expect(result.rankedRouteCount).toBe(0);
    expect(result.totalRouteCount).toBe(0);
  });
});

describe('calculateCleanRoute - mode handling', () => {
  const GEOMETRY = [
    [77.2090, 28.6139],
    [77.2115, 28.6164],
    [77.2140, 28.6189],
    [77.2165, 28.6214],
    [77.2190, 28.6239],
  ];

  function stubNetwork() {
    globalThis.fetch = vi.fn((url) => {
      const href = String(url);
      if (href.includes('nominatim')) {
        const q = new URL(href).searchParams.get('q') || '';
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              q.includes('Start')
                ? [{ lon: '77.2090', lat: '28.6139' }]
                : [{ lon: '77.2190', lat: '28.6239' }]
            ),
        });
      }
      if (href.includes('router.project-osrm.org')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 'Ok',
              routes: [{ distance: 5000, geometry: { coordinates: GEOMETRY } }],
            }),
        });
      }
      if (href.includes('air-quality-api')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ current: { pm2_5: 20.0 } }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to driving for an unrecognised mode', async () => {
    stubNetwork();

    const result = await calculateCleanRoute('Start', 'Dest', 'spaceship');
    expect(result.cleanestRoute.mode).toBe('driving');
  });

  it('applies the higher biking exposure multiplier to the exposure score', async () => {
    stubNetwork();

    const drivingResult = await calculateCleanRoute('Start', 'Dest', 'driving');
    const bikingResult = await calculateCleanRoute('Start', 'Dest', 'biking');

    expect(bikingResult.cleanestRoute.multiplier).toBeGreaterThan(
      drivingResult.cleanestRoute.multiplier
    );
    // Same distance and PM2.5 reading, so a larger multiplier must yield a larger score.
    expect(bikingResult.cleanestRoute.exposureScore).toBeGreaterThan(
      drivingResult.cleanestRoute.exposureScore
    );
  });

  it('applies the walking exposure multiplier and mode label', async () => {
    stubNetwork();

    const result = await calculateCleanRoute('Start', 'Dest', 'foot');
    expect(result.cleanestRoute.mode).toBe('foot');
    expect(result.cleanestRoute.multiplier).toBe(2.2);
  });
});