/**
 * Fly Ash Dyke Failure Simulation & Breach Hydrodynamics Utilities
 */

export interface DykeBreachSimulationResult {
  breachFlowRateM3PerSec: number;
  downstreamInundationKm: number;
  timeToReachRiverHours: number;
  floodSeverity: 'CRITICAL_DISASTER' | 'HIGH_FLOOD_ALERT' | 'MODERATE_SLURRY_SPILL';
}

/**
 * Simulates ash pond dyke breach slurry outflow dynamics.
 */
export function simulateAshDykeBreachSlurryOutflow(
  storageVolumeM3: number,
  dykeHeightMeters: number,
  distanceToRiverKm: number
): DykeBreachSimulationResult {
  // Peak breach discharge Q = 1.1 * g^0.5 * H^2.5
  const peakFlow = 1.1 * Math.sqrt(9.81) * Math.pow(dykeHeightMeters, 2.5);
  const inundationKm = Math.min(25.0, Math.round((storageVolumeM3 / 100000.0) * 1.5 * 10) / 10);
  const flowVelocityKph = Math.sqrt(9.81 * dykeHeightMeters) * 3.6 * 0.4;
  const timeToRiver = Math.round((distanceToRiverKm / Math.max(1.0, flowVelocityKph)) * 10) / 10;

  let severity: DykeBreachSimulationResult['floodSeverity'] = 'MODERATE_SLURRY_SPILL';
  if (storageVolumeM3 > 500000 || dykeHeightMeters > 15) {
    severity = 'CRITICAL_DISASTER';
  } else if (storageVolumeM3 > 200000) {
    severity = 'HIGH_FLOOD_ALERT';
  }

  return {
    breachFlowRateM3PerSec: Math.round(peakFlow * 10) / 10,
    downstreamInundationKm: inundationKm,
    timeToReachRiverHours: timeToRiver,
    floodSeverity: severity,
  };
}
