/**
 * Fly Ash Supply Chain Transportation Network Utilities
 */

/**
 * @typedef {Object} FreightCostResult
 * @property {number} totalFreightINR
 * @property {number} subsidyEligibleINR
 * @property {number} netCostToPlantINR
 */

/**
 * Calculates rail rake vs road bulk tanker freight cost for fly ash transport.
 *
 * @param {number} tonsToTransport
 * @param {number} distanceKm
 * @param {'RAIL_RAKE' | 'ROAD_TANKER'} mode
 * @returns {FreightCostResult}
 */
export function calculateFlyAshFreightCost(tonsToTransport, distanceKm, mode) {
  const ratePerTonKm = mode === 'RAIL_RAKE' ? 1.4 : 2.8;
  const totalFreight = tonsToTransport * distanceKm * ratePerTonKm;

  // As per CPCB guidelines, transportation within 100 km is 100% subsidized by TPP
  const subsidyEligible = distanceKm <= 100 ? totalFreight : totalFreight * 0.5;
  const netCost = totalFreight - subsidyEligible;

  return {
    totalFreightINR: Math.round(totalFreight),
    subsidyEligibleINR: Math.round(subsidyEligible),
    netCostToPlantINR: Math.round(netCost),
  };
}
