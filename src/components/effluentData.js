/**
 * Enterprise Architectural Specification:
 * Module: Industrial Wastewater Effluent Mock Dataset & Calculation Utilities
 * File: src/components/effluentData.js
 * Domain: Continuous Discharge Monitoring Systems (CCTMS), BOD/COD Ratios, Heavy Metal Loading
 */

import { EFFLUENT_SOURCES, DISCHARGE_ZONES, CPCB_DISCHARGE_LIMITS } from './effluentTypes';

export const hourlyEffluentTrends = [
  { hour: '00:00', avgBodMgL: 142.5, avgCodMgL: 380.0, flowRateKld: 450 },
  { hour: '02:00', avgBodMgL: 110.2, avgCodMgL: 295.4, flowRateKld: 380 },
  { hour: '04:00', avgBodMgL: 98.4, avgCodMgL: 260.0, flowRateKld: 320 },
  { hour: '06:00', avgBodMgL: 165.8, avgCodMgL: 415.5, flowRateKld: 620 },
  { hour: '08:00', avgBodMgL: 245.0, avgCodMgL: 580.2, flowRateKld: 980 },
  { hour: '10:00', avgBodMgL: 290.4, avgCodMgL: 690.0, flowRateKld: 1150 },
  { hour: '12:00', avgBodMgL: 275.5, avgCodMgL: 640.6, flowRateKld: 1100 },
  { hour: '14:00', avgBodMgL: 310.2, avgCodMgL: 725.1, flowRateKld: 1220 },
  { hour: '16:00', avgBodMgL: 285.6, avgCodMgL: 660.9, flowRateKld: 1180 },
  { hour: '18:00', avgBodMgL: 230.1, avgCodMgL: 540.4, flowRateKld: 940 },
  { hour: '20:00', avgBodMgL: 185.4, avgCodMgL: 430.0, flowRateKld: 710 },
  { hour: '22:00', avgBodMgL: 155.0, avgCodMgL: 395.0, flowRateKld: 540 }
];

export const plantEffluentProfiles = [
  { id: 'PLANT-01', plantName: 'Apex Chemical Manufacturing', activeSensors: 14, avgBod: 185.0, violationCount: 18, category: 'Chemical' },
  { id: 'PLANT-02', plantName: 'Rainbow Textile Dyeing Works', activeSensors: 22, avgBod: 310.0, violationCount: 34, category: 'Textile' },
  { id: 'PLANT-03', plantName: 'BioPharma Synthesis Hub', activeSensors: 12, avgBod: 240.0, violationCount: 22, category: 'Pharma' },
  { id: 'PLANT-04', plantName: 'Golden Valley Brewery', activeSensors: 8, avgBod: 110.0, violationCount: 6, category: 'Food' },
  { id: 'PLANT-05', plantName: 'Titan Electroplating Works', activeSensors: 16, avgBod: 95.0, violationCount: 29, category: 'Metals' }
];

export const effluentMitigationGoals = [
  { id: 'EG1', title: 'Zero Liquid Discharge (ZLD) Compliance', targetBod: 30.0, currentBod: 145.0, status: 'IN_PROGRESS' },
  { id: 'EG2', title: 'Heavy Metal Precipitation Unit', targetBod: 10.0, currentBod: 28.5, status: 'IN_PROGRESS' },
  { id: 'EG3', title: 'Biological Aeration Basin Upgrade', targetBod: 25.0, currentBod: 24.8, status: 'ACHIEVED' },
  { id: 'EG4', title: 'Pharma Solvent Stripping Unit', targetBod: 30.0, currentBod: 65.0, status: 'IN_PROGRESS' }
];

export const effluentDataStore = {
  sources: EFFLUENT_SOURCES,
  zones: DISCHARGE_ZONES,
  limits: CPCB_DISCHARGE_LIMITS,
  hourlyTrends: hourlyEffluentTrends,
  plantProfiles: plantEffluentProfiles,
  goals: effluentMitigationGoals
};

export function calculateEffluentTreatmentRemoval(sourceId, flowKld = 500) {
  const source = EFFLUENT_SOURCES.find((s) => s.id === sourceId) || EFFLUENT_SOURCES[0];

  // Secondary Biological Treatment Efficiency ~ 85% removal for BOD, 75% for COD
  const treatedBod = parseFloat((source.avgBodMgL * 0.15).toFixed(1));
  const treatedCod = parseFloat((source.avgCodMgL * 0.25).toFixed(1));

  // Daily Mass Loading in Kg/day = (mg/L * KLD) / 1000
  const rawBodLoadKgDay = parseFloat(((source.avgBodMgL * flowKld) / 1000).toFixed(1));
  const treatedBodLoadKgDay = parseFloat(((treatedBod * flowKld) / 1000).toFixed(1));

  return {
    source,
    flowKld,
    treatedBod,
    treatedCod,
    rawBodLoadKgDay,
    treatedBodLoadKgDay,
    isCompliantPostTreatment: treatedBod <= CPCB_DISCHARGE_LIMITS.BOD_LIMIT_MG_L
  };
}
