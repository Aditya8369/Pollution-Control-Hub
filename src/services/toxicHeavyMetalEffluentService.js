/**
 * Industrial Toxic Heavy Metal Wastewater Effluent Telemetry Service
 * Monitors industrial discharge telemetry for hazardous heavy metals (Lead, Mercury, Cadmium, Hexavalent Chromium, Arsenic),
 * calculates bioconcentration risk indices, and enforces Zero Liquid Discharge (ZLD) regulatory compliance.
 */

export const HEAVY_METAL_DISCHARGE_LIMITS = {
  LEAD_PB: { warningMgL: 0.05, criticalMgL: 0.1 },
  MERCURY_HG: { warningMgL: 0.005, criticalMgL: 0.01 },
  CADMIUM_CD: { warningMgL: 0.02, criticalMgL: 0.05 },
  CHROMIUM_VI: { warningMgL: 0.05, criticalMgL: 0.1 },
  ARSENIC_AS: { warningMgL: 0.1, criticalMgL: 0.2 },
};

/**
 * Evaluates real-time heavy metal water concentration telemetry against environmental safety standards.
 */
export function evaluateHeavyMetalTelemetry(reading) {
  if (!reading || !reading.metalType || reading.concentrationMgL === undefined) {
    return {
      sensorId: reading?.sensorId || 'UNKNOWN',
      isBreached: false,
      toxicityTier: 'SAFE_BACKGROUND_LEVELS',
      bioaccumulationRiskIndex: 0,
      dischargeDivertTriggered: false,
    };
  }

  const limits = HEAVY_METAL_DISCHARGE_LIMITS[reading.metalType] || { warningMgL: 0.1, criticalMgL: 0.2 };
  const conc = reading.concentrationMgL;
  const flowRateLps = reading.effluentFlowRateLps || 10;

  let isBreached = false;
  let toxicityTier = 'SAFE_BACKGROUND_LEVELS';
  let divertTriggered = false;

  if (conc >= limits.criticalMgL) {
    isBreached = true;
    toxicityTier = 'HAZARDOUS_TOXIC_DISCHARGE';
    divertTriggered = true;
  } else if (conc >= limits.warningMgL) {
    isBreached = true;
    toxicityTier = 'ELEVATED_HEAVY_METAL_ALERT';
  }

  // Calculate bioaccumulation risk index (mass load factor per hour)
  const massLoadGramsPerHour = isBreached ? parseFloat((conc * flowRateLps * 3.6).toFixed(2)) : 0;
  const bioRiskIndex = Math.min(100, Math.round(massLoadGramsPerHour * 5));

  return {
    sensorId: reading.sensorId,
    outfallId: reading.outfallId,
    metalType: reading.metalType,
    concentrationMgL: conc,
    isBreached,
    toxicityTier,
    massLoadGramsPerHour,
    bioaccumulationRiskIndex: bioRiskIndex,
    dischargeDivertTriggered: divertTriggered,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates outfall telemetry to generate industrial facility effluent audit report.
 */
export function generateEffluentHeavyMetalAuditReport(facilityId, outfallReadings) {
  if (!outfallReadings || outfallReadings.length === 0) {
    return {
      facilityId,
      overallEffluentStatus: 'COMPLIANT_DISCHARGE',
      activeViolationsCount: 0,
      totalMassLoadGramsPerHour: 0,
      zldDivertActive: false,
      outfallEvaluations: [],
    };
  }

  const evalList = outfallReadings.map(evaluateHeavyMetalTelemetry);
  const violations = evalList.filter((e) => e.isBreached);
  const divertActive = evalList.some((e) => e.dischargeDivertTriggered);
  const totalMassLoad = evalList.reduce((acc, e) => acc + e.massLoadGramsPerHour, 0);

  let status = 'COMPLIANT_DISCHARGE';
  if (divertActive) status = 'EMERGENCY_ZLD_RECIRCULATION_ACTIVE';
  else if (violations.length > 0) status = 'WARNING_THRESHOLD_EXCEEDED';

  return {
    facilityId,
    overallEffluentStatus: status,
    activeViolationsCount: violations.length,
    totalMassLoadGramsPerHour: parseFloat(totalMassLoad.toFixed(2)),
    zldDivertActive: divertActive,
    outfallEvaluations: evalList,
    generatedAt: new Date().toISOString(),
  };
}
