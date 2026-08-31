/**
 * Atmospheric Plume Dispersion Modeling Utility
 * Calculates chemical gas plume transport velocity, ground-level deposition concentration,
 * and downwind hazard zone buffer perimeters.
 */

/**
 * Calculates downwind chemical gas concentration using modified Gaussian plume model.
 */
export function calculateDownwindConcentration(sourceReleaseRateGps, windSpeedMs, downwindDistanceMeters) {
  if (sourceReleaseRateGps <= 0 || windSpeedMs <= 0 || downwindDistanceMeters <= 0) {
    return 0;
  }

  // Dispersion coefficients (standard neutral stability class D approximation)
  const sigmaY = 0.08 * downwindDistanceMeters * Math.pow(1 + 0.0001 * downwindDistanceMeters, -0.5);
  const sigmaZ = 0.06 * downwindDistanceMeters * Math.pow(1 + 0.0015 * downwindDistanceMeters, -0.5);

  const concGpm3 = sourceReleaseRateGps / (Math.PI * windSpeedMs * sigmaY * sigmaZ);
  return parseFloat(concGpm3.toFixed(4));
}

/**
 * Computes safety perimeter radius buffers (Initial Isolation Zone vs Downwind Protective Action Zone).
 */
export function computeHazmatPerimeterZones(chemicalType, releaseQuantityKg) {
  let initialIsolationRadiusMeters = 30;
  let protectiveActionRadiusMeters = 100;

  if (releaseQuantityKg > 100) {
    initialIsolationRadiusMeters = 150;
    protectiveActionRadiusMeters = 800;
  } else if (releaseQuantityKg > 20) {
    initialIsolationRadiusMeters = 60;
    protectiveActionRadiusMeters = 300;
  }

  return {
    chemicalType,
    releaseQuantityKg,
    initialIsolationRadiusMeters,
    protectiveActionRadiusMeters,
    recommendedFirstResponderAction: 'Evacuate immediate perimeter upwind and isolate spill zone.',
  };
}
