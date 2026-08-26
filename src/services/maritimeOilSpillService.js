/**
 * Maritime Oil Spill & Coastal Vulnerability Assessment Service
 * Models offshore oil slick trajectory drift, calculates Coastal Vulnerability Index (CVI),
 * and dispatches offshore skimmers, containment boom barriers, and bioremediation units.
 */

export const OIL_SPILL_TYPES = {
  LIGHT_CRUDE: 'Light Crude Oil (API > 31.1°)',
  HEAVY_CRUDE: 'Heavy Crude Oil (API < 22.3°)',
  DIESEL_FUEL: 'Marine Diesel Oil (MDO)',
  BUNKER_C: 'Heavy Fuel Oil / Bunker C',
};

export interface MaritimeOilSpillIncident {
  spillId: string;
  vesselName: string;
  oilType: string;
  volumeBarrels: number;
  currentSpeedKnots: number;
  windSpeedKnots: number;
  windDirectionDegrees: number;
  distanceToShoreKm: number;
  coastalEcosystemType: string;
}

export interface VulnerabilityAssessment {
  cviScore: number; // 0 to 100
  riskCategory: 'CRITICAL_SHORELINE_THREAT' | 'HIGH_COASTAL_RISK' | 'MODERATE_RISK' | 'LOW_IMPACT';
  ecologicalImpactRating: 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedLandfallHours: number;
}

export interface MaritimeResponsePlan {
  spillId: string;
  vesselName: string;
  containmentBoomsRequiredMeters: number;
  skimmerVesselsDispatched: number;
  dispersantVolumeLiters: number;
  shorelineProtectionTeams: string[];
  responseStrategy: string[];
}

/**
 * Calculates Coastal Vulnerability Index (CVI) score.
 */
export function assessCoastalVulnerabilityIndex(incident: MaritimeOilSpillIncident): VulnerabilityAssessment {
  let score = 25.0;

  // Volume impact
  if (incident.volumeBarrels > 10000) {
    score += 35.0;
  } else if (incident.volumeBarrels > 2000) {
    score += 20.0;
  } else {
    score += 10.0;
  }

  // Oil type persistence
  if (incident.oilType === OIL_SPILL_TYPES.HEAVY_CRUDE || incident.oilType === OIL_SPILL_TYPES.BUNKER_C) {
    score += 25.0;
  } else {
    score += 15.0;
  }

  // Proximity to shore
  if (incident.distanceToShoreKm < 5.0) {
    score += 25.0;
  } else if (incident.distanceToShoreKm < 15.0) {
    score += 15.0;
  }

  const cviScore = Math.min(100.0, Math.round(score));

  // Trajectory speed calculation (wind 3.5% rule + ocean current)
  const driftSpeedKnots = incident.currentSpeedKnots + incident.windSpeedKnots * 0.035;
  const driftSpeedKph = driftSpeedKnots * 1.852;
  const estimatedLandfallHours = driftSpeedKph > 0 ? Math.round((incident.distanceToShoreKm / driftSpeedKph) * 10) / 10 : 999;

  let riskCategory: VulnerabilityAssessment['riskCategory'] = 'LOW_IMPACT';
  let ecologicalImpactRating: VulnerabilityAssessment['ecologicalImpactRating'] = 'LOW';

  if (cviScore >= 80) {
    riskCategory = 'CRITICAL_SHORELINE_THREAT';
    ecologicalImpactRating = 'EXTREME';
  } else if (cviScore >= 65) {
    riskCategory = 'HIGH_COASTAL_RISK';
    ecologicalImpactRating = 'HIGH';
  } else if (cviScore >= 45) {
    riskCategory = 'MODERATE_RISK';
    ecologicalImpactRating = 'MEDIUM';
  }

  return {
    cviScore,
    riskCategory,
    ecologicalImpactRating,
    estimatedLandfallHours,
  };
}

/**
 * Models oil slick trajectory displacement over a given duration (hours).
 */
export function calculateOilSlickDriftTrajectory(
  currentSpeedKnots: number,
  windSpeedKnots: number,
  windDirectionDegrees: number,
  durationHours = 24
) {
  const driftSpeedKnots = currentSpeedKnots + windSpeedKnots * 0.035;
  const distanceTraveledNauticalMiles = Math.round(driftSpeedKnots * durationHours * 10) / 10;
  const estimatedLandfallHours = Math.round((12.0 / (driftSpeedKnots * 1.852)) * 10) / 10;

  return {
    driftSpeedKnots: Math.round(driftSpeedKnots * 10) / 10,
    distanceTraveledNauticalMiles,
    estimatedLandfallHours,
    driftBearingDegrees: windDirectionDegrees,
  };
}

/**
 * Generates automated maritime oil spill response and containment plan.
 */
export function generateMaritimeResponsePlan(incident: MaritimeOilSpillIncident): MaritimeResponsePlan {
  const vulnerability = assessCoastalVulnerabilityIndex(incident);

  const boomsMeters = Math.min(10000, Math.max(500, Math.round(incident.volumeBarrels * 0.2)));
  const skimmersCount = Math.max(1, Math.ceil(incident.volumeBarrels / 3000));
  const dispersantLiters = incident.oilType === OIL_SPILL_TYPES.HEAVY_CRUDE ? Math.round(incident.volumeBarrels * 15) : 0;

  const shorelineTeams = ['Coast Guard Maritime Response Squadron'];
  const strategy = ['Deploy offshore containment boom barriers in V-shape formation ahead of slick drift.'];

  if (vulnerability.riskCategory === 'CRITICAL_SHORELINE_THREAT' || vulnerability.riskCategory === 'HIGH_COASTAL_RISK') {
    shorelineTeams.push('Coastal Eco-Protection Task Force (Mangrove Cell)');
    shorelineTeams.push('Marine Mammal & Sea Turtle Rescue Unit');
    strategy.push('Begin high-capacity offshore oleophilic drum skimmer recovery operations.');
    strategy.push('Apply aerial chemical dispersants outside sensitive 3-nautical-mile coastal zone.');
    strategy.push('Install protective sorbent booms along sensitive river estuaries and lagoons.');
  } else {
    strategy.push('Deploy vacuum skimmers and localized sorbent pads around vessel hull.');
  }

  return {
    spillId: incident.spillId,
    vesselName: incident.vesselName,
    containmentBoomsRequiredMeters: boomsMeters,
    skimmerVesselsDispatched: skimmersCount,
    dispersantVolumeLiters: dispersantLiters,
    shorelineProtectionTeams: shorelineTeams,
    responseStrategy: strategy,
  };
}
