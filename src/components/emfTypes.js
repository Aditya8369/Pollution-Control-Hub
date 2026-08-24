/**
 * Enterprise Architectural Specification:
 * Module: Urban Ambient Electromagnetic Field (EMF) Telemetry Metadata Standard
 * File: src/components/emfTypes.js
 * Domain: Radiofrequency (RF) Radiation, Extremely Low Frequency (ELF), ICNIRP Guidelines, Power Density (W/m²)
 */

export const EMF_CATEGORIES = {
  TELECOM: '5G / Cellular Base Stations',
  POWER_GRID: 'High-Voltage Power Lines',
  BROADCAST: 'Radio & TV Broadcast Towers',
  SUBSTATION: 'Electrical Substation Transformers',
  COMMERCIAL: 'Commercial Wi-Fi & Radar'
};

export const EMF_ZONES = [
  { id: 'EMFZ1', name: 'Downtown Financial Rooftop Hub', category: 'TELECOM', baselinePowerDensity: 8.4, maxAllowedPowerDensity: 10.0 },
  { id: 'EMFZ2', name: 'Suburban Power Line Right-of-Way', category: 'POWER_GRID', baselinePowerDensity: 4.2, maxAllowedPowerDensity: 10.0 },
  { id: 'EMFZ3', name: 'Broadcast Mountain Transmitter Site', category: 'BROADCAST', baselinePowerDensity: 11.5, maxAllowedPowerDensity: 10.0 },
  { id: 'EMFZ4', name: 'Residential Neighborhood Substation Zone', category: 'SUBSTATION', baselinePowerDensity: 2.8, maxAllowedPowerDensity: 10.0 },
  { id: 'EMFZ5', name: 'Airport Aviation Radar Sector', category: 'COMMERCIAL', baselinePowerDensity: 9.1, maxAllowedPowerDensity: 10.0 }
];

export const EMF_SOURCES = [
  { id: 'EMF-01', name: 'Macro 5G Cell Tower Array (3.5 GHz)', category: 'TELECOM', avgPowerDensityWm2: 8.6, frequencyMhz: 3500, magneticFieldUt: 1.2, riskLevel: 'HIGH' },
  { id: 'EMF-02', name: '500kV High-Voltage Transmission Line', category: 'POWER_GRID', avgPowerDensityWm2: 4.8, frequencyMhz: 60, magneticFieldUt: 18.5, riskLevel: 'HIGH' },
  { id: 'EMF-03', name: 'FM Radio & VHF TV Broadcast Antenna', category: 'BROADCAST', avgPowerDensityWm2: 12.4, frequencyMhz: 100, magneticFieldUt: 0.8, riskLevel: 'CRITICAL' },
  { id: 'EMF-04', name: 'Substation Step-Down Transformer', category: 'SUBSTATION', avgPowerDensityWm2: 3.1, frequencyMhz: 60, magneticFieldUt: 14.2, riskLevel: 'MODERATE' },
  { id: 'EMF-05', name: 'Airport Primary Surveillance Radar', category: 'COMMERCIAL', avgPowerDensityWm2: 9.8, frequencyMhz: 2800, magneticFieldUt: 0.5, riskLevel: 'VERY_HIGH' },
  { id: 'EMF-06', name: 'Urban Small Cell Pole Base Station', category: 'TELECOM', avgPowerDensityWm2: 6.2, frequencyMhz: 28000, magneticFieldUt: 0.4, riskLevel: 'MODERATE' },
  { id: 'EMF-07', name: 'Commercial Wi-Fi 6E Access Point Dense Cluster', category: 'COMMERCIAL', avgPowerDensityWm2: 1.8, frequencyMhz: 6000, magneticFieldUt: 0.1, riskLevel: 'LOW' },
  { id: 'EMF-08', name: 'Underground 230kV Feeder Cable', category: 'POWER_GRID', avgPowerDensityWm2: 2.4, frequencyMhz: 60, magneticFieldUt: 9.6, riskLevel: 'MODERATE' },
  { id: 'EMF-09', name: 'UHF Digital TV Transmitter', category: 'BROADCAST', avgPowerDensityWm2: 10.5, frequencyMhz: 600, magneticFieldUt: 0.7, riskLevel: 'VERY_HIGH' },
  { id: 'EMF-10', name: 'Industrial Induction Melting Furnace', category: 'SUBSTATION', avgPowerDensityWm2: 7.4, frequencyMhz: 10, magneticFieldUt: 25.0, riskLevel: 'HIGH' },
  { id: 'EMF-11', name: 'Hospital MRI Shielded Suite Outer Perimeter', category: 'COMMERCIAL', avgPowerDensityWm2: 0.8, frequencyMhz: 64, magneticFieldUt: 2.1, riskLevel: 'SAFE' },
  { id: 'EMF-12', name: 'Residential Smart Meter Mesh Gateway', category: 'TELECOM', avgPowerDensityWm2: 0.5, frequencyMhz: 915, magneticFieldUt: 0.1, riskLevel: 'SAFE' },
  { id: 'EMF-13', name: 'Satellite Earth Station Uplink Dish', category: 'COMMERCIAL', avgPowerDensityWm2: 11.2, frequencyMhz: 14000, magneticFieldUt: 0.3, riskLevel: 'EXTREME' },
  { id: 'EMF-14', name: 'Electric Bus Fast-Charging Pantograph', category: 'POWER_GRID', avgPowerDensityWm2: 5.4, frequencyMhz: 60, magneticFieldUt: 12.8, riskLevel: 'MODERATE' }
];

export const ICNIRP_SAFETY_LIMITS = {
  PUBLIC_POWER_DENSITY_WM2: 10.0, // 10 W/m² general public threshold
  PUBLIC_MAGNETIC_FIELD_UT: 200.0, // 200 µT for 50/60 Hz ELF
  OCCUPATIONAL_POWER_DENSITY_WM2: 50.0
};

export function getEmfRiskSeverity(powerDensityWm2) {
  if (powerDensityWm2 >= 10.0) return { label: 'ICNIRP LIMIT EXCEEDED', color: '#ef4444', level: 'CRITICAL' };
  if (powerDensityWm2 >= 7.0) return { label: 'HIGH EMF EXPOSURE', color: '#f97316', level: 'HIGH' };
  if (powerDensityWm2 >= 4.0) return { label: 'MODERATE AMBIENT EMF', color: '#eab308', level: 'MODERATE' };
  if (powerDensityWm2 >= 1.0) return { label: 'LOW AMBIENT EMF', color: '#3b82f6', level: 'LOW' };
  return { label: 'SAFE / MINIMAL EMF', color: '#10b981', level: 'SAFE' };
}
