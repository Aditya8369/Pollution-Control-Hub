import { evaluateEffluentSensorCalibration } from './effluentSensorCalibrationService';

describe('EffluentSensorCalibrationService', () => {
  it('evaluates sensor calibration drift and returns calibration status', () => {
    const res = evaluateEffluentSensorCalibration('sensor-ph-01', 'PH_SENSOR', 7.2, 7.0);

    expect(res.sensorId).toBe('sensor-ph-01');
    expect(res.isCalibrated).toBe(true);
    expect(res.driftErrorPercent).toBeLessThan(5.0);
    expect(res.recommendedRecalibrationDays).toBe(30);
  });
});
