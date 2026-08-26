/**
 * Additional Toxic Plume Dispersion Gaussian Grid Calculator
 */

export interface PlumeGridPoint {
  xDistanceKm: number;
  yDistanceKm: number;
  concentrationPpm: number;
  hazardLevel: 'SAFE' | 'WARNING' | 'DANGER' | 'LETHAL';
}

/**
 * Generates Gaussian dispersion grid matrix points for GIS mapping.
 */
export function generatePlumeDispersionGrid(
  sourceQuantityGallons: number,
  windSpeedKph: number,
  gridResolutionKm = 0.5
): PlumeGridPoint[] {
  const grid: PlumeGridPoint[] = [];
  const maxDistanceKm = 5.0;

  for (let x = 0; x <= maxDistanceKm; x += gridResolutionKm) {
    for (let y = -2.0; y <= 2.0; y += gridResolutionKm) {
      const q = sourceQuantityGallons * 10.0;
      const u = Math.max(1.0, windSpeedKph);

      // Simplified Gaussian Plume Concentration C(x,y)
      const sy = 0.1 * x + 0.05;
      const conc = (q / (Math.PI * u * sy * sy)) * Math.exp(-(y * y) / (2 * sy * sy));

      const concPpm = Math.max(0, Math.round(conc * 100) / 100);

      let hazardLevel: PlumeGridPoint['hazardLevel'] = 'SAFE';
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
