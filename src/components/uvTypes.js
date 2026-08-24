/**
 * Enterprise Architectural Specification:
 * Module: Solar Radiation & Ultraviolet (UV) Index Metadata Standard
 * File: src/components/uvTypes.js
 * Domain: Atmospheric Solar Physics, UV Index (UVI) Telemetry, Ozone Layer Attenuation, WHO Solar Safety
 */

export const UV_CATEGORIES = {
  CLEAR_SKY: 'Direct Solar Irradiance',
  URBAN_CANOPY: 'Urban Canopy Microclimate',
  COASTAL_BEACH: 'Coastal Water Reflection',
  HIGH_ALTITUDE: 'High Altitude Exposure',
  SHADED_PARK: 'Canopy Shaded Zone'
};

export const UV_ZONES = [
  { id: 'UVZ1', name: 'Downtown High-Rise Plaza', category: 'URBAN_CANOPY', baselineUvi: 9.4, maxAllowedUvi: 11.0 },
  { id: 'UVZ2', name: 'Coastal Beach Resort Promenade', category: 'COASTAL_BEACH', baselineUvi: 11.2, maxAllowedUvi: 11.0 },
  { id: 'UVZ3', name: 'Suburban Botanical Garden', category: 'SHADED_PARK', baselineUvi: 4.8, maxAllowedUvi: 11.0 },
  { id: 'UVZ4', name: 'High Altitude Ridge Lookout', category: 'HIGH_ALTITUDE', baselineUvi: 12.8, maxAllowedUvi: 11.0 },
  { id: 'UVZ5', name: 'University Central Quad', category: 'CLEAR_SKY', baselineUvi: 8.6, maxAllowedUvi: 11.0 }
];

export const UV_SOURCES = [
  { id: 'UV-01', name: 'High-Altitude Solar Irradiance', category: 'HIGH_ALTITUDE', avgUvi: 12.5, peakWpm2: 980, ozoneDobson: 260, riskLevel: 'EXTREME' },
  { id: 'UV-02', name: 'Reflective White Beach Sand', category: 'COASTAL_BEACH', avgUvi: 11.4, peakWpm2: 890, ozoneDobson: 275, riskLevel: 'EXTREME' },
  { id: 'UV-03', name: 'Glass Skyscraper Albedo Reflection', category: 'URBAN_CANOPY', avgUvi: 10.2, peakWpm2: 820, ozoneDobson: 280, riskLevel: 'VERY_HIGH' },
  { id: 'UV-04', name: 'Midday Open Field Sol', category: 'CLEAR_SKY', avgUvi: 9.1, peakWpm2: 740, ozoneDobson: 290, riskLevel: 'VERY_HIGH' },
  { id: 'UV-05', name: 'Asphalt Heat Island Surface', category: 'URBAN_CANOPY', avgUvi: 8.5, peakWpm2: 690, ozoneDobson: 295, riskLevel: 'VERY_HIGH' },
  { id: 'UV-06', name: 'Open Water Lake Surface', category: 'COASTAL_BEACH', avgUvi: 9.8, peakWpm2: 790, ozoneDobson: 285, riskLevel: 'VERY_HIGH' },
  { id: 'UV-07', name: 'Mountain Ridge Ski Slope (Snow Reflection)', category: 'HIGH_ALTITUDE', avgUvi: 13.2, peakWpm2: 1040, ozoneDobson: 250, riskLevel: 'EXTREME' },
  { id: 'UV-08', name: 'Urban Rooftop Solar Array', category: 'CLEAR_SKY', avgUvi: 8.8, peakWpm2: 710, ozoneDobson: 300, riskLevel: 'HIGH' },
  { id: 'UV-09', name: 'Suburban Residential Lawn', category: 'SHADED_PARK', avgUvi: 5.2, peakWpm2: 420, ozoneDobson: 310, riskLevel: 'MODERATE' },
  { id: 'UV-10', name: 'Deciduous Tree Canopy Shade', category: 'SHADED_PARK', avgUvi: 3.1, peakWpm2: 240, ozoneDobson: 320, riskLevel: 'LOW' },
  { id: 'UV-11', name: 'Urban Courtyard Awning Shelter', category: 'URBAN_CANOPY', avgUvi: 2.2, peakWpm2: 180, ozoneDobson: 325, riskLevel: 'SAFE' },
  { id: 'UV-12', name: 'Overcast Cloud Diffused Exposure', category: 'CLEAR_SKY', avgUvi: 4.5, peakWpm2: 360, ozoneDobson: 315, riskLevel: 'MODERATE' },
  { id: 'UV-13', name: 'Solar Thermal Concentrator Field', category: 'CLEAR_SKY', avgUvi: 10.8, peakWpm2: 860, ozoneDobson: 280, riskLevel: 'EXTREME' },
  { id: 'UV-14', name: 'Pine Forest Trail Canopy', category: 'SHADED_PARK', avgUvi: 4.1, peakWpm2: 310, ozoneDobson: 315, riskLevel: 'MODERATE' }
];

export const WHO_UV_INDEX_LIMITS = {
  LOW: 2.0,
  MODERATE: 5.0,
  HIGH: 7.0,
  VERY_HIGH: 10.0,
  EXTREME: 11.0
};

export function getUvRiskSeverity(uvi) {
  if (uvi >= 11.0) return { label: 'EXTREME UV EXPOSURE', color: '#a855f7', level: 'EXTREME' };
  if (uvi >= 8.0) return { label: 'VERY HIGH UV RISK', color: '#ef4444', level: 'VERY_HIGH' };
  if (uvi >= 6.0) return { label: 'HIGH UV EXPOSURE', color: '#f97316', level: 'HIGH' };
  if (uvi >= 3.0) return { label: 'MODERATE UV RISK', color: '#eab308', level: 'MODERATE' };
  return { label: 'LOW / SAFE UV', color: '#10b981', level: 'SAFE' };
}
