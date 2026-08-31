/**
 * Soil pH & X-Ray Fluorescence (XRF) Field Spectrometer Calibration Utility
 * Calibrates portable XRF spectrometers against certified reference materials (CRMs)
 * for in-situ heavy metal concentration measurement accuracy.
 */

export interface XrfCalibrationResult {
  spectrometerId: string;
  heavyMetalType: string;
  rawXrfPpm: number;
  certifiedReferenceMaterialPpm: number;
  slopeCorrectionFactor: number;
  calibratedConcentrationMgKg: number;
  isXrfCalibrated: boolean;
}

/**
 * Applies slope and offset correction factors to raw portable XRF readings.
 */
export function calibrateXrfFieldSpectrometer(
  spectrometerId: string,
  heavyMetalType: string,
  rawXrfPpm: number,
  crmPpm: number
): XrfCalibrationResult {
  const slope = crmPpm > 0 ? parseFloat((crmPpm / Math.max(1, rawXrfPpm)).toFixed(3)) : 1.0;
  const calibratedMgKg = parseFloat((rawXrfPpm * slope).toFixed(2));
  const diffPercent = Math.abs((calibratedMgKg - crmPpm) / crmPpm) * 100;

  return {
    spectrometerId,
    heavyMetalType,
    rawXrfPpm,
    certifiedReferenceMaterialPpm: crmPpm,
    slopeCorrectionFactor: slope,
    calibratedConcentrationMgKg: calibratedMgKg,
    isXrfCalibrated: diffPercent <= 5.0,
  };
}
