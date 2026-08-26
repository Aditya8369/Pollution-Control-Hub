/**
 * Enterprise Architectural Specification:
 * Module: Solar Radiation & UV Index Mock Dataset & Calculation Utilities
 * File: src/components/uvData.js
 * Domain: Hourly UVI Trends, Ozone Layer Dobson Units, Erythemal UV Dose Math
 */

import { UV_SOURCES, UV_ZONES, WHO_UV_INDEX_LIMITS } from './uvTypes';

export const hourlyUvTrends = [
  { hour: '06:00', avgUvi: 0.8, solarIrradianceWm2: 65, ozoneDobson: 310 },
  { hour: '08:00', avgUvi: 3.2, solarIrradianceWm2: 240, ozoneDobson: 305 },
  { hour: '10:00', avgUvi: 7.4, solarIrradianceWm2: 580, ozoneDobson: 295 },
  { hour: '12:00', avgUvi: 11.2, solarIrradianceWm2: 890, ozoneDobson: 280 },
  { hour: '14:00', avgUvi: 9.8, solarIrradianceWm2: 780, ozoneDobson: 285 },
  { hour: '16:00', avgUvi: 5.6, solarIrradianceWm2: 440, ozoneDobson: 298 },
  { hour: '18:00', avgUvi: 1.9, solarIrradianceWm2: 150, ozoneDobson: 308 },
  { hour: '20:00', avgUvi: 0.0, solarIrradianceWm2: 0, ozoneDobson: 315 }
];

export const stationUvProfiles = [
  { id: 'STATION-01', stationName: 'Summit Atmospheric Observatory', activeSensors: 10, avgUvi: 12.5, extremeAlertCount: 24, category: 'High Altitude' },
  { id: 'STATION-02', stationName: 'Coastal Solar Surveillance', activeSensors: 16, avgUvi: 11.4, extremeAlertCount: 19, category: 'Coastal' },
  { id: 'STATION-03', stationName: 'Metropolitan Plaza Tower', activeSensors: 14, avgUvi: 10.2, extremeAlertCount: 15, category: 'Urban' },
  { id: 'STATION-04', stationName: 'Central Botanical Gardens', activeSensors: 8, avgUvi: 4.8, extremeAlertCount: 2, category: 'Park' },
  { id: 'STATION-05', stationName: 'University Quad Sensor', activeSensors: 12, avgUvi: 8.6, extremeAlertCount: 9, category: 'Campus' }
];

export const uvMitigationGoals = [
  { id: 'UG1', title: 'Urban Canopy Shade Structures', targetUvi: 5.0, currentUvi: 9.4, status: 'IN_PROGRESS' },
  { id: 'UG2', title: 'High-Altitude Solar Alert Network', targetUvi: 11.0, currentUvi: 12.8, status: 'IN_PROGRESS' },
  { id: 'UG3', title: 'Beach Promenade UV Warning Display', targetUvi: 8.0, currentUvi: 7.8, status: 'ACHIEVED' },
  { id: 'UG4', title: 'School Playground Solar Sail Sails', targetUvi: 3.0, currentUvi: 4.5, status: 'IN_PROGRESS' }
];

export const uvDataStore = {
  sources: UV_SOURCES,
  zones: UV_ZONES,
  limits: WHO_UV_INDEX_LIMITS,
  hourlyTrends: hourlyUvTrends,
  stationProfiles: stationUvProfiles,
  goals: uvMitigationGoals
};

export function calculateBurnTimeMinutes(uvi, skinType = 2) {
  // Erythemal Burn Time (min) = (200 * SkinFactor) / UVI
  // Skin Type Factors: Type 1: 1.0, Type 2: 1.5, Type 3: 2.0, Type 4: 3.0
  const skinFactors = { 1: 1.0, 2: 1.5, 3: 2.0, 4: 3.0 };
  const factor = skinFactors[skinType] || 1.5;

  if (uvi <= 0) return 999;
  const burnMin = Math.max(5, Math.round((200 * factor) / (uvi * 10)));

  return {
    uvi,
    skinType,
    burnMin,
    recommendedSpf: uvi >= 8 ? 50 : uvi >= 6 ? 30 : 15,
    requiresShade: uvi >= 6.0
  };
}
