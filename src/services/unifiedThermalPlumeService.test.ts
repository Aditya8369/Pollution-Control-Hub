import { aggregateUnifiedThermalPayload } from './unifiedThermalPlumeService';

describe('UnifiedThermalPlumeService', () => {
  it('aggregates microclimate and industrial thermal telemetry into unified payload', () => {
    const sensors = [
      {
        sensorId: 'ir-01',
        facilityId: 'plant-01',
        surfaceTempCelsius: 36.0,
        ambientBaselineCelsius: 24.0,
      },
    ];

    const payload = aggregateUnifiedThermalPayload(
      'zone-heat-01',
      sensors,
      0.8,
      35,
      'outfall-01',
      'river-hudson',
      35.0,
      25.0
    );

    expect(payload.zoneId).toBe('zone-heat-01');
    expect(payload.criticalHotspotsCount).toBe(1);
    expect(payload.coolingTowerRecirculationRequired).toBe(true);
    expect(payload.recommendedInterventions.length).toBeGreaterThan(0);
  });
});
