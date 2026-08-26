/**
 * Industrial Chemical Spill Emergency Response Service
 * Evaluates chemical hazard severity, models airborne toxic plume dispersal radii,
 * and generates automated multi-agency emergency dispatch protocols.
 */

export const SPILL_HAZARD_CLASSES = {
  TOXIC_GAS: 'Toxic / Corrosive Gas (Class 2.3)',
  FLAMMABLE_LIQUID: 'Flammable Liquid (Class 3)',
  CORROSIVE_ACID: 'Corrosive Acid / Alkali (Class 8)',
  ORGANIC_PEROXIDE: 'Organic Peroxide / Oxidizer (Class 5.2)',
  ECOTOXIC_HEAVY_METAL: 'Ecotoxic Heavy Metal Solution (Class 9)',
};

export interface ChemicalSpillIncident {
  incidentId: string;
  facilityName: string;
  chemicalName: string;
  hazardClass: string;
  quantityGallons: number;
  windSpeedKph: number;
  airTemperatureC: number;
  proximityToWaterBodyKm: number;
  reportedAt: string;
}

export interface SeverityAssessment {
  level: 'CRITICAL_EMERGENCY' | 'HIGH_HAZARD' | 'MODERATE_SPILL' | 'MINOR_CONTAINED';
  severityScore: number; // 0 to 100
  requiresImmediateEvacuation: boolean;
  waterContaminationRisk: boolean;
  airborneDispersalRisk: boolean;
}

export interface EmergencyDispatchPlan {
  incidentId: string;
  facilityName: string;
  evacuationRadiusKm: number;
  severityLevel: string;
  dispatchUnits: string[];
  containmentSteps: string[];
  protectiveEquipmentRequired: string[];
  regulatoryNotificationRequired: string[];
}

/**
 * Evaluates chemical spill severity score based on volume, hazard class, and environmental factors.
 */
export function evaluateSpillSeverity(incident: ChemicalSpillIncident): SeverityAssessment {
  let baseScore = 30.0;

  // Hazard class multiplier
  switch (incident.hazardClass) {
    case SPILL_HAZARD_CLASSES.TOXIC_GAS:
      baseScore += 35.0;
      break;
    case SPILL_HAZARD_CLASSES.ORGANIC_PEROXIDE:
      baseScore += 30.0;
      break;
    case SPILL_HAZARD_CLASSES.CORROSIVE_ACID:
      baseScore += 25.0;
      break;
    case SPILL_HAZARD_CLASSES.FLAMMABLE_LIQUID:
      baseScore += 20.0;
      break;
    default:
      baseScore += 15.0;
  }

  // Volume factor
  if (incident.quantityGallons > 5000) {
    baseScore += 25.0;
  } else if (incident.quantityGallons > 1000) {
    baseScore += 15.0;
  } else if (incident.quantityGallons > 200) {
    baseScore += 10.0;
  }

  // Wind speed amplification for toxic gases/volatiles
  if (incident.windSpeedKph > 15.0 && incident.hazardClass === SPILL_HAZARD_CLASSES.TOXIC_GAS) {
    baseScore += 10.0;
  }

  // Water body proximity
  const waterRisk = incident.proximityToWaterBodyKm < 1.0;
  if (waterRisk) {
    baseScore += 10.0;
  }

  const severityScore = Math.min(100.0, Math.round(baseScore));
  const requiresEvacuation = severityScore >= 65.0;

  let level: SeverityAssessment['level'] = 'MINOR_CONTAINED';
  if (severityScore >= 80.0) {
    level = 'CRITICAL_EMERGENCY';
  } else if (severityScore >= 65.0) {
    level = 'HIGH_HAZARD';
  } else if (severityScore >= 45.0) {
    level = 'MODERATE_SPILL';
  }

  return {
    level,
    severityScore,
    requiresImmediateEvacuation: requiresEvacuation,
    waterContaminationRisk: waterRisk,
    airborneDispersalRisk: incident.hazardClass === SPILL_HAZARD_CLASSES.TOXIC_GAS || incident.windSpeedKph > 20.0,
  };
}

/**
 * Models plume evacuation radius (in kilometers) using modified Gaussian dispersion parameters.
 */
export function calculateEvacuationRadiusKm(
  hazardClass: string,
  quantityGallons: number,
  windSpeedKph: number
): number {
  let baseRadius = 0.5;

  if (hazardClass === SPILL_HAZARD_CLASSES.TOXIC_GAS) {
    baseRadius = 2.0;
  } else if (hazardClass === SPILL_HAZARD_CLASSES.ORGANIC_PEROXIDE) {
    baseRadius = 1.2;
  } else if (hazardClass === SPILL_HAZARD_CLASSES.FLAMMABLE_LIQUID) {
    baseRadius = 0.8;
  }

  const volumeFactor = Math.sqrt(quantityGallons) / 20.0;
  const windFactor = 1.0 + windSpeedKph / 50.0;

  const totalRadius = baseRadius * volumeFactor * windFactor;
  return Math.min(30.0, Math.max(0.5, Math.round(totalRadius * 10.0) / 10.0));
}

/**
 * Generates automated multi-agency emergency dispatch and containment plan.
 */
export function generateEmergencyDispatchPlan(incident: ChemicalSpillIncident): EmergencyDispatchPlan {
  const severity = evaluateSpillSeverity(incident);
  const evacuationRadiusKm = calculateEvacuationRadiusKm(
    incident.hazardClass,
    incident.quantityGallons,
    incident.windSpeedKph
  );

  const dispatchUnits: string[] = ['Local Fire & Emergency Services'];
  const containmentSteps: string[] = ['Isolate spill origin and cut off fuel/feed valves.'];
  const ppe: string[] = ['Standard HazMat Gloves & Respirator'];
  const regNotify: string[] = ['State Pollution Control Board (SPCB)'];

  if (severity.level === 'CRITICAL_EMERGENCY' || severity.level === 'HIGH_HAZARD') {
    dispatchUnits.push('HazMat Emergency Response Team Alpha');
    dispatchUnits.push('National Disaster Response Force (NDRF) Chemical Cell');
    dispatchUnits.push('Mobile Air/Water Quality Telemetry Laboratory');

    containmentSteps.push('Deploy foam suppression blanketing over flammable liquid surface.');
    containmentSteps.push('Erect downstream booms and absorbent earthen dikes to protect water courses.');
    containmentSteps.push('Establish a multi-tier perimeter checkpoint at evacuation radius boundary.');

    ppe.push('Level A Vapor-Protective Suit & SCBA');
    ppe.push('Chemical-Resistant Boot Covers & Heavy Butyl Gloves');

    regNotify.push('National Crisis Management Committee (NCMC)');
    regNotify.push('Ministry of Environment, Forest and Climate Change (MoEFCC)');
  } else {
    dispatchUnits.push('Industrial District Environmental Officer');
    containmentSteps.push('Apply neutralizing agents (lime / soda ash) for corrosive liquid spills.');
    ppe.push('Level B Splash-Protective Suit & SCBA');
  }

  return {
    incidentId: incident.incidentId,
    facilityName: incident.facilityName,
    evacuationRadiusKm,
    severityLevel: severity.level,
    dispatchUnits,
    containmentSteps,
    protectiveEquipmentRequired: ppe,
    regulatoryNotificationRequired: regNotify,
  };
}
