/**
 * Industrial Effluent Flow Meter & Outfall pH Sensor Calibration Utility
 * Calibrates continuous online outfall flow meters and pH sensors to ensure zero drift error
 * and regulatory compliance with CPCB / EPA effluent monitoring guidelines.
 */

export interface SensorCalibrationResult {
  sensorId: string;
  sensorType: 'FLOW_METER' | 'PH_SENSOR' | 'TURBIDITY_METER';
  driftErrorPercent: number;
  isCalibrated: boolean;
  recommendedRecalibrationDays: number;
}

/**
 * Evaluates online sensor raw vs reference reading drift.
 */
export function evaluateEffluentSensorCalibration(
  sensorId: string,
  sensorType: SensorCalibrationResult['sensorType'],
  rawReading: number,
  referenceStandardReading: number
): SensorCalibrationResult {
  const diff = Math.abs(rawReading - referenceStandardReading);
  const driftPercent = parseFloat(((diff / referenceStandardReading) * 100).toFixed(2));
  const isCalibrated = driftPercent <= 5.0;

  return {
    sensorId,
    sensorType,
    driftErrorPercent: driftPercent,
    isCalibrated,
    recommendedRecalibrationDays: isCalibrated ? 30 : 7,
  };
}
