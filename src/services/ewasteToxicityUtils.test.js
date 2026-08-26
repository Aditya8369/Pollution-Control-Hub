/**
 * Unit Tests for E-Waste Component Toxicity Assessment Utilities
 */

import { describe, it, expect } from 'vitest';
import { assessEwasteComponentToxicity } from './ewasteToxicityUtils';

describe('EwasteToxicityUtils', () => {
  it('should assess lead and cadmium toxicity content for laptops', () => {
    const report = assessEwasteComponentToxicity('Laptops, Servers & Personal Computers');
    expect(report).toBeDefined();
    expect(report.leadContentGramsPerUnit).toBeGreaterThan(5.0);
    expect(report.requiresHazardousWasteManifest).toBe(true);
  });
});
