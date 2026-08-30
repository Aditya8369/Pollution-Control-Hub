/**
 * Industrial Contaminated Soil Toxic Heavy Metal Telemetry & Phytoremediation Service
 * Evaluates core soil sensor telemetry for hazardous heavy metals (Lead, Arsenic, Cadmium, Hexavalent Chromium),
 * determines soil leaching hazard tiers, and calculates hyperaccumulator plant species (Sunflowers, Poplar, Indian Mustard) deployment density.
 */

export const SOIL_HEAVY_METAL_LIMITS_MG_KG = {
  LEAD_PB: { targetMgKg: 100, hazardThresholdMgKg: 400 },
  ARSENIC_AS: { targetMgKg: 20, hazardThresholdMgKg: 100 },
  CADMIUM_CD: { targetMgKg: 3, hazardThresholdMgKg: 20 },
  CHROMIUM_VI: { targetMgKg: 50, hazardThresholdMgKg: 250 },
};

/**
 * Evaluates soil core sample heavy metal contamination telemetry.
 */
export function evaluateSoilHeavyMetalContamination(sample) {
  if (!sample || !sample.sampleId || sample.heavyMetalType === undefined || sample.concentrationMgKg === undefined) {
    return {
      sampleId: sample?.sampleId || 'UNKNOWN',
      isContaminated: false,
      hazardTier: 'UNCONTAMINATED_SOIL_BASELINE',
      phytoremediationRequired: false,
      recommendedPlantSpecies: 'NATIVE_TURF',
    };
  }

  const metal = sample.heavyMetalType;
  const conc = sample.concentrationMgKg;
  const limits = SOIL_HEAVY_METAL_LIMITS_MG_KG[metal] || { targetMgKg: 50, hazardThresholdMgKg: 200 };

  let isContaminated = false;
  let hazardTier = 'UNCONTAMINATED_SOIL_BASELINE';
  let phytoRequired = false;
  let plant = 'NATIVE_TURF';

  if (conc >= limits.hazardThresholdMgKg) {
    isContaminated = true;
    hazardTier = 'CRITICAL_HAZARDOUS_SOIL_CONTAMINATION';
    phytoRequired = true;
    plant = metal === 'LEAD_PB' ? 'Helianthus annuus (Sunflower)' : 'Brassica juncea (Indian Mustard)';
  } else if (conc >= limits.targetMgKg) {
    isContaminated = true;
    hazardTier = 'ELEVATED_HEAVY_METAL_SOIL_ALERT';
    phytoRequired = true;
    plant = 'Populus deltoides (Eastern Cottonwood)';
  }

  // Calculate phytoremediation bio-extraction estimate (months required)
  const monthsRequired = phytoRequired ? Math.round((conc / limits.targetMgKg) * 6) : 0;

  return {
    sampleId: sample.sampleId,
    siteId: sample.siteId,
    heavyMetalType: metal,
    concentrationMgKg: conc,
    isContaminated,
    hazardTier,
    phytoremediationRequired: phytoRequired,
    recommendedPlantSpecies: plant,
    estimatedRemediationMonths: monthsRequired,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates site soil samples to generate industrial brownfield soil remediation report.
 */
export function generateBrownfieldSoilReport(siteId, samples) {
  if (!samples || samples.length === 0) {
    return {
      siteId,
      overallSoilStatus: 'CLEAN_GROUND_BASELINE',
      contaminatedPlotCount: 0,
      averageRemediationMonths: 0,
      phytoremediationActive: false,
      sampleEvaluations: [],
    };
  }

  const evals = samples.map(evaluateSoilHeavyMetalContamination);
  const contaminated = evals.filter((e) => e.isContaminated);
  const phytoCount = evals.filter((e) => e.phytoremediationRequired).length;
  const avgMonths = phytoCount > 0 ? Math.round(evals.reduce((acc, e) => acc + e.estimatedRemediationMonths, 0) / phytoCount) : 0;

  let status = 'CLEAN_GROUND_BASELINE';
  if (evals.some((e) => e.hazardTier === 'CRITICAL_HAZARDOUS_SOIL_CONTAMINATION')) {
    status = 'CRITICAL_BROWNFIELD_HAZARD_ZONE';
  } else if (contaminated.length > 0) {
    status = 'ELEVATED_BROWNFIELD_MONITORING';
  }

  return {
    siteId,
    overallSoilStatus: status,
    contaminatedPlotCount: contaminated.length,
    averageRemediationMonths: avgMonths,
    phytoremediationActive: phytoCount > 0,
    sampleEvaluations: evals,
    generatedAt: new Date().toISOString(),
  };
}
