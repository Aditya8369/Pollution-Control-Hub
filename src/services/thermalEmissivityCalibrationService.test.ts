import { correctInfraredRadiometricTemperature } from './thermalEmissivityCalibrationService';

describe('ThermalEmissivityCalibrationService', () => {
  it('applies radiometric emissivity correction for water surfaces accurately', () => {
    const res = correctInfraredRadiometricTemperature('ir-cal-01', 30.0, 'WATER');

    expect(res.sensorId).toBe('ir-cal-01');
    expect(res.targetEmissivity).toBe(0.98);
    expect(res.correctedTemperatureCelsius).toBeGreaterThanOrEqual(30.0);
    expect(res.calibrationStatus).toBe('RADIOMETRICALLY_CALIBRATED');
  });
});
