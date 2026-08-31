/**
 * Unified Brownfield Soil & Groundwater Remediation Aggregator Service
 * Synthesizes soil heavy metal core samples, hyperaccumulator phytoremediation plans,
 * chemical bio-char stabilization dosages, and groundwater leachate migration risks into a unified brownfield report payload.
 */

import { generateBrownfieldSoilReport } from './soilHeavyMetalRemediationService.js';
import { calculateSoilStabilizationDosage } from './soilStabilizationUtils';
import { evaluateGroundwaterLeachateRisk } from './groundwaterLeachateRiskService';

export interface UnifiedSoilRemediationPayload {
  siteId: string;
  overallSoilStatus: string;
  contaminatedPlotCount: number;
  averageRemediationMonths: number;
  recommendedBiocharApplicationTons: number;
  containmentBarrierRequired: boolean;
  actionableRemediationSteps: string[];
  auditedAt: string;
}

/**
 * Aggregates multi-source soil and groundwater telemetry into unified site remediation payload.
 */
export function aggregateUnifiedSoilRemediationPayload(
  siteId: string,
  soilSamples: any[],
  plotId: string,
  hydraulicConductivity: number,
  groundwaterDepthMeters: number
): UnifiedSoilRemediationPayload {
  const soilReport = generateBrownfieldSoilReport(siteId, soilSamples);

  const highestContaminatedSample = soilSamples.sort((a, b) => b.concentrationMgKg - a.concentrationMgKg)[0];

  const stabilization = highestContaminatedSample
    ? calculateSoilStabilizationDosage(plotId, highestContaminatedSample.heavyMetalType, highestContaminatedSample.concentrationMgKg)
    : undefined;

  const gwRisk = highestContaminatedSample
    ? evaluateGroundwaterLeachateRisk(plotId, highestContaminatedSample.concentrationMgKg, hydraulicConductivity, groundwaterDepthMeters)
    : undefined;

  const steps: string[] = [];
  if (soilReport.phytoremediationActive) {
    steps.push('Plant hyperaccumulator sunflowers/mustard species across contaminated plots.');
  }
  if (stabilization?.biocharApplicationRateTonsPerHectare) {
    steps.push(`Apply ${stabilization.biocharApplicationRateTonsPerHectare} tons/ha biochar amendment to immobilize heavy metals.`);
  }
  if (gwRisk?.containmentBarrierRequired) {
    steps.push('Construct HDPE subsurface slurry wall containment barrier to block groundwater migration.');
  }

  return {
    siteId,
    overallSoilStatus: soilReport.overallSoilStatus,
    contaminatedPlotCount: soilReport.contaminatedPlotCount,
    averageRemediationMonths: soilReport.averageRemediationMonths,
    recommendedBiocharApplicationTons: stabilization?.biocharApplicationRateTonsPerHectare || 0,
    containmentBarrierRequired: !!gwRisk?.containmentBarrierRequired,
    actionableRemediationSteps: steps,
    auditedAt: new Date().toISOString(),
  };
}
