/**
 * Unit Tests for Maritime Response Catalog Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFleetRecoveryCapacity, MARITIME_SPILL_RESPONSE_CATALOG } from './maritimeResponseCatalog';

describe('MaritimeResponseCatalog', () => {
  it('should calculate fleet recovery capacity per hour', () => {
    const capacity = calculateFleetRecoveryCapacity(4);
    expect(capacity).toBe(2000);
  });

  it('should contain maritime spill response assets catalog', () => {
    expect(MARITIME_SPILL_RESPONSE_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(MARITIME_SPILL_RESPONSE_CATALOG[0].assetName).toContain('Oleophilic Drum Skimmer');
  });
});
