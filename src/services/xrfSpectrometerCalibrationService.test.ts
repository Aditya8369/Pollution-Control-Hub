import { calibrateXrfFieldSpectrometer } from './xrfSpectrometerCalibrationService';

describe('XrfSpectrometerCalibrationService', () => {
  it('calibrates raw XRF reading against certified reference material', () => {
    const res = calibrateXrfFieldSpectrometer('xrf-unit-01', 'LEAD_PB', 520, 500);

    expect(res.spectrometerId).toBe('xrf-unit-01');
    expect(res.calibratedConcentrationMgKg).toBe(500);
    expect(res.isXrfCalibrated).toBe(true);
  });
});
