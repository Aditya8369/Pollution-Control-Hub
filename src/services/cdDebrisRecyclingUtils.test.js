/**
 * Unit Tests for C&D Debris Recycling Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateCdDebrisRecyclingYield } from './cdDebrisRecyclingUtils';

describe('CdDebrisRecyclingUtils', () => {
  it('should calculate C&D debris recycling yield and landfill volume saved', () => {
    const res = calculateCdDebrisRecyclingYield(1000.0);
    expect(res).toBeDefined();
    expect(res.recycledAggregateTons).toBe(750.0);
    expect(res.avoidedLandfillVolumeM3).toBeGreaterThan(600.0);
  });
});
