/**
 * Electronic Waste (E-Waste) Circular Recycling & EPR Compliance Service Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateEprRecyclingCompliance,
  calculatePreciousMetalRecoveryYieldGram,
  generateEwasteCollectionDispatchPlan,
  EWASTE_CATEGORIES,
} from './ewasteRecyclingService';

describe('EwasteRecyclingService', () => {
  const sampleProducer = {
    producerId: 'EPR-2026-991',
    companyName: 'TechNordic Electronics India',
    annualSalesVolumeUnits: 150000,
    category: EWASTE_CATEGORIES.SMARTPHONES_TABLETS,
    collectedEwasteTons: 120.0,
    recycledEwasteTons: 105.0,
    targetEprRecyclingRatePercent: 80.0,
    reportedAt: '2026-08-25T14:00:00Z',
  };

  it('should evaluate Extended Producer Responsibility (EPR) compliance', () => {
    const compliance = evaluateEprRecyclingCompliance(sampleProducer);
    expect(compliance).toBeDefined();
    // The EPR obligation is measured against estimated generation, not against
    // what the producer happened to collect: 150,000 units x 1.5 kg = 225 t, of
    // which 105 t were recycled = 46.7%. The 80% target is 180 t, so 75 t short.
    expect(compliance.achievedRecyclingRatePercent).toBeCloseTo(46.7, 1);
    expect(compliance.eprStatus).toBe('CRITICAL_EPR_DEFICIT');
    expect(compliance.isCompliant).toBe(false);
    expect(compliance.recyclingTargetDeficitTons).toBeCloseTo(75.0, 1);
  });

  it('should calculate urban mining precious metal recovery yield (Gold, Silver, Copper, Lithium)', () => {
    const yieldData = calculatePreciousMetalRecoveryYieldGram(
      sampleProducer.category,
      sampleProducer.recycledEwasteTons
    );

    expect(yieldData).toBeDefined();
    expect(yieldData.goldRecoveryGrams).toBeGreaterThan(100.0);
    expect(yieldData.copperRecoveryKg).toBeGreaterThan(1000.0);
    expect(yieldData.lithiumRecoveryKg).toBeGreaterThan(0.0);
  });

  it('should generate e-waste collection center dispatch plan', () => {
    const plan = generateEwasteCollectionDispatchPlan(sampleProducer);

    expect(plan).toBeDefined();
    expect(plan.producerId).toBe('EPR-2026-991');
    expect(plan.authorizedRecyclers.length).toBeGreaterThan(0);
    expect(plan.logisticsVehiclesDispatched).toBeGreaterThan(0);
  });
});
