import {
  evaluateThermalPlumeTelemetry,
  generateUrbanHeatIslandReport,
} from './thermalPlumeTelemetryService.js';

describe('ThermalPlumeTelemetryService', () => {
  const normalSensor = {
    sensorId: 'sensor-ir-01',
    facilityId: 'power-plant-north',
    surfaceTempCelsius: 24.5,
    ambientBaselineCelsius: 23.0,
    windSpeedMs: 4,
  };

  const criticalSensor = {
    sensorId: 'sensor-ir-02',
    facilityId: 'power-plant-north',
    surfaceTempCelsius: 38.0,
    ambientBaselineCelsius: 25.0,
    windSpeedMs: 2,
  };

  it('evaluates normal surface baseline correctly', () => {
    const res = evaluateThermalPlumeTelemetry(normalSensor);

    expect(res.sensorId).toBe('sensor-ir-01');
    expect(res.isBreached).toBe(false);
    expect(res.thermalSeverityTier).toBe('NORMAL_THERMAL_BASELINE');
    expect(res.coolingTowerInterlockRequired).toBe(false);
  });

  it('detects critical industrial thermal breach and cooling interlock requirement', () => {
    const res = evaluateThermalPlumeTelemetry(criticalSensor);

    expect(res.isBreached).toBe(true);
    expect(res.thermalSeverityTier).toBe('CRITICAL_INDUSTRIAL_THERMAL_BREACH');
    expect(res.coolingTowerInterlockRequired).toBe(true);
    expect(res.plumeDissipationDistanceMeters).toBeGreaterThan(0);
  });

  it('generates urban heat island report across zone sensors', () => {
    const report = generateUrbanHeatIslandReport('zone-metro-01', [normalSensor, criticalSensor]);

    expect(report.zoneId).toBe('zone-metro-01');
    expect(report.overallHeatIndexTier).toBe('SEVERE_URBAN_HEAT_ISLAND_EMERGENCY');
    expect(report.criticalHotspotsCount).toBe(1);
    expect(report.averageDeltaCelsius).toBeGreaterThan(0);
  });
});
