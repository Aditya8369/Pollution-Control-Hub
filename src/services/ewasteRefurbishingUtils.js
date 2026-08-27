/**
 * E-Waste Refurbishing & Life Extension Economics Calculator
 */

/**
 * @typedef {Object} RefurbishingEconomics
 * @property {number} refurbishableRatioPercent
 * @property {number} avoidedEwasteTons
 * @property {number} resaleValueINR
 */

/**
 * Calculates economic value and e-waste avoidance of refurbishing IT equipment.
 *
 * @param {number} totalCollectedTons
 * @returns {RefurbishingEconomics}
 */
export function calculateRefurbishingEconomics(totalCollectedTons) {
  const ratio = 35.0; // 35% of collected IT e-waste can be refurbished
  const avoidedTons = Math.round(totalCollectedTons * (ratio / 100.0) * 10) / 10;
  const value = avoidedTons * 125000; // INR 1,25,000 value per ton of refurbished electronics

  return {
    refurbishableRatioPercent: ratio,
    avoidedEwasteTons: avoidedTons,
    resaleValueINR: Math.round(value),
  };
}
