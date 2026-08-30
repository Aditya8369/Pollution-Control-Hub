/**
 * Marine Plastic Hydrodynamic Drift & Garbage Patch Accumulation Utility
 * Models ocean current drift vectors, tidal flow transport, and garbage patch accumulation density.
 */

export interface PlasticDriftVector {
  coastalZoneId: string;
  oceanCurrentSpeedKnots: number;
  currentHeadingDegrees: number;
  estimatedAccumulationCoordinates: {
    latitude: number;
    longitude: number;
  };
  driftVelocityKmPerDay: number;
}

/**
 * Calculates marine plastic drift trajectory and accumulation coordinates.
 */
export function calculateMarinePlasticDrift(
  coastalZoneId: string,
  startLat: number,
  startLon: number,
  currentSpeedKnots: number,
  headingDegrees: number
): PlasticDriftVector {
  // 1 knot ≈ 1.852 km/h -> 44.448 km/day
  const driftKmPerDay = parseFloat((currentSpeedKnots * 44.448).toFixed(2));

  // Latitude / longitude shift approximation (1 deg lat ≈ 111 km)
  const rad = (headingDegrees * Math.PI) / 180;
  const deltaLat = (driftKmPerDay * Math.cos(rad)) / 111;
  const deltaLon = (driftKmPerDay * Math.sin(rad)) / (111 * Math.cos((startLat * Math.PI) / 180));

  return {
    coastalZoneId,
    oceanCurrentSpeedKnots: currentSpeedKnots,
    currentHeadingDegrees: headingDegrees,
    estimatedAccumulationCoordinates: {
      latitude: parseFloat((startLat + deltaLat).toFixed(4)),
      longitude: parseFloat((startLon + deltaLon).toFixed(4)),
    },
    driftVelocityKmPerDay: driftKmPerDay,
  };
}
