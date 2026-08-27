/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Noise Telemetry Core Service Engine
 * File: src/services/noiseTelemetryService.test.js
 * Framework: Vitest / Enterprise Sound Surveillance Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { NoiseTelemetryService, RISK_CATEGORY } from './noiseTelemetryService';

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
      expect(evalResult.riskCategory).toBe(RISK_CATEGORY.SEVERE_HEARING_RISK);
    });

    test('should apply nighttime limit (45 dBA) correctly', () => {
      const evalNight = service.evaluateWhoCompliance(50.0, true);
      expect(evalNight.limit).toBe(45.0);
      expect(evalNight.isExceeded).toBe(true);
    });

    // Regression for #991. The 75-85 dBA branch assigned to `fontCategory`, an
    // identifier that does not exist, so under a module's strict mode every
    // reading in this band threw a ReferenceError. The three cases above sat at
    // 68.5, 92.0 and 50.0 and never entered it.
    test('should classify the 75-85 dBA band as HIGH_EXPOSURE rather than throwing', () => {
      expect(() => service.evaluateWhoCompliance(80.0)).not.toThrow();
      expect(service.evaluateWhoCompliance(80.0).riskCategory).toBe(RISK_CATEGORY.HIGH_EXPOSURE);
    });

    test.each([
      [40.0, false, RISK_CATEGORY.SAFE],
      [55.0, false, RISK_CATEGORY.SAFE],              // at the limit, not over it
      [55.1, false, RISK_CATEGORY.MODERATE_EXPOSURE],
      [74.9, false, RISK_CATEGORY.MODERATE_EXPOSURE],
      [75.0, false, RISK_CATEGORY.HIGH_EXPOSURE],     // lower edge of the band that used to throw
      [84.9, false, RISK_CATEGORY.HIGH_EXPOSURE],     // upper edge of the same band
      [85.0, false, RISK_CATEGORY.SEVERE_HEARING_RISK],
      [44.0, true, RISK_CATEGORY.SAFE],
      [46.0, true, RISK_CATEGORY.MODERATE_EXPOSURE],
      [76.0, true, RISK_CATEGORY.HIGH_EXPOSURE],
    ])('classifies %d dBA (night=%s) as %s', (dba, night, expected) => {
      expect(service.evaluateWhoCompliance(dba, night).riskCategory).toBe(expected);
    });

    test('should never report a negative exceeded margin', () => {
      expect(service.evaluateWhoCompliance(30.0).exceededMargin).toBe(0);
    });

    test('should reject a non-finite decibel value instead of classifying it', () => {
      expect(() => service.evaluateWhoCompliance(NaN)).toThrow('Decibel value must be a finite number.');
      expect(() => service.evaluateWhoCompliance(Infinity)).toThrow('Decibel value must be a finite number.');
      expect(() => service.evaluateWhoCompliance(undefined)).toThrow('Decibel value must be a finite number.');
    });
  });

  describe('Logarithmic Decibel Averaging', () => {
    // The energy *average* of two equal levels is that level. The "+3 dB rule"
    // this test used to assert describes energy *addition*, which is a different
    // operation with its own method — see the suite below.
    test('should compute accurate energy average of multiple decibel values', () => {
      expect(service.calculateLogarithmicAverageDba([70.0, 70.0])).toBe(70.0);
    });

    test('should weight the loudest sample far above the quietest', () => {
      // 90 dBA carries 10^9 units of energy against 10^5 for 50 dBA, so the
      // average sits ~3 dB below the loud sample, not halfway between the two.
      const avg = service.calculateLogarithmicAverageDba([90.0, 50.0]);
      expect(avg).toBeCloseTo(87.0, 1);
      expect(avg).toBeGreaterThan(70.0); // an arithmetic mean would give exactly 70
    });

    test('should return 0 for empty array input', () => {
      expect(service.calculateLogarithmicAverageDba([])).toBe(0.0);
      expect(service.calculateLogarithmicAverageDba(null)).toBe(0.0);
      expect(service.calculateLogarithmicAverageDba(undefined)).toBe(0.0);
      expect(service.calculateLogarithmicAverageDba('70,70')).toBe(0.0);
    });

    test('should ignore non-numeric samples rather than poisoning the aggregate', () => {
      // `null / 10` is 0 and `Math.pow(10, 0)` is 1, so a null used to slip in as
      // a silent 0 dBA source and drag the average down.
      expect(service.calculateLogarithmicAverageDba([70.0, null, 70.0])).toBe(70.0);
      expect(service.calculateLogarithmicAverageDba([70.0, NaN])).toBe(70.0);
      expect(service.calculateLogarithmicAverageDba([null, undefined])).toBe(0.0);
    });
  });

  describe('Combined Source Level (logarithmic addition)', () => {
    test('should apply the +3 dB rule to two equal simultaneous sources', () => {
      expect(service.calculateCombinedSourceDba([70.0, 70.0])).toBe(73.0);
    });

    test('should apply the +6 dB rule to four equal simultaneous sources', () => {
      expect(service.calculateCombinedSourceDba([70.0, 70.0, 70.0, 70.0])).toBe(76.0);
    });

    test('should return the level itself for a single source', () => {
      expect(service.calculateCombinedSourceDba([82.4])).toBe(82.4);
    });

    test('should be barely moved by a source 20 dB quieter', () => {
      // 90 dBA + 70 dBA combine to 90.04 dBA — the quiet source is inaudible
      // against the loud one, which is the whole point of the logarithmic scale.
      expect(service.calculateCombinedSourceDba([90.0, 70.0])).toBeCloseTo(90.0, 1);
    });

    test('should exceed the energy average for any multi-source input', () => {
      const samples = [62.0, 71.5, 68.0];
      expect(service.calculateCombinedSourceDba(samples))
        .toBeGreaterThan(service.calculateLogarithmicAverageDba(samples));
    });

    test('should return 0 for empty or invalid input', () => {
      expect(service.calculateCombinedSourceDba([])).toBe(0.0);
      expect(service.calculateCombinedSourceDba(null)).toBe(0.0);
      expect(service.calculateCombinedSourceDba({ 0: 70 })).toBe(0.0);
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

    test('should agree with the attenuation model it inverts', () => {
      // The buffer distance is where the level falls to 55 dBA, so feeding it
      // back through calculateSoundAttenuation must land on 55 (rounded up, so
      // marginally below).
      const buffer = service.calculateQuietZoneBufferMeters(85.0, 5.0);
      expect(service.calculateSoundAttenuation(85.0, 5.0, buffer)).toBeCloseTo(55.0, 0);
    });

    test('should reject a non-positive or non-finite reference distance', () => {
      expect(() => service.calculateQuietZoneBufferMeters(85.0, 0)).toThrow();
      expect(() => service.calculateQuietZoneBufferMeters(85.0, -5)).toThrow();
      expect(() => service.calculateQuietZoneBufferMeters(NaN, 5)).toThrow();
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
      expect(service.sanitizeInput(undefined)).toBe('');
    });

    test('should escape the ampersand once, not twice', () => {
      expect(service.sanitizeInput('Smoke & dust')).toBe('Smoke &amp; dust');
    });
  });

  describe('Risk category constants', () => {
    test('should be frozen so a caller cannot redefine a band at runtime', () => {
      expect(Object.isFrozen(RISK_CATEGORY)).toBe(true);
    });
  });
});
