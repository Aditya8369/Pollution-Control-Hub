import {
  evaluateChemicalSensorReading,
  generateFacilityLeakContainmentReport,
} from './chemicalLeakDetectionService.js';

describe('ChemicalLeakDetectionService', () => {
  const normalSensor = {
    sensorId: 'sensor-nh3-01',
    facilityId: 'plant-alpha',
    chemicalType: 'AMMONIA_NH3',
    concentrationPpm: 10,
    windSpeedKmh: 10,
  };

  const criticalSensor = {
    sensorId: 'sensor-cl2-02',
    facilityId: 'plant-alpha',
    chemicalType: 'CHLORINE_CL2',
    concentrationPpm: 2.5,
    windSpeedKmh: 15,
  };

  it('evaluates normal operating sensor readings correctly', () => {
    const result = evaluateChemicalSensorReading(normalSensor);

    expect(result.sensorId).toBe('sensor-nh3-01');
    expect(result.isBreached).toBe(false);
    expect(result.severityTier).toBe('NORMAL_OPERATING_LEVELS');
    expect(result.evacuationRequired).toBe(false);
  });

  it('detects critical breach and triggers evacuation and plume radius calculation', () => {
    const result = evaluateChemicalSensorReading(criticalSensor);

    expect(result.isBreached).toBe(true);
    expect(result.severityTier).toBe('CRITICAL_HAZMAT_BREACH');
    expect(result.evacuationRequired).toBe(true);
    expect(result.dispersionPlumeRadiusMeters).toBeGreaterThan(0);
  });

  it('aggregates facility containment report across sensor network', () => {
    const report = generateFacilityLeakContainmentReport('plant-alpha', [normalSensor, criticalSensor]);

    expect(report.facilityId).toBe('plant-alpha');
    expect(report.overallStatus).toBe('EMERGENCY_EVACUATION_ACTIVE');
    expect(report.activeBreachesCount).toBe(1);
    expect(report.facilityEvacuationTriggered).toBe(true);
  });
});
