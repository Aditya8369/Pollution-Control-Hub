import { aggregateUnifiedSoilRemediationPayload } from './unifiedSoilRemediationService';

describe('UnifiedSoilRemediationService', () => {
  it('aggregates soil core samples and groundwater leachate risk into unified remediation payload', () => {
    const samples = [
      {
        sampleId: 'sample-01',
        siteId: 'site-brownfield-99',
        heavyMetalType: 'LEAD_PB',
        concentrationMgKg: 750,
      },
    ];

    const payload = aggregateUnifiedSoilRemediationPayload('site-brownfield-99', samples, 'plot-01', 0.08, 2.0);

    expect(payload.siteId).toBe('site-brownfield-99');
    expect(payload.overallSoilStatus).toBe('CRITICAL_BROWNFIELD_HAZARD_ZONE');
    expect(payload.containmentBarrierRequired).toBe(true);
    expect(payload.actionableRemediationSteps.length).toBeGreaterThan(0);
  });
});
