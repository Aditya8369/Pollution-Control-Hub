/**
 * Construction & Demolition (C&D) Debris Recycling Economics & Dust Emission Utilities
 */

/**
 * @typedef {Object} CdRecyclingResult
 * @property {number} recycledAggregateTons
 * @property {number} avoidedLandfillVolumeM3
 * @property {number} dustEmissionReductionPercent
 */

/**
 * Calculates concrete aggregate recycling yield from C&D debris crushing.
 *
 * @param {number} debrisWeightTons
 * @returns {CdRecyclingResult}
 */
export function calculateCdDebrisRecyclingYield(debrisWeightTons) {
  const aggregateTons = Math.round(debrisWeightTons * 0.75 * 10) / 10;
  const landfillVolumeM3 = Math.round((debrisWeightTons / 1.6) * 10) / 10;
  const dustReduction = 45.0; // Wet-scrubbed crushing reduces fugitive dust by 45%

  return {
    recycledAggregateTons: aggregateTons,
    avoidedLandfillVolumeM3: landfillVolumeM3,
    dustEmissionReductionPercent: dustReduction,
  };
}
