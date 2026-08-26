import { describe, it, expect } from 'vitest';
import {
  subAqi,
  BP_PM25,
  BP_PM10,
  BP_NO2,
  BP_O3,
  BP_CO
} from './airQualityService';

describe('AQI Calculation Rounding Edge Cases (Issue #742)', () => {
  describe('PM2.5 (1 decimal precision)', () => {
    it('rounds down when decimal is below .05', () => {
      // 12.049 -> 12.0 -> score 50
      expect(subAqi(12.049, BP_PM25)).toBe(50);
      // 35.44 -> 35.4 -> score 100
      expect(subAqi(35.44, BP_PM25)).toBe(100);
      // 55.449 -> 55.4 -> score 150
      expect(subAqi(55.449, BP_PM25)).toBe(150);
      // 150.44 -> 150.4 -> score 200
      expect(subAqi(150.44, BP_PM25)).toBe(200);
      // 250.44 -> 250.4 -> score 300
      expect(subAqi(250.44, BP_PM25)).toBe(300);
    });

    it('rounds up when decimal is exactly .05 or above', () => {
      // 12.05 -> 12.1 -> score 51
      expect(subAqi(12.05, BP_PM25)).toBe(51);
      // 35.45 -> 35.5 -> score 101
      expect(subAqi(35.45, BP_PM25)).toBe(101);
      // 55.45 -> 55.5 -> score 151
      expect(subAqi(55.45, BP_PM25)).toBe(151);
      // 150.45 -> 150.5 -> score 201
      expect(subAqi(150.45, BP_PM25)).toBe(201);
      // 250.45 -> 250.5 -> score 301
      expect(subAqi(250.45, BP_PM25)).toBe(301);
    });
    
    it('handles exact integer results at band boundaries', () => {
      // 12.0 -> 50
      expect(subAqi(12.0, BP_PM25)).toBe(50);
      // 35.4 -> 100
      expect(subAqi(35.4, BP_PM25)).toBe(100);
      // 55.4 -> 150
      expect(subAqi(55.4, BP_PM25)).toBe(150);
    });

    it('reproduces accurate rounding for intermediate values', () => {
      // (12.1 + 35.4) / 2 = 23.75 -> 23.8
      // Index for 23.8: 51 + ((100 - 51) / (35.4 - 12.1)) * (23.8 - 12.1)
      // = 51 + (49 / 23.3) * 11.7 = 51 + 24.609... = 75.6 -> 76
      expect(subAqi(23.75, BP_PM25)).toBe(76);
      
      // Interpolating 15.0:
      // = 51 + (49 / 23.3) * 2.9 = 51 + 6.098... = 57.09 -> 57
      expect(subAqi(15.0, BP_PM25)).toBe(57);
    });
  });

  describe('PM10 (0 decimal precision)', () => {
    it('rounds down when decimal is below .5', () => {
      expect(subAqi(54.49, BP_PM10)).toBe(50);
      expect(subAqi(154.49, BP_PM10)).toBe(100);
      expect(subAqi(254.49, BP_PM10)).toBe(150);
      expect(subAqi(354.49, BP_PM10)).toBe(200);
      expect(subAqi(424.49, BP_PM10)).toBe(300);
      expect(subAqi(604.49, BP_PM10)).toBe(500);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subAqi(54.5, BP_PM10)).toBe(51);
      expect(subAqi(154.5, BP_PM10)).toBe(101);
      expect(subAqi(254.5, BP_PM10)).toBe(151);
      expect(subAqi(354.5, BP_PM10)).toBe(201);
      expect(subAqi(424.5, BP_PM10)).toBe(301);
      // 604.5 -> 605 (which is off chart -> 500)
      expect(subAqi(604.5, BP_PM10)).toBe(500);
    });

    it('handles exact integer results within bands', () => {
      expect(subAqi(0, BP_PM10)).toBe(0);
      expect(subAqi(54, BP_PM10)).toBe(50);
      expect(subAqi(55, BP_PM10)).toBe(51);
      expect(subAqi(154, BP_PM10)).toBe(100);
    });
  });

  describe('NO2 (0 decimal precision)', () => {
    it('rounds down when decimal is below .5', () => {
      expect(subAqi(100.4, BP_NO2)).toBe(50);
      expect(subAqi(188.4, BP_NO2)).toBe(100);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subAqi(100.5, BP_NO2)).toBe(51);
      expect(subAqi(188.5, BP_NO2)).toBe(101);
    });
  });

  describe('O3 (0 decimal precision)', () => {
    it('rounds down when decimal is below .5', () => {
      expect(subAqi(116.4, BP_O3)).toBe(50);
      expect(subAqi(147.4, BP_O3)).toBe(100);
      expect(subAqi(186.4, BP_O3)).toBe(150);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subAqi(116.5, BP_O3)).toBe(51);
      expect(subAqi(147.5, BP_O3)).toBe(101);
      expect(subAqi(186.5, BP_O3)).toBe(151);
    });
  });

  describe('CO (0 decimal precision)', () => {
    it('rounds down when decimal is below .5', () => {
      expect(subAqi(4700.4, BP_CO)).toBe(50);
      expect(subAqi(9800.4, BP_CO)).toBe(100);
      expect(subAqi(14700.4, BP_CO)).toBe(150);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subAqi(4700.5, BP_CO)).toBe(51);
      expect(subAqi(9800.5, BP_CO)).toBe(101);
      expect(subAqi(14700.5, BP_CO)).toBe(151);
    });
  });

  describe('Invalid or missing inputs with new rounding behavior', () => {
    it('handles extremely small values safely', () => {
      expect(subAqi(0.0001, BP_PM25)).toBe(0);
      expect(subAqi(0.04, BP_PM25)).toBe(0);
      // Wait, 0.05 -> rounds to 0.1, score for 0.1: (50/12) * 0.1 = 0.416 -> 0
      expect(subAqi(0.05, BP_PM25)).toBe(0); 
      expect(subAqi(0.1, BP_PM25)).toBe(0);
    });

    it('handles repeated calculations deterministically', () => {
      for(let i = 0; i < 10; i++) {
        expect(subAqi(12.05, BP_PM25)).toBe(51);
      }
    });

    it('handles negative inputs according to existing convention', () => {
      expect(subAqi(-12.05, BP_PM25)).toBe(0);
      expect(subAqi(-0.5, BP_PM25)).toBe(0);
    });
  });
});
