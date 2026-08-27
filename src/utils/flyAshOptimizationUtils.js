/**
 * Fly Ash Geotechnical & Concrete Mix Optimization Utilities
 */

/**
 * @typedef {Object} ConcreteMixResult
 * @property {number} cementReplacementPercent
 * @property {number} co2ReductionKgPerM3
 * @property {number} compressiveStrengthMPa28Days
 */

/**
 * Calculates cement replacement savings and carbon offset for fly-ash blended cement (PPC).
 *
 * @param {number} [flyAshPercent=25.0]
 * @returns {ConcreteMixResult}
 */
export function calculateFlyAshConcreteMixOptimization(flyAshPercent = 25.0) {
  const cementReductionKg = 350.0 * (flyAshPercent / 100.0);
  const co2Reduction = cementReductionKg * 0.92; // 0.92 kg CO2 saved per kg cement replaced
  const strength28Days = 45.0 + (flyAshPercent > 30.0 ? -3.0 : 2.0);

  return {
    cementReplacementPercent: flyAshPercent,
    co2ReductionKgPerM3: Math.round(co2Reduction * 10) / 10,
    compressiveStrengthMPa28Days: Math.round(strength28Days * 10) / 10,
  };
}

/**
 * Estimates fly ash required for NHAI highway embankment construction (tons per km).
 *
 * @param {number} roadLengthKm
 * @param {number} [widthMeters=30.0]
 * @param {number} [heightMeters=3.0]
 * @returns {number}
 */
export function calculateHighwayEmbankmentAshRequirementTons(roadLengthKm, widthMeters = 30.0, heightMeters = 3.0) {
  const volumeM3 = roadLengthKm * 1000.0 * widthMeters * heightMeters;
  const ashDensityTonsPerM3 = 1.25;
  return Math.round(volumeM3 * ashDensityTonsPerM3);
}
