/**
 * Wind-blown Fugitive Dust Dispersion Gaussian Plume Utilities
 */

/**
 * @typedef {Object} FugitiveDustDispersionResult
 * @property {number} downwindPm10UgM3At100m
 * @property {number} downwindPm10UgM3At500m
 * @property {number} dustContainmentScore
 */

/**
 * Models fugitive dust dispersion downwind from unpaved excavation site.
 *
 * @param {number} unpavedAreaSqMeters
 * @param {number} windSpeedKph
 * @param {boolean} hasChemicalDustSuppressant
 * @returns {FugitiveDustDispersionResult}
 */
export function calculateFugitiveDustDispersion(unpavedAreaSqMeters, windSpeedKph, hasChemicalDustSuppressant) {
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
