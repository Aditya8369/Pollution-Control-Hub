/**
 * Construction & Demolition (C&D) Debris Recycling Economics & Dust Emission Utilities
 */

export interface CdRecyclingResult {
  recycledAggregateTons: number;
  avoidedLandfillVolumeM3: number;
  dustEmissionReductionPercent: number;
}

/**
 * Calculates concrete aggregate recycling yield from C&D debris crushing.
 */
export function calculateCdDebrisRecyclingYield(debrisWeightTons: number): CdRecyclingResult {
  const aggregateTons = Math.round(debrisWeightTons * 0.75 * 10) / 10;
  const landfillVolumeM3 = Math.round((debrisWeightTons / 1.6) * 10) / 10;
  const dustReduction = 45.0; // Wet-scrubbed crushing reduces fugitive dust by 45%

  return {
    recycledAggregateTons: aggregateTons,
    avoidedLandfillVolumeM3: landfillVolumeM3,
    dustEmissionReductionPercent: dustReduction,
  };
}
