/**
 * Unit Tests for Toxic Plume Dispersion Gaussian Grid Calculator
 */

import { describe, it, expect } from 'vitest';
import { generatePlumeDispersionGrid } from './toxicPlumeDispersionGrid';

describe('ToxicPlumeDispersionGrid', () => {
  it('should generate dispersion grid matrix points', () => {
    const grid = generatePlumeDispersionGrid(2000, 15.0, 1.0);
    expect(grid).toBeDefined();
    expect(grid.length).toBeGreaterThan(10);
    expect(grid[0]).toHaveProperty('concentrationPpm');
    expect(grid[0]).toHaveProperty('hazardLevel');
  });
});
