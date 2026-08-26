/**
 * Unit Tests for E-Waste Catalog Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateHydrometallurgicalYieldKg, EWASTE_HYDROMETALLURGY_CATALOG } from './ewasteCatalog';

describe('EwasteCatalog', () => {
  it('should calculate hydrometallurgical recovery yield in kg', () => {
    const yieldKg = calculateHydrometallurgicalYieldKg(5.0);
    expect(yieldKg).toBeGreaterThan(500);
  });

  it('should contain catalog of certified hydrometallurgical processes', () => {
    expect(EWASTE_HYDROMETALLURGY_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(EWASTE_HYDROMETALLURGY_CATALOG[0].processName).toContain('PCB Leaching');
  });
});
