/**
 * Aquatic Ecotoxicology & Bioaccumulation Risk Assessment Engine
 * Models toxic heavy metal bioaccumulation in aquatic food chains (plankton -> benthic organisms -> fish)
 * and computes Chronic Daily Intake (CDI) safety thresholds for downstream water bodies.
 */

export interface AquaticEcotoxAssessment {
  waterBodyId: string;
  metalType: string;
  bioconcentrationFactorBCF: number;
  trophicMagnificationFactor: number;
  ecotoxicologicalRiskScore: number; // 0 - 100
  aquaticLifeThreatTier: 'LOW_RISK' | 'MODERATE_ECOTOXICITY' | 'ACUTE_AQUATIC_TOXICITY';
  remediationRecommendations: string[];
}

export const HEAVY_METAL_BCF_FACTORS: Record<string, number> = {
  LEAD_PB: 450,
  MERCURY_HG: 5000,
  CADMIUM_CD: 900,
  CHROMIUM_VI: 200,
  ARSENIC_AS: 350,
};

/**
 * Assesses ecotoxicological risk to aquatic species based on heavy metal discharge concentrations.
 */
export function evaluateAquaticEcotoxicology(waterBodyId: string, metalType: string, concentrationMgL: number): AquaticEcotoxAssessment {
  const bcf = HEAVY_METAL_BCF_FACTORS[metalType] || 500;
  const bioacc = concentrationMgL * bcf;

  let riskScore = Math.min(100, Math.round(bioacc * 2));
  let tier: AquaticEcotoxAssessment['aquaticLifeThreatTier'] = 'LOW_RISK';
  const recs: string[] = [];

  if (riskScore >= 75) {
    tier = 'ACUTE_AQUATIC_TOXICITY';
    recs.push('Issue fish consumption advisory and suspend downstream drinking water intake.');
    recs.push('Deploy activated carbon in-situ sediment capping to bind heavy metals.');
  } else if (riskScore >= 35) {
    tier = 'MODERATE_ECOTOXICITY';
    recs.push('Increase macroinvertebrate biological monitoring frequency.');
  } else {
    recs.push('Continue baseline water quality monitoring.');
  }

  return {
    waterBodyId,
    metalType,
    bioconcentrationFactorBCF: bcf,
    trophicMagnificationFactor: parseFloat((bcf / 1000).toFixed(2)),
    ecotoxicologicalRiskScore: riskScore,
    aquaticLifeThreatTier: tier,
    remediationRecommendations: recs,
  };
}
