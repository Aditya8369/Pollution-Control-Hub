/**
 * Wind-blown Fugitive Dust Dispersion Gaussian Plume Utilities
 */

export interface FugitiveDustDispersionResult {
  downwindPm10UgM3At100m: number;
  downwindPm10UgM3At500m: number;
  dustContainmentScore: number;
}

/**
 * Models fugitive dust dispersion downwind from unpaved excavation site.
 */
export function calculateFugitiveDustDispersion(
  unpavedAreaSqMeters: number,
  windSpeedKph: number,
  hasChemicalDustSuppressant: boolean
): FugitiveDustDispersionResult {
  const emissionFactor = hasChemicalDustSuppressant ? 0.2 : 1.0;
  const sourceStrength = (unpavedAreaSqMeters / 1000.0) * windSpeedKph * emissionFactor * 15.0;

  const pm10At100m = Math.round(sourceStrength * 3.5);
  const pm10At500m = Math.round(sourceStrength * 0.8);
  const score = hasChemicalDustSuppressant ? 85.0 : 35.0;

  return {
    downwindPm10UgM3At100m: pm10At100m,
    downwindPm10UgM3At500m: pm10At500m,
    dustContainmentScore: score,
  };
}
