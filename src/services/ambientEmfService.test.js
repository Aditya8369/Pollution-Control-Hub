/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Urban Ambient EMF Core Service Engine
 * File: src/services/ambientEmfService.test.js
 * Framework: Jest JS / Enterprise Radiation Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { AmbientEmfService } from './ambientEmfService';

describe('AmbientEmfService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new AmbientEmfService();
  });

  describe('Power Density Distance Attenuation Calculations', () => {
    test('should correctly compute power density decay over distance', () => {
      // 16 W/m² at 2m -> at 4m (double distance) should be 16 / 2^2 = 4 W/m²
      const pdTarget = service.calculateDistanceAttenuation(16.0, 2.0, 4.0);
      expect(pdTarget).toBe(4.0);
    });

    test('should throw error for non-positive distance values', () => {
      expect(() => service.calculateDistanceAttenuation(16.0, 0, 4.0)).toThrow('Distances must be strictly positive');
      expect(() => service.calculateDistanceAttenuation(16.0, 2.0, -1.0)).toThrow('Distances must be strictly positive');
    });
  });

  describe('Safe Buffer Distance Calculation', () => {
    test('should compute required buffer meters for high power density emission', () => {
      // 40 W/m² at 2m -> safe distance = 2 * sqrt(40 / 10) = 2 * 2 = 4 meters
      const buffer = service.calculateSafeBufferDistanceMeters(40.0, 2.0);
      expect(buffer).toBe(4);
    });

    test('should return reference distance if power density is already within ICNIRP limit', () => {
      expect(service.calculateSafeBufferDistanceMeters(8.0, 2.0)).toBe(2.0);
    });
  });

  describe('ICNIRP Safety Compliance Evaluation', () => {
    test('should identify non-compliance for power density > 10.0 W/m²', () => {
      const evalRes = service.evaluateIcnirpCompliance(12.5, 5.0);
      expect(evalRes.isFullyCompliant).toBe(false);
      expect(evalRes.isPowerDensityExceeded).toBe(true);
      expect(evalRes.powerDensityMargin).toBe(2.5);
    });

    test('should identify compliance when power density and magnetic field are within limits', () => {
      const evalRes = service.evaluateIcnirpCompliance(6.5, 50.0);
      expect(evalRes.isFullyCompliant).toBe(true);
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
