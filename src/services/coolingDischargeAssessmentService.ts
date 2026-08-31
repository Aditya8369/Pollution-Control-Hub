/**
 * Industrial Cooling Tower Effluent & Aquatic Thermal Discharge Service
 * Evaluates industrial cooling water discharge temperature impact on aquatic river/coastal biomes.
 */

export interface CoolingDischargeAssessment {
  outfallId: string;
  waterBodyId: string;
  dischargeTempCelsius: number;
  receivingWaterBodyTempCelsius: number;
  thermalDeltaCelsius: number;
  aquaticStressTier: 'CRITICAL_THERMAL_SHOCK' | 'ELEVATED_STRESS' | 'NORMAL_DISCHARGE';
  coolingTowerRecirculationRequired: boolean;
}

/**
 * Assesses thermal shock risk to receiving river/marine water bodies.
 */
export function evaluateCoolingDischargeImpact(
  outfallId: string,
  waterBodyId: string,
  dischargeTemp: number,
  receivingTemp: number
): CoolingDischargeAssessment {
  const delta = parseFloat((dischargeTemp - receivingTemp).toFixed(2));
  const isShock = delta >= 7.0;
  const isElevated = delta >= 3.0;

  let tier: CoolingDischargeAssessment['aquaticStressTier'] = 'NORMAL_DISCHARGE';
  if (isShock) tier = 'CRITICAL_THERMAL_SHOCK';
  else if (isElevated) tier = 'ELEVATED_STRESS';

  return {
    outfallId,
    waterBodyId,
    dischargeTempCelsius: dischargeTemp,
    receivingWaterBodyTempCelsius: receivingTemp,
    thermalDeltaCelsius: delta,
    aquaticStressTier: tier,
    coolingTowerRecirculationRequired: isShock,
  };
}
