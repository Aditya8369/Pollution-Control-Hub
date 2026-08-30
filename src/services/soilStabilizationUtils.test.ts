import { calculateSoilStabilizationDosage } from './soilStabilizationUtils';

describe('SoilStabilizationUtils', () => {
  it('calculates biochar and EDTA dosage for contaminated plot stabilization', () => {
    const plan = calculateSoilStabilizationDosage('plot-101', 'LEAD_PB', 500);

    expect(plan.plotId).toBe('plot-101');
    expect(plan.biocharApplicationRateTonsPerHectare).toBe(25);
    expect(plan.edtaChelatingAgentKgPerHectare).toBe(100);
    expect(plan.leachingReductionPercent).toBeGreaterThanOrEqual(75);
    expect(plan.groundwaterAquiferSafe).toBe(true);
  });
});
