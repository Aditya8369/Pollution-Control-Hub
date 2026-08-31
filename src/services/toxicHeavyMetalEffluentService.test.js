import {
  evaluateHeavyMetalTelemetry,
  generateEffluentHeavyMetalAuditReport,
} from './toxicHeavyMetalEffluentService.js';

describe('ToxicHeavyMetalEffluentService', () => {
  const normalReading = {
    sensorId: 'sensor-pb-01',
    outfallId: 'outfall-A',
    metalType: 'LEAD_PB',
    concentrationMgL: 0.01,
    effluentFlowRateLps: 5,
  };

  const criticalReading = {
    sensorId: 'sensor-hg-02',
    outfallId: 'outfall-B',
    metalType: 'MERCURY_HG',
    concentrationMgL: 0.02,
    effluentFlowRateLps: 10,
  };

  it('evaluates safe background heavy metal levels correctly', () => {
    const res = evaluateHeavyMetalTelemetry(normalReading);

    expect(res.sensorId).toBe('sensor-pb-01');
    expect(res.isBreached).toBe(false);
    expect(res.toxicityTier).toBe('SAFE_BACKGROUND_LEVELS');
    expect(res.dischargeDivertTriggered).toBe(false);
  });

  it('detects critical toxic discharge and triggers ZLD divert', () => {
    const res = evaluateHeavyMetalTelemetry(criticalReading);

    expect(res.isBreached).toBe(true);
    expect(res.toxicityTier).toBe('HAZARDOUS_TOXIC_DISCHARGE');
    expect(res.dischargeDivertTriggered).toBe(true);
    expect(res.massLoadGramsPerHour).toBeGreaterThan(0);
  });

  it('generates aggregated effluent audit report across outfall sensors', () => {
    const report = generateEffluentHeavyMetalAuditReport('facility-plating-01', [normalReading, criticalReading]);

    expect(report.facilityId).toBe('facility-plating-01');
    expect(report.overallEffluentStatus).toBe('EMERGENCY_ZLD_RECIRCULATION_ACTIVE');
    expect(report.zldDivertActive).toBe(true);
    expect(report.activeViolationsCount).toBe(1);
  });
});
