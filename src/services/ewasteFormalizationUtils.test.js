/**
 * Unit Tests for E-Waste Formalization Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFormalizationProgress } from './ewasteFormalizationUtils';

describe('EwasteFormalizationUtils', () => {
  it('should calculate informal worker formalization progress', () => {
    const res = calculateFormalizationProgress(500, 350);
    expect(res.healthInsuranceCoveragePercent).toBe(70.0);
    expect(res.informalProcessingDeficitPercent).toBe(30.0);
  });
});
