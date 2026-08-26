/**
 * E-Waste Informal Sector Formalization & Safety Compliance
 */

export interface FormalizationMetrics {
  formalizedWorkersCount: number;
  healthInsuranceCoveragePercent: number;
  informalProcessingDeficitPercent: number;
}

/**
 * Calculates informal e-waste worker formalization metrics.
 */
export function calculateFormalizationProgress(totalWorkers: number, registeredWorkers: number): FormalizationMetrics {
  const formalized = registeredWorkers;
  const healthCoverage = Math.min(100.0, Math.round((registeredWorkers / totalWorkers) * 100.0 * 10) / 10);
  const informalDeficit = Math.max(0.0, 100.0 - healthCoverage);

  return {
    formalizedWorkersCount: formalized,
    healthInsuranceCoveragePercent: healthCoverage,
    informalProcessingDeficitPercent: informalDeficit,
  };
}
