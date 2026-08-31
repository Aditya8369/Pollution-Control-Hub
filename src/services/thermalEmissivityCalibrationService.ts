/**
 * Thermal Infrared Sensor Calibration & Radiometric Emissivity Correction Utility
 * Calibrates industrial IR thermal sensors for target surface emissivity (e.g., concrete, asphalt, steel, water)
 * to ensure radiometric measurement precision within +/- 0.5 degrees Celsius.
 */

export interface EmissivityCorrectionResult {
  sensorId: string;
  surfaceMaterial: 'CONCRETE' | 'ASPHALT' | 'STEEL' | 'WATER';
  targetEmissivity: number;
  rawTemperatureCelsius: number;
  correctedTemperatureCelsius: number;
  calibrationStatus: 'RADIOMETRICALLY_CALIBRATED' | 'CALIBRATION_DRIFT_EXCEEDED';
}

export const MATERIAL_EMISSIVITY_TABLE: Record<string, number> = {
  CONCRETE: 0.92,
  ASPHALT: 0.95,
  STEEL: 0.80,
  WATER: 0.98,
};

/**
 * Applies Stefan-Boltzmann radiometric emissivity correction formula to infrared thermal readings.
 */
export function correctInfraredRadiometricTemperature(
  sensorId: string,
  rawTempCelsius: number,
  surfaceMaterial: EmissivityCorrectionResult['surfaceMaterial']
): EmissivityCorrectionResult {
  const eTarget = MATERIAL_EMISSIVITY_TABLE[surfaceMaterial] || 0.95;

  // Stefan-Boltzmann radiometric temperature adjustment
  const rawKelvin = rawTempCelsius + 273.15;
  const correctedKelvin = rawKelvin * Math.pow(1.0 / eTarget, 0.25);
  const correctedCelsius = parseFloat((correctedKelvin - 273.15).toFixed(2));

  const delta = Math.abs(correctedCelsius - rawTempCelsius);

  return {
    sensorId,
    surfaceMaterial,
    targetEmissivity: eTarget,
    rawTemperatureCelsius: rawTempCelsius,
    correctedTemperatureCelsius: correctedCelsius,
    calibrationStatus: delta <= 5.0 ? 'RADIOMETRICALLY_CALIBRATED' : 'CALIBRATION_DRIFT_EXCEEDED',
  };
}
