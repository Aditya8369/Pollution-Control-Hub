/**
 * Marine Ecosystem Trophic Bioaccumulation Risk Service
 * Evaluates microplastic ingestion impacts on pelagic fish species, sea turtles, and marine mammals.
 */

export interface SpeciesIngestionAssessment {
  speciesName: string;
  trophicLevel: 'PLANKTIVORE' | 'PELAGIC_FISH' | 'APEX_PREDATOR' | 'MARINE_MAMMAL';
  particleIngestionRatePerDay: number;
  chemicalLeachingRiskScore: number; // 0 - 100
  hazardTier: 'CRITICAL_SPECIES_THREAT' | 'MODERATE_IMPACT' | 'LOW_EXPOSURE';
}

/**
 * Assesses microplastic bioaccumulation risk per marine species.
 */
export function evaluateSpeciesIngestionRisk(
  speciesName: string,
  trophicLevel: SpeciesIngestionAssessment['trophicLevel'],
  ambientMicroplasticDensityPerM3: number
): SpeciesIngestionAssessment {
  let ingestionFactor = 5;
  if (trophicLevel === 'PLANKTIVORE') ingestionFactor = 25;
  else if (trophicLevel === 'PELAGIC_FISH') ingestionFactor = 15;
  else if (trophicLevel === 'APEX_PREDATOR') ingestionFactor = 8;

  const dailyIngestion = Math.round(ambientMicroplasticDensityPerM3 * ingestionFactor);
  const leachRisk = Math.min(100, Math.round((dailyIngestion / 100) * 85));

  let tier: SpeciesIngestionAssessment['hazardTier'] = 'LOW_EXPOSURE';
  if (leachRisk >= 70) tier = 'CRITICAL_SPECIES_THREAT';
  else if (leachRisk >= 35) tier = 'MODERATE_IMPACT';

  return {
    speciesName,
    trophicLevel,
    particleIngestionRatePerDay: dailyIngestion,
    chemicalLeachingRiskScore: leachRisk,
    hazardTier: tier,
  };
}
