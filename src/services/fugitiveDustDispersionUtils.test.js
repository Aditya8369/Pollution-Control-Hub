/**
 * Unit Tests for Fugitive Dust Dispersion Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFugitiveDustDispersion } from './fugitiveDustDispersionUtils';

describe('FugitiveDustDispersionUtils', () => {
  it('should calculate downwind PM10 concentrations with and without chemical dust suppressants', () => {
    const withoutSuppressant = calculateFugitiveDustDispersion(10000, 15.0, false);
    const withSuppressant = calculateFugitiveDustDispersion(10000, 15.0, true);

    expect(withoutSuppressant.downwindPm10UgM3At100m).toBeGreaterThan(withSuppressant.downwindPm10UgM3At100m);
    expect(withSuppressant.dustContainmentScore).toBeGreaterThan(withoutSuppressant.dustContainmentScore);
  });
});
