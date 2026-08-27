/**
 * Unit Tests for Dust Suppressant Chemical Catalog Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateChemicalSuppressantQuantityLiters, DUST_SUPPRESSANT_CHEMICAL_CATALOG } from './dustSuppressantChemicalCatalog';

describe('DustSuppressantChemicalCatalog', () => {
  it('should calculate chemical dust suppressant volume in liters', () => {
    const liters = calculateChemicalSuppressantQuantityLiters(10000);
    expect(liters).toBe(5000);
  });

  it('should contain catalog of certified chemical dust suppressants', () => {
    expect(DUST_SUPPRESSANT_CHEMICAL_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(DUST_SUPPRESSANT_CHEMICAL_CATALOG[0].chemicalName).toContain('Calcium Chloride');
  });
});
