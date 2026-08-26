/**
 * Unit Tests for Fly Ash Freight Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFlyAshFreightCost } from './flyAshFreightUtils';

describe('FlyAshFreightUtils', () => {
  it('should calculate rail rake freight cost and subsidy', () => {
    const res = calculateFlyAshFreightCost(2000, 80, 'RAIL_RAKE');
    expect(res.totalFreightINR).toBeGreaterThan(0);
    expect(res.subsidyEligibleINR).toBe(res.totalFreightINR); // 100% subsidy under 100km
    expect(res.netCostToPlantINR).toBe(0);
  });
});
