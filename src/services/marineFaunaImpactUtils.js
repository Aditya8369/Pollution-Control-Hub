/**
 * Marine Mammal & Turtle Habitat Impact Assessment Utilities
 */

export interface HabitatImpactReport {
  speciesAtRiskCount: number;
  criticalHabitatsBreached: string[];
  recommendedRescueBoatsCount: number;
}

/**
 * Assesses biological impact on marine fauna in oil spill drift path.
 */
export function assessMarineFaunaImpact(
  ecosystemType: string,
  oilVolumeBarrels: number,
  slickAreaSqKm: number
): HabitatImpactReport {
  const breached: string[] = [];
  let speciesCount = 5;

  if (ecosystemType.includes('Mangrove') || ecosystemType.includes('Estuary')) {
    breached.push('Mangrove Intertidal Nursery');
    breached.push('Estuarine Fish Spawning Ground');
    speciesCount += 12;
  }

  if (ecosystemType.includes('Coral') || ecosystemType.includes('Reef')) {
    breached.push('Coral Reef Benthic Community');
    speciesCount += 25;
  }

  const rescueBoats = Math.max(2, Math.ceil(slickAreaSqKm / 10.0));

  return {
    speciesAtRiskCount: speciesCount,
    criticalHabitatsBreached: breached,
    recommendedRescueBoatsCount: rescueBoats,
  };
}
