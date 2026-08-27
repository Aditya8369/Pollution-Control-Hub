/**
 * Fly Ash Heavy Metal Leaching (Arsenic, Lead, Mercury) Assessment Utilities
 */

/**
 * @typedef {Object} HeavyMetalLeachateAssessment
 * @property {number} arsenicPpm
 * @property {number} leadPpm
 * @property {number} mercuryPpm
 * @property {boolean} exceedsCPCBSafeLimits
 * @property {string} groundwaterToxicityAlert
 */

/**
 * Evaluates toxic heavy metal leaching from fly ash pond slurry.
 *
 * @param {string} flyAshGrade
 * @param {number} [pHLevel=7.5]
 * @returns {HeavyMetalLeachateAssessment}
 */
export function evaluateHeavyMetalLeaching(flyAshGrade, pHLevel = 7.5) {
  const isClassF = flyAshGrade.includes('Class F');
  const arsenic = isClassF ? 0.45 : 0.20;
  const lead = isClassF ? 0.85 : 0.40;
  const mercury = isClassF ? 0.08 : 0.03;

  // Acidic leaching accelerates metal mobilization
  const acidMultiplier = pHLevel < 6.0 ? 1.8 : 1.0;

  const finalArsenic = Math.round(arsenic * acidMultiplier * 100) / 100;
  const finalLead = Math.round(lead * acidMultiplier * 100) / 100;
  const finalMercury = Math.round(mercury * acidMultiplier * 100) / 100;

  const exceeds = finalArsenic > 0.05 || finalLead > 0.1 || finalMercury > 0.01;

  return {
    arsenicPpm: finalArsenic,
    leadPpm: finalLead,
    mercuryPpm: finalMercury,
    exceedsCPCBSafeLimits: exceeds,
    groundwaterToxicityAlert: exceeds ? 'HIGH_RISK_GROUNDWATER_CONTAMINATION' : 'SAFE_WITHIN_LIMITS',
  };
}
