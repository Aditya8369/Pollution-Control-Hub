/**
 * Marine Mammal & Turtle Habitat Impact Assessment Utilities
 */

/**
 * @typedef {Object} HabitatImpactReport
 * @property {number} speciesAtRiskCount
 * @property {string[]} criticalHabitatsBreached
 * @property {number} recommendedRescueBoatsCount
 */

/**
 * Assesses biological impact on marine fauna in oil spill drift path.
 *
 * @param {string} ecosystemType
 * @param {number} oilVolumeBarrels
 * @param {number} slickAreaSqKm
 * @returns {HabitatImpactReport}
 */
export function assessMarineFaunaImpact(ecosystemType, oilVolumeBarrels, slickAreaSqKm) {
  /** @type {string[]} */
  const breached = [];
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
