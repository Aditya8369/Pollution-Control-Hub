/**
 * Enterprise Architectural Specification:
 * Module: Industrial Wastewater Effluent Telemetry Standard & Metadata
 * File: src/components/effluentTypes.js
 * Domain: Industrial Discharge Surveillance, Chemical Oxygen Demand (COD), Biochemical Oxygen Demand (BOD), Heavy Metal Limits
 */

export const EFFLUENT_CATEGORIES = {
  CHEMICAL: 'Chemical & Petrochemical',
  TEXTILE: 'Textile & Dyeing Operations',
  PHARMA: 'Pharmaceutical Manufacturing',
  FOOD: 'Food & Beverage Processing',
  METALS: 'Metal Finishing & Electroplating'
};

export const DISCHARGE_ZONES = [
  { id: 'EZ1', name: 'Northern Industrial Outfall', category: 'CHEMICAL', baselineBodMgL: 145.0, maxAllowedBodMgL: 30.0 },
  { id: 'EZ2', name: 'Textile Dyeing Canal Reach', category: 'TEXTILE', baselineBodMgL: 210.0, maxAllowedBodMgL: 30.0 },
  { id: 'EZ3', name: 'Pharma Valley Effluent Channel', category: 'PHARMA', baselineBodMgL: 180.0, maxAllowedBodMgL: 30.0 },
  { id: 'EZ4', name: 'Municipal River Mixing Zone', category: 'FOOD', baselineBodMgL: 65.0, maxAllowedBodMgL: 30.0 },
  { id: 'EZ5', name: 'Electroplating Plume Station', category: 'METALS', baselineBodMgL: 95.0, maxAllowedBodMgL: 30.0 }
];

export const EFFLUENT_SOURCES = [
  { id: 'EFF-01', name: 'Petrochemical Cracker Wastewater', category: 'CHEMICAL', avgCodMgL: 420, avgBodMgL: 185, totalChromiumPpm: 2.4, riskLevel: 'CRITICAL' },
  { id: 'EFF-02', name: 'Synthetic Dye House Washwater', category: 'TEXTILE', avgCodMgL: 680, avgBodMgL: 310, totalChromiumPpm: 0.8, riskLevel: 'SEVERE' },
  { id: 'EFF-03', name: 'API Synthesis Reactor Effluent', category: 'PHARMA', avgCodMgL: 550, avgBodMgL: 240, totalChromiumPpm: 0.1, riskLevel: 'HIGH' },
  { id: 'EFF-04', name: 'Brewery Fermentation Wash', category: 'FOOD', avgCodMgL: 280, avgBodMgL: 110, totalChromiumPpm: 0.0, riskLevel: 'MODERATE' },
  { id: 'EFF-05', name: 'Acid Pickling & Plating Bath', category: 'METALS', avgCodMgL: 310, avgBodMgL: 95, totalChromiumPpm: 4.8, riskLevel: 'SEVERE' },
  { id: 'EFF-06', name: 'Tannery Chrome Dye Liquors', category: 'TEXTILE', avgCodMgL: 820, avgBodMgL: 390, totalChromiumPpm: 6.2, riskLevel: 'CRITICAL' },
  { id: 'EFF-07', name: 'Paper Pulp Bleaching Wastewater', category: 'CHEMICAL', avgCodMgL: 490, avgBodMgL: 205, totalChromiumPpm: 0.2, riskLevel: 'HIGH' },
  { id: 'EFF-08', name: 'Fertilizer Ammonia Condensate', category: 'CHEMICAL', avgCodMgL: 230, avgBodMgL: 85, totalChromiumPpm: 0.0, riskLevel: 'MODERATE' },
  { id: 'EFF-09', name: 'Dairy Processing CIP Effluent', category: 'FOOD', avgCodMgL: 190, avgBodMgL: 75, totalChromiumPpm: 0.0, riskLevel: 'LOW' },
  { id: 'EFF-10', name: 'Electronic Circuit Etching Waste', category: 'METALS', avgCodMgL: 340, avgBodMgL: 120, totalChromiumPpm: 3.5, riskLevel: 'HIGH' },
  { id: 'EFF-11', name: 'Edible Oil Refining Bleach Wash', category: 'FOOD', avgCodMgL: 210, avgBodMgL: 80, totalChromiumPpm: 0.0, riskLevel: 'LOW' },
  { id: 'EFF-12', name: 'Industrial Boiler Blowdown', category: 'CHEMICAL', avgCodMgL: 140, avgBodMgL: 45, totalChromiumPpm: 0.1, riskLevel: 'SAFE' },
  { id: 'EFF-13', name: 'Distillery Spent Wash Sludge', category: 'FOOD', avgCodMgL: 950, avgBodMgL: 460, totalChromiumPpm: 0.1, riskLevel: 'CRITICAL' },
  { id: 'EFF-14', name: 'Automotive Paint Shop Rinses', category: 'METALS', avgCodMgL: 410, avgBodMgL: 175, totalChromiumPpm: 1.9, riskLevel: 'HIGH' }
];

export const CPCB_DISCHARGE_LIMITS = {
  BOD_LIMIT_MG_L: 30.0,
  COD_LIMIT_MG_L: 250.0,
  TSS_LIMIT_MG_L: 100.0,
  HEAVY_METAL_LIMIT_PPM: 2.0
};

export function getEffluentRiskSeverity(bodMgL) {
  if (bodMgL >= 300) return { label: 'CRITICAL DISCHARGE VIOLATION', color: '#ef4444', level: 'CRITICAL' };
  if (bodMgL >= 150) return { label: 'SEVERE POLLUTION LEVEL', color: '#f97316', level: 'SEVERE' };
  if (bodMgL >= 60) return { label: 'MODERATE NON-COMPLIANCE', color: '#eab308', level: 'HIGH' };
  if (bodMgL >= 30) return { label: 'MARGINAL COMPLIANCE', color: '#3b82f6', level: 'MODERATE' };
  return { label: 'COMPLIANT DISCHARGE', color: '#10b981', level: 'SAFE' };
}
