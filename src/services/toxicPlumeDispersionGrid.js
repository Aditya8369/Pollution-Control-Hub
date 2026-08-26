/**
 * Additional Toxic Plume Dispersion Gaussian Grid Calculator
 */

/**
 * @typedef {Object} PlumeGridPoint
 * @property {number} xDistanceKm
 * @property {number} yDistanceKm
 * @property {number} concentrationPpm
 * @property {'SAFE' | 'WARNING' | 'DANGER' | 'LETHAL'} hazardLevel
 */

/**
 * Generates Gaussian dispersion grid matrix points for GIS mapping.
 *
 * @param {number} sourceQuantityGallons
 * @param {number} windSpeedKph
 * @param {number} [gridResolutionKm=0.5]
 * @returns {PlumeGridPoint[]}
 */
export function generatePlumeDispersionGrid(sourceQuantityGallons, windSpeedKph, gridResolutionKm = 0.5) {
  /** @type {PlumeGridPoint[]} */
  const grid = [];
  const maxDistanceKm = 5.0;

  for (let x = 0; x <= maxDistanceKm; x += gridResolutionKm) {
    for (let y = -2.0; y <= 2.0; y += gridResolutionKm) {
      const q = sourceQuantityGallons * 10.0;
      const u = Math.max(1.0, windSpeedKph);

      // Simplified Gaussian Plume Concentration C(x,y)
      const sy = 0.1 * x + 0.05;
      const conc = (q / (Math.PI * u * sy * sy)) * Math.exp(-(y * y) / (2 * sy * sy));

      const concPpm = Math.max(0, Math.round(conc * 100) / 100);

      /** @type {PlumeGridPoint['hazardLevel']} */
      let hazardLevel = 'SAFE';
      if (concPpm > 500) {
        hazardLevel = 'LETHAL';
      } else if (concPpm > 100) {
        hazardLevel = 'DANGER';
      } else if (concPpm > 20) {
        hazardLevel = 'WARNING';
      }

      grid.push({
        xDistanceKm: x,
        yDistanceKm: y,
        concentrationPpm: concPpm,
        hazardLevel,
      });
    }
  }

  return grid;
}
