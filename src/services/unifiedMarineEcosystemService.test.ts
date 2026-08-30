import { aggregateUnifiedMarineEcosystemPayload } from './unifiedMarineEcosystemService';

describe('UnifiedMarineEcosystemService', () => {
  it('aggregates multi-source marine plastic telemetry into unified regional payload', () => {
    const readings = [
      {
        sensorId: 'buoy-101',
        coastalZoneId: 'zone-north',
        particleCountPerM3: 1100,
        dominantPolymerType: 'PVC',
      },
    ];

    const satPayload = {
      tileId: 'sat-tile-55',
      nirBandReflectance: 0.18,
      swirBandReflectance: 0.09,
      redBandReflectance: 0.05,
    };

    const payload = aggregateUnifiedMarineEcosystemPayload('region-marine-01', 'zone-north', readings, 20.0, -150.0, satPayload);

    expect(payload.regionId).toBe('region-marine-01');
    expect(payload.satelliteSlickDetected).toBe(true);
    expect(payload.recommendedActionItems.length).toBeGreaterThan(0);
  });
});
