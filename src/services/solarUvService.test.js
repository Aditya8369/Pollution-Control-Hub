/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Solar Radiation & UV Index Core Service Engine
 * File: src/services/solarUvService.test.js
 * Framework: Vitest / Enterprise Atmospheric Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import {
  SolarUvService,
  FITZPATRICK_SKIN_FACTORS,
  NO_BURN_RISK_MINUTES,
} from './solarUvService';

describe('SolarUvService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new SolarUvService();
  });

  describe('Erythemal Sunburn Minutes Calculation', () => {
    test('should correctly compute burn minutes for UVI 10 and Skin Type 2', () => {
      // (200 * 1.5) / (10 * 10) = 300 / 100 = 3 minutes.
      // This used to return 5, because of a Math.max(5, ...) floor that only
      // ever moved the answer upward — and only in the conditions where
      // overstating safe exposure matters most.
      expect(service.calculateSunburnMinutes(10.0, 2)).toBe(3);
    });

    test('should return the real burn time below five minutes rather than clamping to it', () => {
      expect(service.calculateSunburnMinutes(11.0, 1)).toBe(2);
      expect(service.calculateSunburnMinutes(20.0, 1)).toBe(1);
    });

    test('should return 999 for zero UVI input (no sun burn risk)', () => {
      expect(service.calculateSunburnMinutes(0, 2)).toBe(NO_BURN_RISK_MINUTES);
      expect(NO_BURN_RISK_MINUTES).toBe(999);
    });

    test('should throw error for negative UVI or skin type inputs', () => {
      expect(() => service.calculateSunburnMinutes(-5, 2))
        .toThrow('UV Index and Skin Type must be valid positive values.');
      expect(() => service.calculateSunburnMinutes(NaN, 2))
        .toThrow('UV Index and Skin Type must be valid positive values.');
    });

    // Regression for #992. Types V and VI were absent from the factor table and
    // the `|| 1.5` fallback handed them the type II factor, so the two
    // phototypes with the most natural photoprotection were given the burn time
    // of the second most sun-sensitive skin on the scale.
    test('should cover the whole Fitzpatrick scale, I through VI', () => {
      expect(Object.keys(FITZPATRICK_SKIN_FACTORS)).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    test.each([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 6],
      [5, 10],
      [6, 20],
    ])('gives phototype %i a burn time of %i minutes at UVI 10', (skinType, expected) => {
      expect(service.calculateSunburnMinutes(10.0, skinType)).toBe(expected);
    });

    test('should give a more tolerant phototype a strictly longer burn time', () => {
      const times = [1, 2, 3, 4, 5, 6].map((t) => service.calculateSunburnMinutes(8.0, t));
      const ascending = [...times].sort((a, b) => a - b);
      expect(times).toEqual(ascending);
      expect(new Set(times).size).toBe(times.length);
    });

    test('should reject a skin type outside the Fitzpatrick scale instead of guessing', () => {
      // Each of these used to return a type II answer with no indication that
      // the input had not been understood.
      for (const bad of [0, 7, 99, -1, 2.5, NaN, null, 'II']) {
        expect(() => service.calculateSunburnMinutes(10.0, bad))
          .toThrow('Skin type must be a Fitzpatrick phototype between 1 and 6.');
      }
    });

    test('should default to phototype II when none is supplied', () => {
      // `undefined` is the one non-integer that must not throw: it is what the
      // default parameter is there to catch.
      expect(service.calculateSunburnMinutes(10.0)).toBe(3);
      expect(service.calculateSunburnMinutes(10.0, undefined)).toBe(3);
    });

    test('should halve the burn time when the UV index doubles', () => {
      expect(service.calculateSunburnMinutes(4.0, 3)).toBe(2 * service.calculateSunburnMinutes(8.0, 3));
    });

    test('should expose a frozen factor table', () => {
      expect(Object.isFrozen(FITZPATRICK_SKIN_FACTORS)).toBe(true);
    });
  });

  describe('Sunburn Risk Description', () => {
    test('should keep the real figure alongside a display label', () => {
      const risk = service.describeSunburnRisk(10.0, 2);
      expect(risk.minutes).toBe(3);
      expect(risk.label).toBe('Under 5 minutes');
      expect(risk.isUrgent).toBe(true);
    });

    test('should describe zero UV as no burn risk', () => {
      const risk = service.describeSunburnRisk(0, 2);
      expect(risk.minutes).toBe(NO_BURN_RISK_MINUTES);
      expect(risk.label).toBe('No burn risk');
      expect(risk.isUrgent).toBe(false);
    });

    test('should describe a long burn time in hours', () => {
      const risk = service.describeSunburnRisk(1.0, 6);
      expect(risk.minutes).toBe(200);
      expect(risk.label).toBe('About 3 hours');
      expect(risk.isUrgent).toBe(false);
    });

    test('should describe a mid-range burn time in minutes', () => {
      const risk = service.describeSunburnRisk(3.0, 4);
      expect(risk.minutes).toBe(20);
      expect(risk.label).toBe('About 20 minutes');
      expect(risk.isUrgent).toBe(false);
    });

    test('should flag anything under a quarter of an hour as urgent', () => {
      expect(service.describeSunburnRisk(8.0, 3).isUrgent).toBe(true);   // 5 minutes
      expect(service.describeSunburnRisk(2.0, 3).isUrgent).toBe(false);  // 20 minutes
    });

    test('should propagate an invalid skin type rather than labelling it', () => {
      expect(() => service.describeSunburnRisk(10.0, 9)).toThrow();
    });
  });

  describe('Solar Irradiance W/m2 to UVI Conversion', () => {
    test('should convert 750 W/m2 solar irradiance to 10.0 UVI', () => {
      expect(service.convertSolarIrradianceToUvi(750.0)).toBe(10.0);
    });

    test('should throw error for negative solar irradiance input', () => {
      expect(() => service.convertSolarIrradianceToUvi(-100)).toThrow('Solar irradiance must be non-negative.');
    });

    test('should reject a non-finite irradiance rather than returning NaN', () => {
      expect(() => service.convertSolarIrradianceToUvi(NaN)).toThrow('Solar irradiance must be non-negative.');
      expect(() => service.convertSolarIrradianceToUvi(undefined)).toThrow('Solar irradiance must be non-negative.');
    });

    test('should map zero irradiance to zero UVI', () => {
      expect(service.convertSolarIrradianceToUvi(0)).toBe(0);
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

    test.each([
      [0.0, 'LOW'],
      [2.9, 'LOW'],
      [3.0, 'MODERATE'],
      [5.9, 'MODERATE'],
      [6.0, 'HIGH'],
      [7.9, 'HIGH'],
      [8.0, 'VERY_HIGH'],
      [10.9, 'VERY_HIGH'],
      [11.0, 'EXTREME'],
    ])('classifies UVI %d as %s', (uvi, expected) => {
      expect(service.evaluateWhoUvSafety(uvi).riskCategory).toBe(expected);
    });

    test('should honour thresholds overridden through the constructor', () => {
      const strict = new SolarUvService({ whoUvLimitHigh: 4.0 });
      expect(strict.evaluateWhoUvSafety(4.5).riskCategory).toBe('HIGH');
      expect(service.evaluateWhoUvSafety(4.5).riskCategory).toBe('MODERATE');
    });

    test('should reject a non-finite UV index', () => {
      expect(() => service.evaluateWhoUvSafety(NaN)).toThrow('UV Index must be a finite non-negative number.');
      expect(() => service.evaluateWhoUvSafety(-1)).toThrow('UV Index must be a finite non-negative number.');
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
      expect(service.sanitizeInput(null)).toBe('');
    });
  });
});
