import { evaluateGroundwaterLeachateRisk } from './groundwaterLeachateRiskService';

describe('GroundwaterLeachateRiskService', () => {
  it('detects high aquifer contamination risk on shallow groundwater depth', () => {
    const res = evaluateGroundwaterLeachateRisk('plot-gw-01', 800, 0.05, 2.5);

    expect(res.plotId).toBe('plot-gw-01');
    expect(res.aquiferThreatTier).toBe('HIGH_AQUIFER_CONTAMINATION_RISK');
    expect(res.containmentBarrierRequired).toBe(true);
    expect(res.plumeMigrationSpeedMetersPerYear).toBeGreaterThan(0);
  });
});
