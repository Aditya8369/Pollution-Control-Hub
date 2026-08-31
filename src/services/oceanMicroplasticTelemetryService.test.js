import {
  evaluateOceanMicroplasticTelemetry,
  generateRegionalMicroplasticReport,
} from './oceanMicroplasticTelemetryService.js';

describe('OceanMicroplasticTelemetryService', () => {
  const pristineReading = {
    sensorId: 'sensor-buoy-01',
    coastalZoneId: 'zone-alpha',
    particleCountPerM3: 20,
    dominantPolymerType: 'HDPE',
  };

  const pollutedReading = {
    sensorId: 'sensor-buoy-02',
    coastalZoneId: 'zone-beta',
    particleCountPerM3: 1200,
    dominantPolymerType: 'PVC',
  };

  it('evaluates pristine ocean water quality correctly', () => {
    const res = evaluateOceanMicroplasticTelemetry(pristineReading);

    expect(res.sensorId).toBe('sensor-buoy-01');
    expect(res.isBreached).toBe(false);
    expect(res.hazardTier).toBe('PRISTINE_MARINE_ENVIRONMENT');
    expect(res.coastalCleanupPriority).toBe('LOW');
  });

  it('detects critical microplastic pollution zone and high cleanup priority', () => {
    const res = evaluateOceanMicroplasticTelemetry(pollutedReading);

    expect(res.isBreached).toBe(true);
    expect(res.hazardTier).toBe('CRITICAL_PLASTIC_POLLUTION_ZONE');
    expect(res.coastalCleanupPriority).toBe('HIGH_IMMEDIATE_DISPATCH');
    expect(res.ingestionRiskScore).toBeGreaterThan(50);
  });

  it('generates regional microplastic report across marine buoys', () => {
    const report = generateRegionalMicroplasticReport('region-coastal-01', [pristineReading, pollutedReading]);

    expect(report.regionId).toBe('region-coastal-01');
    expect(report.overallStatus).toBe('COASTAL_EMERGENCY_CLEANUP_REQUIRED');
    expect(report.totalBreachesCount).toBe(1);
    expect(report.highPriorityZonesCount).toBe(1);
  });
});
