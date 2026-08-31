/**
 * Multi-Sensor Hazmat Telemetry Fusion & Emergency Dispatch Coordinator
 * Synthesizes air quality telemetry, chemical leak sensors, downwind plume dispersion models,
 * and emergency evacuation routes into an aggregated incident dispatch command.
 */

import { generateFacilityLeakContainmentReport } from './chemicalLeakDetectionService.js';
import { computeHazmatPerimeterZones } from './plumeDispersionUtils.js';
import { calculateUpwindEvacuationRoute } from './hazmatEvacuationRouterUtils';

export interface EmergencyIncidentCommandReport {
  incidentId: string;
  facilityId: string;
  overallThreatLevel: 'CODE_RED_EVACUATION' | 'CODE_ORANGE_CONTAINMENT' | 'CODE_GREEN_NORMAL';
  maxPlumeRadiusMeters: number;
  isolationZoneMeters: number;
  evacuationAssemblyPoint: string;
  recommendedDispatchTeams: string[];
  reportGeneratedAt: string;
}

/**
 * Synthesizes hazmat emergency telemetry into an Incident Command Report.
 */
export function generateIncidentCommandReport(
  incidentId: string,
  facilityId: string,
  sensorReadings: any[],
  windDirectionDegrees: number
): EmergencyIncidentCommandReport {
  const leakReport = generateFacilityLeakContainmentReport(facilityId, sensorReadings);
  const evacRoute = calculateUpwindEvacuationRoute(facilityId, windDirectionDegrees);
  const hazmatZone = computeHazmatPerimeterZones('HAZMAT_GENERIC', leakReport.maxPlumeRadiusMeters / 10);

  let threatLevel: EmergencyIncidentCommandReport['overallThreatLevel'] = 'CODE_GREEN_NORMAL';
  if (leakReport.facilityEvacuationTriggered) threatLevel = 'CODE_RED_EVACUATION';
  else if (leakReport.activeBreachesCount > 0) threatLevel = 'CODE_ORANGE_CONTAINMENT';

  const teams: string[] = ['Facility Safety Officer'];
  if (threatLevel === 'CODE_RED_EVACUATION') {
    teams.push('Municipal Fire & Hazmat Unit', 'Emergency Medical Response', 'Air Quality Monitoring Mobile Unit');
  } else if (threatLevel === 'CODE_ORANGE_CONTAINMENT') {
    teams.push('Plant Chemical Emergency Response Team');
  }

  return {
    incidentId,
    facilityId,
    overallThreatLevel: threatLevel,
    maxPlumeRadiusMeters: leakReport.maxPlumeRadiusMeters,
    isolationZoneMeters: hazmatZone.initialIsolationRadiusMeters,
    evacuationAssemblyPoint: evacRoute.recommendedAssemblyPoint,
    recommendedDispatchTeams: teams,
    reportGeneratedAt: new Date().toISOString(),
  };
}
