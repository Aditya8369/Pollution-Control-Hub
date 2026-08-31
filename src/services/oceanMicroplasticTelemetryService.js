/**
 * Microplastic Ocean Water Quality Telemetry & Coastal Surveillance Service
 * Analyzes marine water quality sensors for microplastic particle counts (particles/m³),
 * polymer composition classifications (PET, HDPE, PVC, LDPE, PP, PS), marine organism ingestion risks,
 * and coastal beach cleanup dispatch priority indices.
 */

export const MICROPLASTIC_RISK_THRESHOLDS = {
  LOW_CONCENTRATION: 50, // particles per cubic meter
  MODERATE_CONCENTRATION: 250,
  HIGH_CONCENTRATION: 1000,
};

export const POLYMER_TOXICITY_SCORES = {
  PET: 2.5,
  HDPE: 1.5,
  PVC: 4.5,
  LDPE: 1.8,
  PP: 2.0,
  PS: 3.8,
};

/**
 * Evaluates marine microplastic sensor telemetry for coastal water safety.
 */
export function evaluateOceanMicroplasticTelemetry(reading) {
  if (!reading || !reading.sensorId || reading.particleCountPerM3 === undefined) {
    return {
      sensorId: reading?.sensorId || 'UNKNOWN',
      isBreached: false,
      hazardTier: 'PRISTINE_MARINE_ENVIRONMENT',
      ingestionRiskScore: 0,
      coastalCleanupPriority: 'LOW',
    };
  }

  const count = reading.particleCountPerM3;
  const polymer = reading.dominantPolymerType || 'PET';
  const toxFactor = POLYMER_TOXICITY_SCORES[polymer] || 2.0;

  let isBreached = false;
  let hazardTier = 'PRISTINE_MARINE_ENVIRONMENT';
  let cleanupPriority = 'LOW';

  if (count >= MICROPLASTIC_RISK_THRESHOLDS.HIGH_CONCENTRATION) {
    isBreached = true;
    hazardTier = 'CRITICAL_PLASTIC_POLLUTION_ZONE';
    cleanupPriority = 'HIGH_IMMEDIATE_DISPATCH';
  } else if (count >= MICROPLASTIC_RISK_THRESHOLDS.MODERATE_CONCENTRATION) {
    isBreached = true;
    hazardTier = 'ELEVATED_MICROPLASTIC_WARNING';
    cleanupPriority = 'MEDIUM_SCHEDULED';
  }

  // Calculate marine ingestion risk score (0 - 100)
  const riskScore = Math.min(100, Math.round((count / 10) * (toxFactor / 2.0)));

  return {
    sensorId: reading.sensorId,
    coastalZoneId: reading.coastalZoneId,
    particleCountPerM3: count,
    dominantPolymerType: polymer,
    isBreached,
    hazardTier,
    ingestionRiskScore: riskScore,
    coastalCleanupPriority: cleanupPriority,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates coastal zone microplastic sensor telemetry to produce regional marine health report.
 */
export function generateRegionalMicroplasticReport(regionId, sensorReadings) {
  if (!sensorReadings || sensorReadings.length === 0) {
    return {
      regionId,
      overallStatus: 'HEALTHY_COASTAL_WATERS',
      totalBreachesCount: 0,
      averageParticleCountPerM3: 0,
      highPriorityZonesCount: 0,
      evaluations: [],
    };
  }

  const evals = sensorReadings.map(evaluateOceanMicroplasticTelemetry);
  const breaches = evals.filter((e) => e.isBreached);
  const highPriority = evals.filter((e) => e.coastalCleanupPriority === 'HIGH_IMMEDIATE_DISPATCH').length;
  const avgCount = Math.round(evals.reduce((acc, e) => acc + e.particleCountPerM3, 0) / evals.length);

  let status = 'HEALTHY_COASTAL_WATERS';
  if (highPriority > 0) status = 'COASTAL_EMERGENCY_CLEANUP_REQUIRED';
  else if (breaches.length > 0) status = 'MODERATE_PLASTIC_ACCUMULATION';

  return {
    regionId,
    overallStatus: status,
    totalBreachesCount: breaches.length,
    averageParticleCountPerM3: avgCount,
    highPriorityZonesCount: highPriority,
    evaluations: evals,
    generatedAt: new Date().toISOString(),
  };
}
