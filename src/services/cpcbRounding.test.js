import { describe, it, expect } from 'vitest';
import {
  calculateIndex,
  CPCB_STANDARD,
  subIndex,
  convertToStandardUnit
} from './aqiStandards';

describe('CPCB AQI Calculation Rounding Edge Cases', () => {
  describe('PM2.5 (0 decimal precision for CPCB)', () => {
    const PM25 = CPCB_STANDARD.pollutants.pm2_5.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      // 30.49 -> 30 -> score 50
      expect(subIndex(30.49, PM25)).toBe(50);
      // 60.49 -> 60 -> score 100
      expect(subIndex(60.49, PM25)).toBe(100);
      // 90.49 -> 90 -> score 200
      expect(subIndex(90.49, PM25)).toBe(200);
      // 120.49 -> 120 -> score 300
      expect(subIndex(120.49, PM25)).toBe(300);
      // 250.49 -> 250 -> score 400
      expect(subIndex(250.49, PM25)).toBe(400);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      // 30.5 -> 31 -> score 51
      expect(subIndex(30.5, PM25)).toBe(51);
      // 60.5 -> 61 -> score 101
      expect(subIndex(60.5, PM25)).toBe(101);
      // 90.5 -> 91 -> score 201
      expect(subIndex(90.5, PM25)).toBe(201);
      // 120.5 -> 121 -> score 301
      expect(subIndex(120.5, PM25)).toBe(301);
      // 250.5 -> 251 -> score 401
      expect(subIndex(250.5, PM25)).toBe(401);
    });
    
    it('handles exact integer results at band boundaries', () => {
      expect(subIndex(30, PM25)).toBe(50);
      expect(subIndex(60, PM25)).toBe(100);
      expect(subIndex(90, PM25)).toBe(200);
    });
  });

  describe('PM10 (0 decimal precision for CPCB)', () => {
    const PM10 = CPCB_STANDARD.pollutants.pm10.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      expect(subIndex(50.4, PM10)).toBe(50);
      expect(subIndex(100.4, PM10)).toBe(100);
      expect(subIndex(250.4, PM10)).toBe(200);
      expect(subIndex(350.4, PM10)).toBe(300);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subIndex(50.5, PM10)).toBe(51);
      expect(subIndex(100.5, PM10)).toBe(101);
      expect(subIndex(250.5, PM10)).toBe(201);
      expect(subIndex(350.5, PM10)).toBe(301);
    });
  });

  describe('CO (1 decimal precision for CPCB)', () => {
    const CO = CPCB_STANDARD.pollutants.carbon_monoxide.breakpoints;

    it('rounds down when decimal is below .05', () => {
      expect(subIndex(1.04, CO)).toBe(50);
      expect(subIndex(2.04, CO)).toBe(100);
      expect(subIndex(10.04, CO)).toBe(200);
      expect(subIndex(17.04, CO)).toBe(300);
    });

    it('rounds up when decimal is exactly .05 or above', () => {
      expect(subIndex(1.05, CO)).toBe(51);
      expect(subIndex(2.05, CO)).toBe(101);
      expect(subIndex(10.05, CO)).toBe(201);
      expect(subIndex(17.05, CO)).toBe(301);
    });
  });

  describe('O3 (0 decimal precision for CPCB)', () => {
    const O3 = CPCB_STANDARD.pollutants.ozone.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      expect(subIndex(50.4, O3)).toBe(50);
      expect(subIndex(100.4, O3)).toBe(100);
      expect(subIndex(168.4, O3)).toBe(200);
      expect(subIndex(208.4, O3)).toBe(300);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subIndex(50.5, O3)).toBe(51);
      expect(subIndex(100.5, O3)).toBe(101);
      expect(subIndex(168.5, O3)).toBe(201);
      expect(subIndex(208.5, O3)).toBe(301);
    });
  });
  
  describe('Ammonia NH3 (0 decimal precision for CPCB)', () => {
    const NH3 = CPCB_STANDARD.pollutants.ammonia.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      expect(subIndex(200.4, NH3)).toBe(50);
      expect(subIndex(400.4, NH3)).toBe(100);
      expect(subIndex(800.4, NH3)).toBe(200);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subIndex(200.5, NH3)).toBe(51);
      expect(subIndex(400.5, NH3)).toBe(101);
      expect(subIndex(800.5, NH3)).toBe(201);
    });
  });
  
  describe('Sulfur Dioxide SO2 (0 decimal precision for CPCB)', () => {
    const SO2 = CPCB_STANDARD.pollutants.sulphur_dioxide.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      expect(subIndex(40.4, SO2)).toBe(50);
      expect(subIndex(80.4, SO2)).toBe(100);
      expect(subIndex(380.4, SO2)).toBe(200);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subIndex(40.5, SO2)).toBe(51);
      expect(subIndex(80.5, SO2)).toBe(101);
      expect(subIndex(380.5, SO2)).toBe(201);
    });
  });
  
  describe('Nitrogen Dioxide NO2 (0 decimal precision for CPCB)', () => {
    const NO2 = CPCB_STANDARD.pollutants.nitrogen_dioxide.breakpoints;
    
    it('rounds down when decimal is below .5', () => {
      expect(subIndex(40.4, NO2)).toBe(50);
      expect(subIndex(80.4, NO2)).toBe(100);
      expect(subIndex(180.4, NO2)).toBe(200);
    });

    it('rounds up when decimal is exactly .5 or above', () => {
      expect(subIndex(40.5, NO2)).toBe(51);
      expect(subIndex(80.5, NO2)).toBe(101);
      expect(subIndex(180.5, NO2)).toBe(201);
    });
  });

  describe('calculateIndex integrated rounding checks', () => {
    it('applies rounding properly across multiple pollutants', () => {
      // 30.5 -> 31 -> score 51
      // 100.5 -> 101 -> score 101 (PM10)
      // 80.5 -> 81 -> score 101 (NO2)
      const result = calculateIndex({
        pm2_5: 30.5,
        pm10: 100.5,
        nitrogen_dioxide: 80.5
      });
      
      expect(result.sufficient).toBe(true);
      expect(result.index).toBe(101);
      // Wait, 100.5 for PM10 is score 101. 80.5 for NO2 is score 101.
      // So dominant is one of them.
      expect(result.band.label).toBe('Moderate');
    });

    it('ensures converted values round cleanly (CO mg/m3)', () => {
      // CO raw reading in ug/m3. 
      // 1050 ug/m3 -> 1.05 mg/m3 -> rounds up to 1.1 -> score 51
      const result = calculateIndex({
        pm2_5: 10, // score 16
        pm10: 10,  // score 10
        carbon_monoxide: 1050
      });

      expect(result.index).toBe(51);
      expect(result.dominantPollutant.key).toBe('carbon_monoxide');
    });
  });
});
