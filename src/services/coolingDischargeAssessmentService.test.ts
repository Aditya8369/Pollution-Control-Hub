import { evaluateCoolingDischargeImpact } from './coolingDischargeAssessmentService';

describe('CoolingDischargeAssessmentService', () => {
  it('detects critical thermal shock when discharge exceeds receiving water temperature by 7C', () => {
    const res = evaluateCoolingDischargeImpact('outfall-thermal-01', 'river-ohio', 32.5, 24.0);

    expect(res.outfallId).toBe('outfall-thermal-01');
    expect(res.thermalDeltaCelsius).toBe(8.5);
    expect(res.aquaticStressTier).toBe('CRITICAL_THERMAL_SHOCK');
    expect(res.coolingTowerRecirculationRequired).toBe(true);
  });
});
