/**
 * Unit Tests for E-Waste Refurbishing Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateRefurbishingEconomics } from './ewasteRefurbishingUtils';

describe('EwasteRefurbishingUtils', () => {
  it('should calculate refurbishing economics and avoided e-waste', () => {
    const res = calculateRefurbishingEconomics(100.0);
    expect(res.avoidedEwasteTons).toBe(35.0);
    expect(res.resaleValueINR).toBeGreaterThan(1000000);
  });
});
