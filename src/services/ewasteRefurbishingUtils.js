/**
 * E-Waste Refurbishing & Life Extension Economics Calculator
 */

export interface RefurbishingEconomics {
  refurbishableRatioPercent: number;
  avoidedEwasteTons: number;
  resaleValueINR: number;
}

/**
 * Calculates economic value and e-waste avoidance of refurbishing IT equipment.
 */
export function calculateRefurbishingEconomics(totalCollectedTons: number): RefurbishingEconomics {
  const ratio = 35.0; // 35% of collected IT e-waste can be refurbished
  const avoidedTons = Math.round(totalCollectedTons * (ratio / 100.0) * 10) / 10;
  const value = avoidedTons * 125000; // INR 1,25,000 value per ton of refurbished electronics

  return {
    refurbishableRatioPercent: ratio,
    avoidedEwasteTons: avoidedTons,
    resaleValueINR: Math.round(value),
  };
}
