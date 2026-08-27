/**
 * Unit Tests for Fly Ash Optimization Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFlyAshConcreteMixOptimization, calculateHighwayEmbankmentAshRequirementTons } from '../utils/flyAshOptimizationUtils';

describe('FlyAshOptimizationUtils', () => {
  it('should calculate concrete mix CO2 reduction for 25% fly ash replacement', () => {
    const res = calculateFlyAshConcreteMixOptimization(25.0);
    expect(res.co2ReductionKgPerM3).toBeGreaterThan(70.0);
    expect(res.compressiveStrengthMPa28Days).toBeGreaterThan(40.0);
  });

  it('should calculate highway embankment fly ash requirement in tons', () => {
    const tons = calculateHighwayEmbankmentAshRequirementTons(10, 30.0, 3.0);
    expect(tons).toBe(1125000);
  });
});
