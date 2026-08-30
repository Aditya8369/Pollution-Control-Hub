/**
 * Unified Marine Ecosystem & Microplastic Pollution Payload Aggregator
 * Synthesizes coastal microplastic telemetry, hydrodynamic drift vectors, marine species ingestion risks,
 * autonomous skimmer fleet statuses, and satellite Floating Debris Index (FDI) data into a unified marine payload.
 */

import { generateRegionalMicroplasticReport } from './oceanMicroplasticTelemetryService.js';
import { calculateMarinePlasticDrift } from './marinePlasticDriftUtils';
import { evaluateSpeciesIngestionRisk } from './marineSpeciesIngestionService';
import { evaluateSkimmerFleetControl } from './skimmerFleetControllerUtils';
import { analyzeSatelliteFloatingDebrisIndex } from './satelliteFloatingDebrisService';

export interface UnifiedMarineEcosystemPayload {
  regionId: string;
  regionalStatus: string;
  averageParticleCountPerM3: number;
  estimatedPlasticDriftKmPerDay: number;
  highestSpeciesHazardTier: string;
  skimmerVesselsActiveCount: number;
  satelliteSlickDetected: boolean;
  recommendedActionItems: string[];
  aggregatedAt: string;
}

/**
 * Aggregates all marine plastic telemetry services into a unified regional report payload.
 */
export function aggregateUnifiedMarineEcosystemPayload(
  regionId: string,
  coastalZoneId: string,
  sensorReadings: any[],
  startLat: number,
  startLon: number,
  satellitePayload?: any
): UnifiedMarineEcosystemPayload {
  const regionalReport = generateRegionalMicroplasticReport(regionId, sensorReadings);
  const drift = calculateMarinePlasticDrift(coastalZoneId, startLat, startLon, 2.0, 90);
  const speciesIngestion = evaluateSpeciesIngestionRisk('Pelagic Fish', 'PELAGIC_FISH', regionalReport.averageParticleCountPerM3);
  const skimmer = evaluateSkimmerFleetControl('skimmer-01', coastalZoneId, 150);
  const satellite = satellitePayload ? analyzeSatelliteFloatingDebrisIndex(satellitePayload) : undefined;

  const actions: string[] = [];
  if (regionalReport.highPriorityZonesCount > 0) {
    actions.push(`Deploy ${regionalReport.highPriorityZonesCount} autonomous skimmer vessel(s) to emergency cleanup zones.`);
  }
  if (satellite?.plasticSlickDetected) {
    actions.push(`Satellite FDI alert: Dispatch marine patrol to inspect tile ${satellite.tileId}.`);
  }

  return {
    regionId,
    regionalStatus: regionalReport.overallStatus,
    averageParticleCountPerM3: regionalReport.averageParticleCountPerM3,
    estimatedPlasticDriftKmPerDay: drift.driftVelocityKmPerDay,
    highestSpeciesHazardTier: speciesIngestion.hazardTier,
    skimmerVesselsActiveCount: skimmer.skimmerStatus === 'COLLECTING' ? 1 : 0,
    satelliteSlickDetected: !!satellite?.plasticSlickDetected,
    recommendedActionItems: actions,
    aggregatedAt: new Date().toISOString(),
  };
}
