/**
 * Facility Hazmat Emergency Evacuation Routing & Siren Controller
 * Calculates safe upwind assembly points and controls emergency public address sirens.
 */

export interface EvacuationRoutePlan {
  facilityId: string;
  recommendedAssemblyPoint: string;
  upwindDirectionDegrees: number;
  sirenAlertActive: boolean;
  evacuationInstructions: string[];
}

/**
 * Calculates upwind safe assembly point based on wind direction telemetry.
 */
export function calculateUpwindEvacuationRoute(facilityId: string, windDirectionDegrees: number): EvacuationRoutePlan {
  // Upwind direction is wind direction + 180 degrees
  const upwind = (windDirectionDegrees + 180) % 360;

  let assemblyPoint = 'North Gate Assembly Zone A';
  if (upwind >= 45 && upwind < 135) assemblyPoint = 'East Perimeter Safety Gate B';
  else if (upwind >= 135 && upwind < 225) assemblyPoint = 'South Parking Assembly Zone C';
  else if (upwind >= 225 && upwind < 315) assemblyPoint = 'West Security Post Assembly Zone D';

  return {
    facilityId,
    recommendedAssemblyPoint: assemblyPoint,
    upwindDirectionDegrees: upwind,
    sirenAlertActive: true,
    evacuationInstructions: [
      `Evacuate facility towards ${assemblyPoint}.`,
      'Do not move downwind of release plume.',
      'Affix emergency escape respirators immediately.',
    ],
  };
}
