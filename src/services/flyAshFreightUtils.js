/**
 * Fly Ash Supply Chain Transportation Network Utilities
 */

export interface FreightCostResult {
  totalFreightINR: number;
  subsidyEligibleINR: number;
  netCostToPlantINR: number;
}

/**
 * Calculates rail rake vs road bulk tanker freight cost for fly ash transport.
 */
export function calculateFlyAshFreightCost(
  tonsToTransport: number,
  distanceKm: number,
  mode: 'RAIL_RAKE' | 'ROAD_TANKER'
): FreightCostResult {
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
