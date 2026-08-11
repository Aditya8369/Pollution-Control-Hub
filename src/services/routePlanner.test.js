import { describe, it, expect, vi } from 'vitest';
import { pm25ToAQI, calculateCleanRoute, UNMEASURED_SEGMENT_COLOR } from './routePlanner';
import { server } from '../mocks/server.js';
import { http, HttpResponse } from 'msw';

describe('routePlanner - AQI Polyline Heatmap & Route Segmentation', () => {
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

  describe('calculateCleanRoute with MSW', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('attaches AQI segments with coordinates, aqi, category, and color', async () => {
      const result = await calculateCleanRoute('Start', 'Dest', 'driving');
      expect(result).toHaveProperty('cleanestRoute');
      const route = result.cleanestRoute;

      expect(route.distance).toBe('5.00');
      expect(route.duration).toBeDefined();
      expect(route.pm25).toBe('20.0');

      expect(route).toHaveProperty('segments');
      expect(Array.isArray(route.segments)).toBe(true);
      expect(route.segments.length).toBeGreaterThan(0);

      const firstSeg = route.segments[0];
      expect(firstSeg).toHaveProperty('coordinates');
      expect(firstSeg).toHaveProperty('aqi');
      expect(firstSeg).toHaveProperty('category');
      expect(firstSeg).toHaveProperty('color');

      expect(firstSeg.aqi).toBe(68);
      expect(firstSeg.category).toBe('Moderate');
      expect(firstSeg.color).toBe('#f59e0b');
    });

    it('returns the route unranked and unmeasured when the AQI API fails', async () => {
      server.use(
        http.get('https://air-quality-api.open-meteo.com/v1/air-quality', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const result = await calculateCleanRoute('Start', 'Dest', 'driving');

      expect(result.cleanestRoute).toBeNull();
      expect(result.pollutionDataAvailable).toBe(false);

      const [route] = result.allRoutes;
      expect(route.segments.length).toBeGreaterThan(0);
      expect(route.segments[0].color).toBe(UNMEASURED_SEGMENT_COLOR);
      expect(route.measured).toBe(false);
      expect(route.pm25).toBeNull();
    });

    it('handles geocoding failure gracefully', async () => {
      server.use(
        http.get('https://nominatim.openstreetmap.org/search', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      await expect(calculateCleanRoute('UnknownPlace', 'Dest')).rejects.toThrow();
    });

    it('handles OSRM routing failure gracefully', async () => {
      server.use(
        http.get('https://router.project-osrm.org/route/v1/:profile/:coords', () => {
          return HttpResponse.json({ code: 'NoRoute' });
        })
      );

      await expect(calculateCleanRoute('Start', 'Dest')).rejects.toThrow('Could not calculate routes');
    });
  });
});
