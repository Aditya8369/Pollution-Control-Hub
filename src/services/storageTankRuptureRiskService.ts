/**
 * Hazardous Chemical Storage Tank Pressure & Leak Telemetry Sensor Simulation
 * Simulates high-frequency industrial tank telemetry (pressure, temperature, valve status)
 * for proactive catastrophic rupture prediction.
 */

export interface StorageTankTelemetry {
  tankId: string;
  chemicalName: string;
  pressureBar: number;
  temperatureCelsius: number;
  reliefValveSealed: boolean;
}

export interface TankRuptureRiskAssessment {
  tankId: string;
  ruptureRiskLevel: 'NORMAL' | 'ELEVATED_PRESSURE_WARNING' | 'HIGH_RUPTURE_RISK';
  reliefVentActivated: boolean;
  coolingWaterRequired: boolean;
  recommendedAction: string;
}

/**
 * Evaluates storage tank telemetry for structural rupture risks.
 */
export function evaluateStorageTankRuptureRisk(telemetry: StorageTankTelemetry): TankRuptureRiskAssessment {
  const highPressure = telemetry.pressureBar > 10.0;
  const highTemp = telemetry.temperatureCelsius > 45.0;

  let riskLevel: TankRuptureRiskAssessment['ruptureRiskLevel'] = 'NORMAL';
  let reliefVent = false;
  let cooling = false;
  let action = 'Maintain standard tank telemetry monitoring.';

  if (highPressure && highTemp) {
    riskLevel = 'HIGH_RUPTURE_RISK';
    reliefVent = true;
    cooling = true;
    action = 'CRITICAL: Open emergency pressure relief valve and engage exterior water deluge cooling.';
  } else if (highPressure || highTemp) {
    riskLevel = 'ELEVATED_PRESSURE_WARNING';
    cooling = highTemp;
    action = 'Monitor pressure build-up and reduce fill rates.';
  }

  return {
    tankId: telemetry.tankId,
    ruptureRiskLevel: riskLevel,
    reliefVentActivated: reliefVent,
    coolingWaterRequired: cooling,
    recommendedAction: action,
  };
}
