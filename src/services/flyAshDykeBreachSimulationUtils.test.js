/**
 * Unit Tests for Fly Ash Dyke Breach Simulation Utilities
 */

import { describe, it, expect } from 'vitest';
import { simulateAshDykeBreachSlurryOutflow } from './flyAshDykeBreachSimulationUtils';

describe('FlyAshDykeBreachSimulationUtils', () => {
  it('should simulate dyke breach peak flow and downstream inundation', () => {
    const res = simulateAshDykeBreachSlurryOutflow(600000, 18.0, 5.0);
    expect(res).toBeDefined();
    expect(res.breachFlowRateM3PerSec).toBeGreaterThan(1000.0);
    expect(res.floodSeverity).toBe('CRITICAL_DISASTER');
    expect(res.timeToReachRiverHours).toBeLessThan(5.0);
  });
});
