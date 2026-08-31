import { estimateThermalMitigationImpact } from './urbanThermalMitigationUtils';

describe('UrbanThermalMitigationUtils', () => {
  it('estimates high surface temperature reduction for cool roof and canopy greening', () => {
    const config = {
      zoneId: 'zone-downtown-01',
      roofAlbedoRating: 0.85,
      treeCanopyCoveragePercent: 40,
      pavementPermeabilityPercent: 25,
    };

    const res = estimateThermalMitigationImpact(config);

    expect(res.zoneId).toBe('zone-downtown-01');
    expect(res.predictedTemperatureReductionCelsius).toBeGreaterThanOrEqual(4.0);
    expect(res.mitigationEffectivenessTier).toBe('HIGHLY_EFFECTIVE');
  });
});
