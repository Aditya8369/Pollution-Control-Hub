/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Solar Radiation & UV Index Core Service Engine
 * File: src/services/solarUvService.test.js
 * Framework: Jest JS / Enterprise Atmospheric Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { SolarUvService } from './solarUvService';

describe('SolarUvService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new SolarUvService();
  });

  describe('Erythemal Sunburn Minutes Calculation', () => {
    test('should correctly compute burn minutes for UVI 10 and Skin Type 2', () => {
      // (200 * 1.5) / (10 * 10) = 300 / 100 = 30 minutes
      const min = service.calculateSunburnMinutes(10.0, 2);
      expect(min).toBe(3);
    });

    test('should return 999 for zero UVI input (no sun burn risk)', () => {
      expect(service.calculateSunburnMinutes(0, 2)).toBe(999);
    });

    test('should throw error for negative UVI or skin type inputs', () => {
      expect(() => service.calculateSunburnMinutes(-5, 2)).toThrow('UV Index and Skin Type must be valid positive values.');
    });
  });

  describe('Solar Irradiance W/m2 to UVI Conversion', () => {
    test('should convert 750 W/m2 solar irradiance to 10.0 UVI', () => {
      const uvi = service.convertSolarIrradianceToUvi(750.0);
      expect(uvi).toBe(10.0);
    });

    test('should throw error for negative solar irradiance input', () => {
      expect(() => service.convertSolarIrradianceToUvi(-100)).toThrow('Solar irradiance must be non-negative.');
    });
  });

  describe('WHO UV Safety Evaluation', () => {
    test('should classify UVI >= 11 as EXTREME risk requiring SPF 50+ and shade', () => {
      const evalRes = service.evaluateWhoUvSafety(12.5);
      expect(evalRes.riskCategory).toBe('EXTREME');
      expect(evalRes.recommendedSpf).toBe(50);
      expect(evalRes.shadeRequired).toBe(true);
    });

    test('should classify UVI 4.0 as MODERATE risk requiring SPF 30', () => {
      const evalRes = service.evaluateWhoUvSafety(4.0);
      expect(evalRes.riskCategory).toBe('MODERATE');
      expect(evalRes.recommendedSpf).toBe(30);
      expect(evalRes.shadeRequired).toBe(false);
    });
  });

  describe('Input Sanitation Security Review', () => {
    test('should sanitize malicious script tags and HTML entities', () => {
      const clean = service.sanitizeInput('<script>alert("xss")</script>');
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
    });

    test('should handle non-string inputs safely', () => {
      expect(service.sanitizeInput(12345)).toBe('');
    });
  });
});
