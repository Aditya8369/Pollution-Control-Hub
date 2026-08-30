import { aggregateEffluentCompliancePayload } from './unifiedEffluentComplianceService';

describe('UnifiedEffluentComplianceService', () => {
  it('aggregates multi-parameter effluent telemetry into unified dashboard payload', () => {
    const outfalls = [
      {
        sensorId: 'sensor-hg-01',
        outfallId: 'outfall-A',
        metalType: 'MERCURY_HG',
        concentrationMgL: 0.015,
        effluentFlowRateLps: 12,
      },
    ];

    const payload = aggregateEffluentCompliancePayload(
      'fac-metal-101',
      'Apex Electroplating Plant',
      outfalls,
      'river-hudson',
      20
    );

    expect(payload.facilityId).toBe('fac-metal-101');
    expect(payload.overallComplianceStatus).toBe('HIGH_ECOTOXICITY_ALERT');
    expect(payload.activeViolationsCount).toBe(1);
    expect(payload.hazardousSludgeManifestCreated).toBe(true);
    expect(payload.recommendedRegulatoryActions.length).toBeGreaterThan(0);
  });
});
