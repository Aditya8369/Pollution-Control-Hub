import { analyzeSatelliteFloatingDebrisIndex } from './satelliteFloatingDebrisService';

describe('SatelliteFloatingDebrisService', () => {
  it('detects ocean plastic slicks using multispectral FDI reflectance calculation', () => {
    const payload = {
      tileId: 'tile-pacific-101',
      nirBandReflectance: 0.15,
      swirBandReflectance: 0.08,
      redBandReflectance: 0.04,
    };

    const res = analyzeSatelliteFloatingDebrisIndex(payload);

    expect(res.tileId).toBe('tile-pacific-101');
    expect(res.floatingDebrisIndexFDI).toBeGreaterThan(0.02);
    expect(res.plasticSlickDetected).toBe(true);
    expect(res.confidenceScore).toBeGreaterThan(50);
  });
});
