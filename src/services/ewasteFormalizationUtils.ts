/**
 * E-Waste Informal Sector Formalization & Safety Compliance
 */

/**
 * @typedef {Object} FormalizationMetrics
 * @property {number} formalizedWorkersCount
 * @property {number} healthInsuranceCoveragePercent
 * @property {number} informalProcessingDeficitPercent
 */

/**
 * Calculates informal e-waste worker formalization metrics.
 *
 * @param {number} totalWorkers
 * @param {number} registeredWorkers
 * @returns {FormalizationMetrics}
 */
export function calculateFormalizationProgress(totalWorkers, registeredWorkers) {
  const formalized = registeredWorkers;
  const healthCoverage = Math.min(100.0, Math.round((registeredWorkers / totalWorkers) * 100.0 * 10) / 10);
  const informalDeficit = Math.max(0.0, 100.0 - healthCoverage);

  return {
    formalizedWorkersCount: formalized,
    healthInsuranceCoveragePercent: healthCoverage,
    informalProcessingDeficitPercent: informalDeficit,
  };
}
