/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Industrial Effluent Core Service Engine
 * File: src/services/industrialEffluentService.test.js
 * Framework: Jest JS / Enterprise Wastewater Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { IndustrialEffluentService } from './industrialEffluentService';

describe('IndustrialEffluentService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new IndustrialEffluentService();
  });

  describe('Daily Mass Loading Calculations', () => {
    test('should correctly compute mass loading in Kg/day', () => {
      // 200 mg/L * 500 KLD / 1000 = 100 Kg/day
      const mass = service.calculateDailyMassLoading(200.0, 500.0);
      expect(mass).toBe(100.0);
    });

    test('should throw error for negative concentration or flow inputs', () => {
      expect(() => service.calculateDailyMassLoading(-10, 500)).toThrow('Concentration and flow rate must be non-negative.');
      expect(() => service.calculateDailyMassLoading(200, -50)).toThrow('Concentration and flow rate must be non-negative.');
    });
  });

  describe('BOD/COD Biodegradability Index Evaluation', () => {
    test('should classify BOD/COD ratio >= 0.5 as HIGHLY_BIODEGRADABLE', () => {
      const evalRes = service.evaluateBiodegradabilityIndex(300, 500);
      expect(evalRes.ratio).toBe(0.6);
      expect(evalRes.classification).toBe('HIGHLY_BIODEGRADABLE');
    });

    test('should classify BOD/COD ratio < 0.3 as TOXIC_REFRACTORY', () => {
      const evalRes = service.evaluateBiodegradabilityIndex(100, 500);
      expect(evalRes.ratio).toBe(0.2);
      expect(evalRes.classification).toBe('TOXIC_REFRACTORY');
    });

    test('should throw error for zero or negative COD input', () => {
      expect(() => service.evaluateBiodegradabilityIndex(100, 0)).toThrow('COD concentration must be strictly positive.');
    });
  });

  describe('CPCB Discharge Compliance Audits', () => {
    test('should identify non-compliance when BOD exceeds 30 mg/L', () => {
      const evalComp = service.evaluateDischargeCompliance(45.0, 180.0, 0.5);
      expect(evalComp.isFullyCompliant).toBe(false);
      expect(evalComp.isBodExceeded).toBe(true);
      expect(evalComp.bodMargin).toBe(15.0);
    });

    test('should identify full compliance when all parameters are below CPCB limits', () => {
      const evalComp = service.evaluateDischargeCompliance(25.0, 200.0, 1.0);
      expect(evalComp.isFullyCompliant).toBe(true);
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
