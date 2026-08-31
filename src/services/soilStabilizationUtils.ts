/**
 * Industrial Soil Bio-Char & Chelating Agent Chemical Stabilization Utility
 * Simulates chemical soil washing (EDTA chelating agents) and bio-char immobilizing amendments
 * to prevent heavy metal leaching into groundwater aquifers.
 */

export interface SoilStabilizationPlan {
  plotId: string;
  heavyMetalType: string;
  biocharApplicationRateTonsPerHectare: number;
  edtaChelatingAgentKgPerHectare: number;
  leachingReductionPercent: number;
  groundwaterAquiferSafe: boolean;
}

/**
 * Calculates biochar and chelating agent application dosages for soil stabilization.
 */
export function calculateSoilStabilizationDosage(
  plotId: string,
  heavyMetalType: string,
  soilConcentrationMgKg: number
): SoilStabilizationPlan {
  const biocharRate = parseFloat((soilConcentrationMgKg * 0.05).toFixed(2));
  const edtaRate = parseFloat((soilConcentrationMgKg * 0.2).toFixed(2));
  const leachingRed = Math.min(95, Math.round(biocharRate * 4.5));

  return {
    plotId,
    heavyMetalType,
    biocharApplicationRateTonsPerHectare: biocharRate,
    edtaChelatingAgentKgPerHectare: edtaRate,
    leachingReductionPercent: leachingRed,
    groundwaterAquiferSafe: leachingRed >= 75,
  };
}
