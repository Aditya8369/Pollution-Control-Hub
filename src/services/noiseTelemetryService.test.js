/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Noise Telemetry Core Service Engine
 * File: src/services/noiseTelemetryService.test.js
 * Framework: Jest JS / Enterprise Sound Surveillance Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { NoiseTelemetryService } from './noiseTelemetryService';

describe('NoiseTelemetryService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new NoiseTelemetryService({ defaultBaselineDba: 65.0 });
  });

  describe('Sound Pressure Level Attenuation Calculations', () => {
    test('should correctly compute decibel decay over distance using inverse square law', () => {
      // 90 dBA at 5m -> at 10m (double distance) should decay by ~6 dBA to ~84 dBA
      const spl10m = service.calculateSoundAttenuation(90.0, 5.0, 10.0);
      expect(spl10m).toBeCloseTo(83.98, 1);
    });

    test('should throw error for non-positive distance values', () => {
      expect(() => service.calculateSoundAttenuation(90.0, 0, 10.0)).toThrow('Distance must be strictly positive.');
      expect(() => service.calculateSoundAttenuation(90.0, 5.0, -1.0)).toThrow('Distance must be strictly positive.');
    });
  });

  describe('WHO Sound Exposure Compliance Audits', () => {
    test('should identify WHO daytime limit exceedance for levels > 55 dBA', () => {
      const evalResult = service.evaluateWhoCompliance(68.5, false);
      expect(evalResult.isExceeded).toBe(true);
      expect(evalResult.exceededMargin).toBe(13.5);
    });

    test('should identify severe hearing risk threshold for levels >= 85 dBA', () => {
      const evalResult = service.evaluateWhoCompliance(92.0, false);
      expect(evalResult.isSevereRisk).toBe(true);
      expect(evalResult.riskCategory).toBe('SEVERE_HEARING_RISK');
    });

    test('should apply nighttime limit (45 dBA) correctly', () => {
      const evalNight = service.evaluateWhoCompliance(50.0, true);
      expect(evalNight.limit).toBe(45.0);
      expect(evalNight.isExceeded).toBe(true);
    });
  });

  describe('Logarithmic Decibel Averaging', () => {
    test('should compute accurate energy average of multiple decibel values', () => {
      // Energy average of two equal levels (70 dBA + 70 dBA) should be 73 dBA (+3 dBA addition rule)
      const avg = service.calculateLogarithmicAverageDba([70.0, 70.0]);
      expect(avg).toBe(73.0);
    });

    test('should return 0 for empty array input', () => {
      expect(service.calculateLogarithmicAverageDba([])).toBe(0.0);
      expect(service.calculateLogarithmicAverageDba(null)).toBe(0.0);
    });
  });

  describe('Quiet Zone Buffer Distance Calculation', () => {
    test('should calculate required buffer meters for high decibel source', () => {
      const bufferMeters = service.calculateQuietZoneBufferMeters(75.0, 5.0);
      expect(bufferMeters).toBeGreaterThan(15);
    });

    test('should return reference distance if reference SPL is already below 55 dBA', () => {
      expect(service.calculateQuietZoneBufferMeters(50.0, 5.0)).toBe(5.0);
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
