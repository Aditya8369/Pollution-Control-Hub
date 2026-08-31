import { calculateDownwindConcentration, computeHazmatPerimeterZones } from './plumeDispersionUtils.js';

describe('PlumeDispersionUtils', () => {
  it('calculates downwind ground concentration correctly', () => {
    const conc = calculateDownwindConcentration(100, 5, 200);

    expect(conc).toBeGreaterThan(0);
  });

  it('computes hazmat isolation and protective action zones based on spill size', () => {
    const smallSpill = computeHazmatPerimeterZones('CHLORINE_CL2', 10);
    expect(smallSpill.initialIsolationRadiusMeters).toBe(30);

    const largeSpill = computeHazmatPerimeterZones('AMMONIA_NH3', 250);
    expect(largeSpill.initialIsolationRadiusMeters).toBe(150);
    expect(largeSpill.protectiveActionRadiusMeters).toBe(800);
  });
});
