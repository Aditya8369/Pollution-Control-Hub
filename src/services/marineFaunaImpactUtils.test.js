/**
 * Unit Tests for Marine Fauna Impact Utilities
 */

import { describe, it, expect } from 'vitest';
import { assessMarineFaunaImpact } from './marineFaunaImpactUtils';

describe('MarineFaunaImpactUtils', () => {
  it('should assess fauna impact for mangrove and coral reef ecosystems', () => {
    const report = assessMarineFaunaImpact('Mangrove Sanctuary & Coral Reef', 10000, 25.0);

    expect(report).toBeDefined();
    expect(report.speciesAtRiskCount).toBeGreaterThan(30);
    expect(report.criticalHabitatsBreached.length).toBeGreaterThanOrEqual(2);
    expect(report.recommendedRescueBoatsCount).toBeGreaterThanOrEqual(3);
  });
});
