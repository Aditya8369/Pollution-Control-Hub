import { calculateMarinePlasticDrift } from './marinePlasticDriftUtils';

describe('MarinePlasticDriftUtils', () => {
  it('calculates ocean plastic drift trajectory and accumulation coordinates accurately', () => {
    const drift = calculateMarinePlasticDrift('zone-coastal-01', 25.0, -80.0, 2.5, 45);

    expect(drift.coastalZoneId).toBe('zone-coastal-01');
    expect(drift.driftVelocityKmPerDay).toBeGreaterThan(100);
    expect(drift.estimatedAccumulationCoordinates.latitude).toBeGreaterThan(25.0);
    expect(drift.estimatedAccumulationCoordinates.longitude).toBeGreaterThan(-80.0);
  });
});
