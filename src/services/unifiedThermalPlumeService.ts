/**
 * Unified Microclimate & Industrial Thermal Plume Aggregator Service
 * Aggregates infrared thermal sensor telemetry, urban heat island vulnerability indices,
 * vegetative canopy mitigation estimates, and aquatic cooling discharge assessments into a unified thermal dashboard payload.
 */

import { generateUrbanHeatIslandReport } from './thermalPlumeTelemetryService.js';
import { estimateThermalMitigationImpact } from './urbanThermalMitigationUtils';
import { evaluateCoolingDischargeImpact } from './coolingDischargeAssessmentService';

export interface UnifiedThermalPlumePayload {
  zoneId: string;
  overallHeatIndexTier: string;
  averageDeltaCelsius: number;
  criticalHotspotsCount: number;
  predictedTemperatureReductionCelsius: number;
  coolingTowerRecirculationRequired: boolean;
  recommendedInterventions: string[];
  auditedAt: string;
}

/**
 * Aggregates all thermal plume telemetry metrics into a unified microclimate report payload.
 */
export function aggregateUnifiedThermalPayload(
  zoneId: string,
  sensorReadings: any[],
  albedoRating: number,
  canopyPercent: number,
  outfallId?: string,
  waterBodyId?: string,
  dischargeTemp?: number,
  receivingTemp?: number
): UnifiedThermalPayload {
  const uhiReport = generateUrbanHeatIslandReport(zoneId, sensorReadings);
  const mitigation = estimateThermalMitigationImpact({
    zoneId,
    roofAlbedoRating: albedoRating,
    treeCanopyCoveragePercent: canopyPercent,
    pavementPermeabilityPercent: 20,
  });

  const coolingEval =
    outfallId && waterBodyId && dischargeTemp !== undefined && receivingTemp !== undefined
      ? evaluateCoolingDischargeImpact(outfallId, waterBodyId, dischargeTemp, receivingTemp)
      : undefined;

  const actions: string[] = [...mitigation.recommendedInterventions];
  if (uhiReport.criticalHotspotsCount > 0) {
    actions.push(`Activate ${uhiReport.criticalHotspotsCount} cooling tower interlock(s) for industrial facilities.`);
  }

  return {
    zoneId,
    overallHeatIndexTier: uhiReport.overallHeatIndexTier,
    averageDeltaCelsius: uhiReport.averageDeltaCelsius,
    criticalHotspotsCount: uhiReport.criticalHotspotsCount,
    predictedTemperatureReductionCelsius: mitigation.predictedTemperatureReductionCelsius,
    coolingTowerRecirculationRequired: !!coolingEval?.coolingTowerRecirculationRequired,
    recommendedInterventions: Array.from(new Set(actions)),
    auditedAt: new Date().toISOString(),
  };
}
