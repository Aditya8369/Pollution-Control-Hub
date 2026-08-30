/**
 * Industrial Hazardous Chemical Leak & Gas Telemetry Surveillance Service
 * Monitors industrial facility gas sensors (Ammonia, Chlorine, Sulfur Dioxide, VOCs, Hydrogen Sulfide),
 * calculates dispersion plume radii, identifies breach severity tiers, and triggers automated site evacuations.
 */

export const HAZARDOUS_CHEMICAL_LIMITS = {
  AMMONIA_NH3: { warningPpm: 25, evacuationPpm: 50 },
  CHLORINE_CL2: { warningPpm: 0.5, evacuationPpm: 1.0 },
  SULFUR_DIOXIDE_SO2: { warningPpm: 2.0, evacuationPpm: 5.0 },
  HYDROGEN_SULFIDE_H2S: { warningPpm: 10, evacuationPpm: 20 },
  BENZENE_VOC: { warningPpm: 1.0, evacuationPpm: 5.0 },
};

/**
 * Analyzes real-time industrial sensor telemetry for gas breaches.
 */
export function evaluateChemicalSensorReading(reading) {
  if (!reading || !reading.chemicalType || reading.concentrationPpm === undefined) {
    return {
      sensorId: reading?.sensorId || 'UNKNOWN',
      isBreached: false,
      severityTier: 'NORMAL_OPERATING_LEVELS',
      dispersionPlumeRadiusMeters: 0,
      evacuationRequired: false,
    };
  }

  const limits = HAZARDOUS_CHEMICAL_LIMITS[reading.chemicalType] || { warningPpm: 10, evacuationPpm: 25 };
  const ppm = reading.concentrationPpm;
  const windSpeedKmh = reading.windSpeedKmh || 5;

  let isBreached = false;
  let severityTier = 'NORMAL_OPERATING_LEVELS';
  let evacuationRequired = false;

  if (ppm >= limits.evacuationPpm) {
    isBreached = true;
    severityTier = 'CRITICAL_HAZMAT_BREACH';
    evacuationRequired = true;
  } else if (ppm >= limits.warningPpm) {
    isBreached = true;
    severityTier = 'ELEVATED_CHEMICAL_WARNING';
  }

  // Calculate plume dispersion radius using Gaussian plume approximation factor
  const plumeRadius = isBreached ? Math.round(ppm * 15 * (windSpeedKmh / 5)) : 0;

  return {
    sensorId: reading.sensorId,
    facilityId: reading.facilityId,
    chemicalType: reading.chemicalType,
    concentrationPpm: ppm,
    isBreached,
    severityTier,
    dispersionPlumeRadiusMeters: plumeRadius,
    evacuationRequired,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates facility sensor network evaluations to generate plant-wide containment alert.
 */
export function generateFacilityLeakContainmentReport(facilityId, sensorReadings) {
  if (!sensorReadings || sensorReadings.length === 0) {
    return {
      facilityId,
      overallStatus: 'PLANT_OPERATIONAL',
      activeBreachesCount: 0,
      maxPlumeRadiusMeters: 0,
      facilityEvacuationTriggered: false,
      sensorAlerts: [],
    };
  }

  const alerts = sensorReadings.map(evaluateChemicalSensorReading);
  const breaches = alerts.filter((a) => a.isBreached);
  const evacuationCount = alerts.filter((a) => a.evacuationRequired).length;
  const maxPlume = Math.max(0, ...alerts.map((a) => a.dispersionPlumeRadiusMeters));

  let status = 'PLANT_OPERATIONAL';
  if (evacuationCount > 0) status = 'EMERGENCY_EVACUATION_ACTIVE';
  else if (breaches.length > 0) status = 'LOCALIZED_CONTAINMENT_REQUIRED';

  return {
    facilityId,
    overallStatus: status,
    activeBreachesCount: breaches.length,
    maxPlumeRadiusMeters: maxPlume,
    facilityEvacuationTriggered: evacuationCount > 0,
    sensorAlerts: alerts,
    reportedAt: new Date().toISOString(),
  };
}
