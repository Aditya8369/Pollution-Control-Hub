import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pm25ToAQI, calculateCleanRoute, UNMEASURED_SEGMENT_COLOR } from './routePlanner';

describe('routePlanner - AQI Polyline Heatmap & Route Segmentation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('pm25ToAQI conversion helper', () => {
    it('correctly maps PM2.5 concentrations to US AQI scores', () => {
      expect(pm25ToAQI(0)).toBe(0);
      expect(pm25ToAQI(12.0)).toBe(50);
      expect(pm25ToAQI(20.0)).toBe(68);
      expect(pm25ToAQI(35.4)).toBe(100);
      expect(pm25ToAQI(45.0)).toBe(124);
      expect(pm25ToAQI(100.0)).toBe(174);
      expect(pm25ToAQI(200.0)).toBe(250);
    });

    it('handles invalid or edge case values gracefully', () => {
      expect(pm25ToAQI(null)).toBe(0);
      expect(pm25ToAQI(undefined)).toBe(0);
      expect(pm25ToAQI(-5)).toBe(0);
    });
  });

  describe('calculateCleanRoute segmentation and AQI metadata', () => {
    const mockGeocodeResponse = (query) => {
      if (query.includes('Start')) return [{ lon: '77.2090', lat: '28.6139' }];
      return [{ lon: '77.2190', lat: '28.6239' }];
    };

    const mockOsrmResponse = {
      code: 'Ok',
      routes: [
        {
          distance: 5000,
          geometry: {
            coordinates: [
              [77.2090, 28.6139],
              [77.2115, 28.6164],
              [77.2140, 28.6189],
              [77.2165, 28.6214],
              [77.2190, 28.6239]
            ]
          }
        }
      ]
    };

    it('attaches AQI segments with coordinates, aqi, category, and color', async () => {
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('nominatim')) {
          const q = new URL(url).searchParams.get('q');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGeocodeResponse(q))
          });
        }
        if (url.includes('router.project-osrm.org')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockOsrmResponse)
          });
        }
        if (url.includes('air-quality-api')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ current: { pm2_5: 20.0 } })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await calculateCleanRoute('Start', 'Dest', 'driving');
      expect(result).toHaveProperty('cleanestRoute');
      const route = result.cleanestRoute;

      // Verify existing properties remain unaffected
      expect(route.distance).toBe('5.00');
      expect(route.duration).toBeDefined();
      expect(route.pm25).toBe('20.0');

      // Verify new segments property
      expect(route).toHaveProperty('segments');
      expect(Array.isArray(route.segments)).toBe(true);
      expect(route.segments.length).toBeGreaterThan(0);

      const firstSeg = route.segments[0];
      expect(firstSeg).toHaveProperty('coordinates');
      expect(firstSeg).toHaveProperty('aqi');
      expect(firstSeg).toHaveProperty('category');
      expect(firstSeg).toHaveProperty('color');

      // 20.0 PM2.5 -> AQI 68 -> Moderate -> #f59e0b
      expect(firstSeg.aqi).toBe(68);
      expect(firstSeg.category).toBe('Moderate');
      expect(firstSeg.color).toBe('#f59e0b');
    });

    // This case used to assert that a pollution outage still produced a coloured,
    // ranked route — which only held because every failed reading became 25.0 µg/m³.
    // Per #544 the route is still returned, but now as explicitly unmeasured.
    it('returns the route unranked and unmeasured when the AQI API fails', async () => {
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('nominatim')) {
          const q = new URL(url).searchParams.get('q');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGeocodeResponse(q))
          });
        }
        if (url.includes('router.project-osrm.org')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockOsrmResponse)
          });
        }
        if (url.includes('air-quality-api')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await calculateCleanRoute('Start', 'Dest', 'driving');

      // No route may be recommended on data that was never measured.
      expect(result.cleanestRoute).toBeNull();
      expect(result.pollutionDataAvailable).toBe(false);

      // The path itself still comes back, drawn but not scored.
      const [route] = result.allRoutes;
      expect(route.segments.length).toBeGreaterThan(0);
      expect(route.segments[0].color).toBe(UNMEASURED_SEGMENT_COLOR);
      expect(route.measured).toBe(false);
      expect(route.pm25).toBeNull();
    });
  });
});
