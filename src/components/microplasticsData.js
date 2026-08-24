/**
 * Enterprise Architectural Specification:
 * Module: Ocean & Coastal Microplastics Mock Dataset & Calculation Utilities
 * File: src/components/microplasticsData.js
 * Domain: Marine Microplastic Concentration (Particles/m³), Bioaccumulation Risk, Skimmer Filtration Math
 */

import { MICROPLASTICS_SOURCES, OCEAN_ZONES, NOAA_MARINE_PLASTIC_LIMITS } from './microplasticsTypes';

export const hourlyMicroplasticsTrends = [
  { hour: '00:00', avgParticlesPerM3: 420.5, totalTonsDrift: 14.2, seaStateBeaufort: 3 },
  { hour: '02:00', avgParticlesPerM3: 380.2, totalTonsDrift: 12.8, seaStateBeaufort: 2 },
  { hour: '04:00', avgParticlesPerM3: 350.4, totalTonsDrift: 11.5, seaStateBeaufort: 2 },
  { hour: '06:00', avgParticlesPerM3: 580.8, totalTonsDrift: 19.4, seaStateBeaufort: 4 },
  { hour: '08:00', avgParticlesPerM3: 890.0, totalTonsDrift: 28.5, seaStateBeaufort: 5 },
  { hour: '10:00', avgParticlesPerM3: 1120.4, totalTonsDrift: 35.8, seaStateBeaufort: 6 },
  { hour: '12:00', avgParticlesPerM3: 1250.5, totalTonsDrift: 41.2, seaStateBeaufort: 6 },
  { hour: '14:00', avgParticlesPerM3: 1080.2, totalTonsDrift: 34.6, seaStateBeaufort: 5 },
  { hour: '16:00', avgParticlesPerM3: 940.6, totalTonsDrift: 29.8, seaStateBeaufort: 4 },
  { hour: '18:00', avgParticlesPerM3: 790.1, totalTonsDrift: 24.5, seaStateBeaufort: 4 },
  { hour: '20:00', avgParticlesPerM3: 610.4, totalTonsDrift: 19.8, seaStateBeaufort: 3 },
  { hour: '22:00', avgParticlesPerM3: 490.0, totalTonsDrift: 16.1, seaStateBeaufort: 3 }
];

export const stationMicroplasticsProfiles = [
  { id: 'STATION-MP-01', stationName: 'Harbor Estuary Optical Sensor', activeSensors: 12, avgParticlesPerM3: 920, criticalAlertCount: 22, category: 'Estuary' },
  { id: 'STATION-MP-02', stationName: 'Oceanic Gyre Buoy Array', activeSensors: 20, avgParticlesPerM3: 1250, criticalAlertCount: 38, category: 'Offshore' },
  { id: 'STATION-MP-03', stationName: 'River Delta Flow Monitor', activeSensors: 16, avgParticlesPerM3: 880, criticalAlertCount: 19, category: 'Delta' },
  { id: 'STATION-MP-04', stationName: 'Sanctuary Reef Guard Station', activeSensors: 8, avgParticlesPerM3: 42, criticalAlertCount: 0, category: 'Sanctuary' },
  { id: 'STATION-MP-05', stationName: 'Shipping Trench Patrol Vessel', activeSensors: 14, avgParticlesPerM3: 610, criticalAlertCount: 11, category: 'Trench' }
];

export const microplasticsMitigationGoals = [
  { id: 'MPG1', title: 'Harbor Automated Skimmer Deployment', targetParticles: 100.0, currentParticles: 920.0, status: 'IN_PROGRESS' },
  { id: 'MPG2', title: 'Pre-Production Nurdle Containment Booms', targetParticles: 50.0, currentParticles: 1250.0, status: 'IN_PROGRESS' },
  { id: 'MPG3', title: 'Coral Reef Sanctuary Plastic Netting Guard', targetParticles: 50.0, currentParticles: 42.0, status: 'ACHIEVED' },
  { id: 'MPG4', title: 'Wastewater Microfiber Membrane Filter', targetParticles: 50.0, currentParticles: 680.0, status: 'IN_PROGRESS' }
];

export const microplasticsDataStore = {
  sources: MICROPLASTICS_SOURCES,
  zones: OCEAN_ZONES,
  limits: NOAA_MARINE_PLASTIC_LIMITS,
  hourlyTrends: hourlyMicroplasticsTrends,
  stationProfiles: stationMicroplasticsProfiles,
  goals: microplasticsMitigationGoals
};

export function calculateSkimmerFiltrationEfficiency(sourceId, flowM3Hour = 1000) {
  const source = MICROPLASTICS_SOURCES.find((s) => s.id === sourceId) || MICROPLASTICS_SOURCES[0];

  // Skimmer Mesh Removal Efficiency ~ 90% for particles > 300 microns, 60% for smaller
  const removalEfficiency = source.avgSizeMicrons >= 300 ? 0.90 : 0.60;
  const postFiltrationDensity = parseFloat((source.avgParticlesPerM3 * (1 - removalEfficiency)).toFixed(1));

  // Particle Removal Rate per Hour = Particles/m³ * Flow m³/h * efficiency
  const totalParticlesRemovedPerHour = Math.round(source.avgParticlesPerM3 * flowM3Hour * removalEfficiency);

  return {
    source,
    flowM3Hour,
    removalEfficiencyPercent: removalEfficiency * 100,
    postFiltrationDensity,
    totalParticlesRemovedPerHour,
    isCompliantPostFiltration: postFiltrationDensity <= NOAA_MARINE_PLASTIC_LIMITS.SAFE_THRESHOLD_PARTICLES_M3
  };
}
