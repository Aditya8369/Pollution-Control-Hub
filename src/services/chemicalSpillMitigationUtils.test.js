/**
 * Unit Tests for Chemical Spill Mitigation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDispersionCloudAreaSqKm,
  generateMitigationProcedures,
  HAZARDOUS_CHEMICAL_CATALOG,
} from '../utils/chemicalSpillMitigationUtils';

describe('ChemicalSpillMitigationUtils', () => {
  it('should calculate dispersion cloud area correctly', () => {
    const area = calculateDispersionCloudAreaSqKm(2.0);
    // Area = pi * 2^2 = ~12.57 sq km
    expect(area).toBeCloseTo(12.57, 1);
  });

  it('should generate 4-step mitigation procedures', () => {
    const steps = generateMitigationProcedures('Class 2.3');
    expect(steps.length).toBe(4);
    expect(steps[0].actionTitle).toContain('Exclusion Zone');
  });

  it('should contain default hazardous chemicals catalog', () => {
    expect(HAZARDOUS_CHEMICAL_CATALOG.length).toBeGreaterThan(3);
    expect(HAZARDOUS_CHEMICAL_CATALOG[0].name).toBe('Chlorine Gas');
  });
});
