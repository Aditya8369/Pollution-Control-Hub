/**
 * Enterprise Architectural Specification:
 * Module: Ocean & Coastal Microplastics Pollution Telemetry Standard & Metadata
 * File: src/components/microplasticsTypes.js
 * Domain: Marine Plastic Density (Particles/m³), Polymer Composition, NOAA Marine Safety Limits
 */

export const MICROPLASTICS_CATEGORIES = {
  SYNTHETIC_TEXTILE: 'Synthetic Textile Microfibers',
  TYRE_WEAR: 'Tyre & Rubber Abrasion Particles',
  PACKAGING_FRAGMENT: 'Packaging Polyethylene Fragments',
  PERSONAL_CARE: 'Personal Care Microbeads',
  INDUSTRIAL_NURDLE: 'Pre-Production Plastic Nurdles'
};

export const OCEAN_ZONES = [
  { id: 'MPZ1', name: 'Coastal Harbor Estuary Plume', category: 'PACKAGING_FRAGMENT', baselineDensityPpm3: 450.0, maxAllowedDensityPpm3: 50.0 },
  { id: 'MPZ2', name: 'Offshore Gyre Surface Drift', category: 'INDUSTRIAL_NURDLE', baselineDensityPpm3: 1250.0, maxAllowedDensityPpm3: 50.0 },
  { id: 'MPZ3', name: 'River Outfall Delta Zone', category: 'SYNTHETIC_TEXTILE', baselineDensityPpm3: 880.0, maxAllowedDensityPpm3: 50.0 },
  { id: 'MPZ4', name: 'Coral Reef Marine Sanctuary', category: 'PERSONAL_CARE', baselineDensityPpm3: 42.0, maxAllowedDensityPpm3: 50.0 },
  { id: 'MPZ5', name: 'Commercial Shipping Lane Trench', category: 'TYRE_WEAR', baselineDensityPpm3: 610.0, maxAllowedDensityPpm3: 50.0 }
];

export const MICROPLASTICS_SOURCES = [
  { id: 'MP-01', name: 'Municipal Wastewater Treatment Outfall', category: 'SYNTHETIC_TEXTILE', avgParticlesPerM3: 920, polymerType: 'Polyester (PET)', avgSizeMicrons: 150, riskLevel: 'CRITICAL' },
  { id: 'MP-02', name: 'Coastal Highway Stormwater Runoff', category: 'TYRE_WEAR', avgParticlesPerM3: 1450, polymerType: 'Styrene-Butadiene Rubber', avgSizeMicrons: 450, riskLevel: 'EXTREME' },
  { id: 'MP-03', name: 'Port Nurdle Transfer Spill', category: 'INDUSTRIAL_NURDLE', avgParticlesPerM3: 2100, polymerType: 'Polypropylene (PP)', avgSizeMicrons: 3000, riskLevel: 'EXTREME' },
  { id: 'MP-04', name: 'Cosmetic Manufacturing Rinse Line', category: 'PERSONAL_CARE', avgParticlesPerM3: 680, polymerType: 'Polyethylene (PE)', avgSizeMicrons: 80, riskLevel: 'HIGH' },
  { id: 'MP-05', name: 'Urban River Surface Plastic Drift', category: 'PACKAGING_FRAGMENT', avgParticlesPerM3: 1150, polymerType: 'High-Density PE (HDPE)', avgSizeMicrons: 850, riskLevel: 'VERY_HIGH' },
  { id: 'MP-06', name: 'Commercial Fishing Gear Abrasion', category: 'SYNTHETIC_TEXTILE', avgParticlesPerM3: 780, polymerType: 'Polyamide (Nylon-6)', avgSizeMicrons: 1200, riskLevel: 'HIGH' },
  { id: 'MP-07', name: 'Agricultural Film Runoff Channel', category: 'PACKAGING_FRAGMENT', avgParticlesPerM3: 540, polymerType: 'Low-Density PE (LDPE)', avgSizeMicrons: 620, riskLevel: 'MODERATE' },
  { id: 'MP-08', name: 'Shipyard Hull Hydro-Blasting Discharge', category: 'PACKAGING_FRAGMENT', avgParticlesPerM3: 890, polymerType: 'Epoxy Resin Coating', avgSizeMicrons: 220, riskLevel: 'VERY_HIGH' },
  { id: 'MP-09', name: 'Laundry Commercial Facility Waste', category: 'SYNTHETIC_TEXTILE', avgParticlesPerM3: 1280, polymerType: 'Acrylic Microfibers', avgSizeMicrons: 110, riskLevel: 'EXTREME' },
  { id: 'MP-10', name: 'Automotive Recycling Shredder Fluff', category: 'TYRE_WEAR', avgParticlesPerM3: 620, polymerType: 'Polyurethane (PU)', avgSizeMicrons: 980, riskLevel: 'HIGH' },
  { id: 'MP-11', name: 'Desalination Plant Brine Discharge', category: 'PACKAGING_FRAGMENT', avgParticlesPerM3: 180, polymerType: 'Polycarbonate (PC)', avgSizeMicrons: 90, riskLevel: 'SAFE' },
  { id: 'MP-12', name: 'Marine Aquaculture Net Wash', category: 'SYNTHETIC_TEXTILE', avgParticlesPerM3: 410, polymerType: 'Polyethylene Netting', avgSizeMicrons: 1500, riskLevel: 'MODERATE' },
  { id: 'MP-13', name: 'Container Terminal Cargo Loss', category: 'INDUSTRIAL_NURDLE', avgParticlesPerM3: 1850, polymerType: 'Expanded Polystyrene (EPS)', avgSizeMicrons: 4500, riskLevel: 'EXTREME' },
  { id: 'MP-14', name: 'Urban Beach Boardwalk Washdown', category: 'PACKAGING_FRAGMENT', avgParticlesPerM3: 310, polymerType: 'PET & PE Mix', avgSizeMicrons: 410, riskLevel: 'MODERATE' }
];

export const NOAA_MARINE_PLASTIC_LIMITS = {
  SAFE_THRESHOLD_PARTICLES_M3: 50.0,
  HIGH_RISK_THRESHOLD_PARTICLES_M3: 500.0,
  CRITICAL_THRESHOLD_PARTICLES_M3: 1000.0
};

export function getMicroplasticsRiskSeverity(particlesPerM3) {
  if (particlesPerM3 >= 1000.0) return { label: 'CRITICAL MARINE VIOLATION', color: '#ef4444', level: 'CRITICAL' };
  if (particlesPerM3 >= 500.0) return { label: 'HIGH PLASTIC DENSITY', color: '#f97316', level: 'HIGH' };
  if (particlesPerM3 >= 150.0) return { label: 'MODERATE PLASTIC POLLUTION', color: '#eab308', level: 'MODERATE' };
  if (particlesPerM3 >= 50.0) return { label: 'LOW PLASTIC CONTAMINATION', color: '#3b82f6', level: 'LOW' };
  return { label: 'CLEAN / SAFE WATER', color: '#10b981', level: 'SAFE' };
}
