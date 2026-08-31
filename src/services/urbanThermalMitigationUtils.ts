/**
 * Cool Roof & Urban Vegetative Canopy Thermal Mitigation Utility
 * Simulates albedo enhancement (high-reflectance roof coatings) and urban tree canopy coverage
 * to estimate microclimate surface temperature reduction.
 */

export interface UrbanMitigationConfig {
  zoneId: string;
  roofAlbedoRating: number; // 0.1 (dark asphalt) - 0.9 (white reflective)
  treeCanopyCoveragePercent: number; // 0 - 100
  pavementPermeabilityPercent: number;
}

export interface ThermalMitigationEstimate {
  zoneId: string;
  predictedTemperatureReductionCelsius: number;
  mitigationEffectivenessTier: 'HIGHLY_EFFECTIVE' | 'MODERATE_MITIGATION' | 'INSUFFICIENT_COVERAGE';
  recommendedInterventions: string[];
}

/**
 * Calculates surface temperature reduction based on urban greening and cool roof parameters.
 */
export function estimateThermalMitigationImpact(config: UrbanMitigationConfig): ThermalMitigationEstimate {
  const albedoGain = (config.roofAlbedoRating - 0.2) * 4.5;
  const canopyGain = (config.treeCanopyCoveragePercent / 100) * 3.5;
  const totalReduction = parseFloat(Math.max(0, albedoGain + canopyGain).toFixed(2));

  let tier: ThermalMitigationEstimate['mitigationEffectivenessTier'] = 'MODERATE_MITIGATION';
  if (totalReduction >= 4.0) tier = 'HIGHLY_EFFECTIVE';
  else if (totalReduction < 1.5) tier = 'INSUFFICIENT_COVERAGE';

  const recs: string[] = [];
  if (config.roofAlbedoRating < 0.6) {
    recs.push('Apply high-albedo solar-reflective coating to commercial flat roofs.');
  }
  if (config.treeCanopyCoveragePercent < 30) {
    recs.push('Increase urban street tree planting to reach minimum 30% canopy density.');
  }

  return {
    zoneId: config.zoneId,
    predictedTemperatureReductionCelsius: totalReduction,
    mitigationEffectivenessTier: tier,
    recommendedInterventions: recs,
  };
}
