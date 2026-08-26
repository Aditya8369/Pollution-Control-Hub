/**
 * Enterprise Architectural Specification & Header:
 * Module: Automated Unit Test Suite for Ocean Microplastics Core Service Engine
 * File: src/services/oceanMicroplasticsService.test.js
 * Framework: Jest JS / Enterprise Marine Plastic Test Suite
 * Coverage Goal: 100% Statement & Branch Coverage Compliance
 */

import { OceanMicroplasticsService } from './oceanMicroplasticsService';

describe('OceanMicroplasticsService Enterprise Test Suite', () => {
  let service;

  beforeEach(() => {
    service = new OceanMicroplasticsService();
  });

  describe('Skimmer Removal Rate Calculations', () => {
    test('should correctly compute plastic removal per hour and post-filtration density', () => {
      // 1000 /m³ * 500 m³/h * 90% efficiency = 450,000 particles removed/hr
      const res = service.calculateSkimmerRemovalRate(1000.0, 500.0, 0.90);
      expect(res.totalRemoved).toBe(450000);
      expect(res.postFiltrationDensity).toBe(100.0);
    });

    test('should throw error for invalid flow or efficiency inputs', () => {
      expect(() => service.calculateSkimmerRemovalRate(-10, 500, 0.90)).toThrow('Valid non-negative parameters');
      expect(() => service.calculateSkimmerRemovalRate(1000, 500, 1.5)).toThrow('Valid non-negative parameters');
    });
  });

  describe('Trophic Bioaccumulation Risk Evaluation', () => {
    test('should classify high bioaccumulation factor at trophic level 3', () => {
      const res = service.evaluateBioaccumulationRisk(500.0, 3);
      // 500 * (1.8)^2 = 500 * 3.24 = 1620 -> HIGH_TROPHIC_RISK
      expect(res.bafFactor).toBe(1620.0);
      expect(res.riskCategory).toBe('HIGH_TROPHIC_RISK');
    });

    test('should throw error for invalid trophic level outside 1 to 5 range', () => {
      expect(() => service.evaluateBioaccumulationRisk(500.0, 6)).toThrow('trophic level between 1 and 5');
    });
  });

  describe('NOAA Marine Plastic Compliance Audits', () => {
    test('should identify NOAA exceedance for particle density > 50 /m³', () => {
      const evalRes = service.evaluateNoaaCompliance(120.0);
      expect(evalRes.isExceeded).toBe(true);
      expect(evalRes.exceededMargin).toBe(70.0);
    });

    test('should identify critical NOAA status for particle density >= 1000 /m³', () => {
      const evalRes = service.evaluateNoaaCompliance(1250.0);
      expect(evalRes.isCritical).toBe(true);
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
