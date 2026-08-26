/**
 * Enterprise Architectural Specification:
 * Module: Noise Pollution & Acoustic Telemetry Metadata Definition Standard
 * File: src/components/noiseTypes.js
 * Domain: Urban Acoustic Surveillance, Decibel (dBA) Telemetry, WHO Sound Exposure Compliance
 */

export const NOISE_CATEGORIES = {
  TRAFFIC: 'Traffic & Transportation',
  INDUSTRIAL: 'Industrial & Construction',
  COMMERCIAL: 'Commercial & Nightlife',
  RESIDENTIAL: 'Residential Ambient',
  NATURAL: 'Natural Ambient'
};

export const NOISE_ZONES = [
  { id: 'Z1', name: 'Downtown Commercial Hub', category: 'COMMERCIAL', baselineDba: 68.5 },
  { id: 'Z2', name: 'Industrial Port District', category: 'INDUSTRIAL', baselineDba: 74.2 },
  { id: 'Z3', name: 'Central Highway Corridor', category: 'TRAFFIC', baselineDba: 79.1 },
  { id: 'Z4', name: 'Suburban Residential Zone', category: 'RESIDENTIAL', baselineDba: 48.0 },
  { id: 'Z5', name: 'Hospital & Healthcare Quiet Zone', category: 'RESIDENTIAL', baselineDba: 42.5 },
  { id: 'Z6', name: 'University Campus Precinct', category: 'COMMERCIAL', baselineDba: 52.3 },
  { id: 'Z7', name: 'Urban Park & Nature Reserve', category: 'NATURAL', baselineDba: 38.4 },
  { id: 'Z8', name: 'Construction & Rail Hub', category: 'INDUSTRIAL', baselineDba: 82.6 }
];

export const NOISE_SOURCES = [
  { id: 'SRC-01', name: 'Heavy Freight Rail', category: 'TRAFFIC', avgDba: 88, maxDba: 96, riskLevel: 'CRITICAL' },
  { id: 'SRC-02', name: 'Highway Traffic Stream', category: 'TRAFFIC', avgDba: 78, maxDba: 85, riskLevel: 'HIGH' },
  { id: 'SRC-03', name: 'Pile Driving Construction', category: 'INDUSTRIAL', avgDba: 92, maxDba: 104, riskLevel: 'SEVERE' },
  { id: 'SRC-04', name: 'Commercial HVAC Chillers', category: 'INDUSTRIAL', avgDba: 65, maxDba: 72, riskLevel: 'MODERATE' },
  { id: 'SRC-05', name: 'Nightlife Entertainment Venues', category: 'COMMERCIAL', avgDba: 74, maxDba: 84, riskLevel: 'HIGH' },
  { id: 'SRC-06', name: 'Aviation Low Flyover', category: 'TRAFFIC', avgDba: 82, maxDba: 92, riskLevel: 'HIGH' },
  { id: 'SRC-07', name: 'Urban Traffic Intersection', category: 'TRAFFIC', avgDba: 71, maxDba: 79, riskLevel: 'MODERATE' },
  { id: 'SRC-08', name: 'Generator Operations', category: 'INDUSTRIAL', avgDba: 76, maxDba: 83, riskLevel: 'HIGH' },
  { id: 'SRC-09', name: 'Pedestrian Concourse', category: 'COMMERCIAL', avgDba: 58, maxDba: 66, riskLevel: 'LOW' },
  { id: 'SRC-10', name: 'Parkland Wind & Birds', category: 'NATURAL', avgDba: 36, maxDba: 42, riskLevel: 'SAFE' },
  { id: 'SRC-11', name: 'Substation Transformer Humming', category: 'INDUSTRIAL', avgDba: 54, maxDba: 60, riskLevel: 'LOW' },
  { id: 'SRC-12', name: 'Emergency Vehicle Sirens', category: 'TRAFFIC', avgDba: 94, maxDba: 108, riskLevel: 'SEVERE' },
  { id: 'SRC-13', name: 'School Playground Activities', category: 'RESIDENTIAL', avgDba: 62, maxDba: 71, riskLevel: 'LOW' },
  { id: 'SRC-14', name: 'Building Renovation Power Tools', category: 'INDUSTRIAL', avgDba: 84, maxDba: 93, riskLevel: 'HIGH' }
];

export const NOISE_MITIGATION_GOALS = [
  { id: 'G1', title: 'Hospital Quiet Zone Enforce', targetDba: 45, currentDba: 48.2, status: 'IN_PROGRESS' },
  { id: 'G2', title: 'Nighttime Highway Noise Barrier', targetDba: 55, currentDba: 58.7, status: 'IN_PROGRESS' },
  { id: 'G3', title: 'Industrial Zone Acoustic Insulation', targetDba: 70, currentDba: 69.4, status: 'ACHIEVED' },
  { id: 'G4', title: 'School Zone Traffic Calming', targetDba: 50, currentDba: 53.1, status: 'IN_PROGRESS' },
  { id: 'G5', title: 'Residential Electric Bus Conversion', targetDba: 52, currentDba: 51.5, status: 'ACHIEVED' }
];

export const WHO_SOUND_EXPOSURE_LIMITS = {
  RESIDENTIAL_DAY: 55,
  RESIDENTIAL_NIGHT: 45,
  COMMERCIAL: 65,
  INDUSTRIAL: 70,
  HEAVY_HEARING_RISK: 85
};

export function getNoiseExposureSeverity(dba) {
  if (dba >= 85) return { label: 'SEVERE (HEARING RISK)', color: '#ef4444', level: 'CRITICAL' };
  if (dba >= 75) return { label: 'HIGH EXPOSURE', color: '#f97316', level: 'HIGH' };
  if (dba >= 65) return { label: 'MODERATE EXPOSURE', color: '#eab308', level: 'MODERATE' };
  if (dba >= 55) return { label: 'ACCEPTABLE URBAN', color: '#3b82f6', level: 'LOW' };
  return { label: 'SAFE / QUIET', color: '#10b981', level: 'SAFE' };
}
