/**
 * Industrial Effluent Multi-Parameter Telemetry Aggregator & Alert Controller
 * Synthesizes heavy metal concentrations, ZLD plant operational states, ecotoxicology indices,
 * and hazardous sludge manifests into a unified environmental compliance dashboard payload.
 */

import { generateEffluentHeavyMetalAuditReport } from './toxicHeavyMetalEffluentService.js';
import { evaluateAquaticEcotoxicology } from './aquaticEcotoxicologyService';
import { generateHazardousSludgeManifest } from './hazardousSludgeManifestUtils';

export interface UnifiedEffluentCompliancePayload {
  facilityId: string;
  facilityName: string;
  overallComplianceStatus: 'FULLY_COMPLIANT' | 'ZLD_RECIRCULATION_ACTIVE' | 'HIGH_ECOTOXICITY_ALERT';
  activeViolationsCount: number;
  totalMassLoadGramsPerHour: number;
  maxBioaccumulationRiskIndex: number;
  hazardousSludgeManifestCreated: boolean;
  recommendedRegulatoryActions: string[];
  auditedAt: string;
}

/**
 * Aggregates all effluent telemetry modules into a unified compliance dashboard payload.
 */
export function aggregateEffluentCompliancePayload(
  facilityId: string,
  facilityName: string,
  outfallReadings: any[],
  waterBodyId: string,
  sludgeVolumeTons: number
): UnifiedEffluentCompliancePayload {
  const auditReport = generateEffluentHeavyMetalAuditReport(facilityId, outfallReadings);

  const highestMetalReading = outfallReadings.sort((a, b) => b.concentrationMgL - a.concentrationMgL)[0];
  const ecotox = highestMetalReading
    ? evaluateAquaticEcotoxicology(waterBodyId, highestMetalReading.metalType, highestMetalReading.concentrationMgL)
    : undefined;

  const manifest = highestMetalReading
    ? generateHazardousSludgeManifest(facilityId, sludgeVolumeTons, highestMetalReading.metalType, highestMetalReading.concentrationMgL * 10)
    : undefined;

  let status: UnifiedEffluentCompliancePayload['overallComplianceStatus'] = 'FULLY_COMPLIANT';
  if (ecotox && ecotox.aquaticLifeThreatTier === 'ACUTE_AQUATIC_TOXICITY') {
    status = 'HIGH_ECOTOXICITY_ALERT';
  } else if (auditReport.zldDivertActive) {
    status = 'ZLD_RECIRCULATION_ACTIVE';
  }

  const actions: string[] = [];
  if (auditReport.activeViolationsCount > 0) {
    actions.push(`Divert ${auditReport.activeViolationsCount} outfall(s) to ZLD holding tanks immediately.`);
  }
  if (ecotox) {
    actions.push(...ecotox.remediationRecommendations);
  }

  return {
    facilityId,
    facilityName,
    overallComplianceStatus: status,
    activeViolationsCount: auditReport.activeViolationsCount,
    totalMassLoadGramsPerHour: auditReport.totalMassLoadGramsPerHour,
    maxBioaccumulationRiskIndex: ecotox ? ecotox.ecotoxicologicalRiskScore : 0,
    hazardousSludgeManifestCreated: !!manifest?.isHazardousWasteClassified,
    recommendedRegulatoryActions: Array.from(new Set(actions)),
    auditedAt: new Date().toISOString(),
  };
}
