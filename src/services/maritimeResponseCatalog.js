/**
 * Comprehensive Offshore Oil Spill Response Catalog & Shoreline Protection Guide
 */

export const MARITIME_SPILL_RESPONSE_CATALOG = [
  {
    assetName: 'High-Capacity Oleophilic Drum Skimmer',
    recoveryRateBarrelsPerHour: 500,
    deploymentType: 'Offshore Heavy Slick',
    operatingSeaState: 'Up to Sea State 3 (1.25m waves)',
  },
  {
    assetName: 'Self-Inflating Offshore Containment Boom (1500mm)',
    recoveryRateBarrelsPerHour: 0,
    deploymentType: 'V-Shape Slick Deflection',
    operatingSeaState: 'Up to Sea State 4 (2.5m waves)',
  },
  {
    assetName: 'Aerial Dispersant Spray Aircraft (C-130 Hercules)',
    recoveryRateBarrelsPerHour: 2000,
    deploymentType: 'Deep-Water Slick Dispersal',
    operatingSeaState: 'All Weather Open Ocean',
  },
  {
    assetName: 'Sorbent Barrier Boom (Intertidal Zone)',
    recoveryRateBarrelsPerHour: 50,
    deploymentType: 'Estuary & Mangrove Protection',
    operatingSeaState: 'Calm Coastal / Lagoon',
  },
];

/**
 * Calculates total oil volume recovery capacity per hour for a fleet of skimmer assets.
 *
 * @param {number} skimmerCount
 * @returns {number}
 */
export function calculateFleetRecoveryCapacity(skimmerCount) {
  return skimmerCount * 500;
}
