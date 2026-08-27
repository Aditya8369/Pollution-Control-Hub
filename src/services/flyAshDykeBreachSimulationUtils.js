/**
 * Fly Ash Dyke Failure Simulation & Breach Hydrodynamics Utilities
 */

/**
 * @typedef {Object} DykeBreachSimulationResult
 * @property {number} breachFlowRateM3PerSec
 * @property {number} downstreamInundationKm
 * @property {number} timeToReachRiverHours
 * @property {'CRITICAL_DISASTER' | 'HIGH_FLOOD_ALERT' | 'MODERATE_SLURRY_SPILL'} floodSeverity
 */

/**
 * Simulates ash pond dyke breach slurry outflow dynamics.
 *
 * @param {number} storageVolumeM3
 * @param {number} dykeHeightMeters
 * @param {number} distanceToRiverKm
 * @returns {DykeBreachSimulationResult}
 */
export function simulateAshDykeBreachSlurryOutflow(storageVolumeM3, dykeHeightMeters, distanceToRiverKm) {
  // Peak breach discharge Q = 1.1 * g^0.5 * H^2.5
  const peakFlow = 1.1 * Math.sqrt(9.81) * Math.pow(dykeHeightMeters, 2.5);
  const inundationKm = Math.min(25.0, Math.round((storageVolumeM3 / 100000.0) * 1.5 * 10) / 10);
  const flowVelocityKph = Math.sqrt(9.81 * dykeHeightMeters) * 3.6 * 0.4;
  const timeToRiver = Math.round((distanceToRiverKm / Math.max(1.0, flowVelocityKph)) * 10) / 10;

  /** @type {DykeBreachSimulationResult['floodSeverity']} */
  let severity = 'MODERATE_SLURRY_SPILL';
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
