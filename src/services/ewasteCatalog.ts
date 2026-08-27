/**
 * Comprehensive E-Waste Recovery Rates Catalog & Hydrometallurgical Process Parameters
 */

export const EWASTE_HYDROMETALLURGY_CATALOG = [
  {
    processName: 'Nitric Acid PCB Leaching',
    targetMetal: 'Copper & Silver',
    recoveryEfficiencyPercent: 96.5,
    acidRecyclingPercent: 88.0,
  },
  {
    processName: 'Aqua Regia Gold Extraction',
    targetMetal: 'Gold',
    recoveryEfficiencyPercent: 98.2,
    acidRecyclingPercent: 82.0,
  },
  {
    processName: 'LFP Battery Cathode Black Mass Leaching',
    targetMetal: 'Lithium & Cobalt',
    recoveryEfficiencyPercent: 92.0,
    acidRecyclingPercent: 90.0,
  },
];

/**
 * Calculates hydrometallurgical recovery efficiency.
 *
 * @param {number} inputBlackMassTons
 * @returns {number}
 */
export function calculateHydrometallurgicalYieldKg(inputBlackMassTons) {
  return Math.round(inputBlackMassTons * 1000.0 * 0.15 * 0.95);
}
