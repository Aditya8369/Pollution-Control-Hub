/**
 * Continuous Ambient Air Quality Monitoring System (CAAQMS) Sensor Calibration & Telemetry Drift
 */

/**
 * @typedef {Object} CaaqmsSensorCalibrationReport
 * @property {string} sensorId
 * @property {number} calibratedPm10UgM3
 * @property {number} driftPercentage
 * @property {boolean} maintenanceRequired
 */

/**
 * Calibrates optical particle counter (OPC) sensor telemetry against gravimetric reference standards.
 *
 * @param {string} sensorId
 * @param {number} rawPm10Reading
 * @param {number} relativeHumidityPercent
 * @returns {CaaqmsSensorCalibrationReport}
 */
export function calibrateCaaqmsSensor(sensorId, rawPm10Reading, relativeHumidityPercent) {
  // High relative humidity (> 75%) causes hygroscopic growth of dust particles leading to optical over-reading
  const humidityCorrectionFactor = relativeHumidityPercent > 75 ? 1.0 - (relativeHumidityPercent - 75) * 0.008 : 1.0;
  const calibrated = Math.round(rawPm10Reading * humidityCorrectionFactor * 10) / 10;
  const drift = Math.round(((rawPm10Reading - calibrated) / rawPm10Reading) * 100.0 * 10) / 10;

  return {
    sensorId,
    calibratedPm10UgM3: calibrated,
    driftPercentage: drift,
    maintenanceRequired: drift > 15.0,
  };
}
