/**
 * Unit Tests for Heavy Metal Leaching Utilities
 */

import { describe, it, expect } from 'vitest';
import { evaluateHeavyMetalLeaching } from './heavyMetalLeachingUtils';

describe('HeavyMetalLeachingUtils', () => {
  it('should evaluate heavy metal leaching concentrations under acidic conditions', () => {
    const res = evaluateHeavyMetalLeaching('Class F Fly Ash', 5.5);
    expect(res).toBeDefined();
    expect(res.exceedsCPCBSafeLimits).toBe(true);
    expect(res.groundwaterToxicityAlert).toBe('HIGH_RISK_GROUNDWATER_CONTAMINATION');
  });
});
