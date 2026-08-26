/**
 * Enterprise Architectural Specification:
 * Module: Urban Ambient EMF Mock Dataset & Calculation Utilities
 * File: src/components/emfData.js
 * Domain: Radiofrequency Electromagnetic Telemetry, Inverse-Square Attenuation, ICNIRP Audit Math
 */

import { EMF_SOURCES, EMF_ZONES, ICNIRP_SAFETY_LIMITS } from './emfTypes';

export const hourlyEmfTrends = [
  { hour: '00:00', avgPowerDensityWm2: 2.1, maxPeakWm2: 4.8, networkLoadPercent: 25 },
  { hour: '02:00', avgPowerDensityWm2: 1.8, maxPeakWm2: 3.9, networkLoadPercent: 18 },
  { hour: '04:00', avgPowerDensityWm2: 1.9, maxPeakWm2: 4.1, networkLoadPercent: 20 },
  { hour: '06:00', avgPowerDensityWm2: 3.8, maxPeakWm2: 7.2, networkLoadPercent: 52 },
  { hour: '08:00', avgPowerDensityWm2: 7.4, maxPeakWm2: 11.8, networkLoadPercent: 88 },
  { hour: '10:00', avgPowerDensityWm2: 8.2, maxPeakWm2: 12.5, networkLoadPercent: 94 },
  { hour: '12:00', avgPowerDensityWm2: 8.9, maxPeakWm2: 13.1, networkLoadPercent: 98 },
  { hour: '14:00', avgPowerDensityWm2: 8.5, maxPeakWm2: 12.8, networkLoadPercent: 95 },
  { hour: '16:00', avgPowerDensityWm2: 7.8, maxPeakWm2: 11.9, networkLoadPercent: 90 },
  { hour: '18:00', avgPowerDensityWm2: 8.6, maxPeakWm2: 12.9, networkLoadPercent: 96 },
  { hour: '20:00', avgPowerDensityWm2: 6.2, maxPeakWm2: 9.4, networkLoadPercent: 74 },
  { hour: '22:00', avgPowerDensityWm2: 3.9, maxPeakWm2: 6.8, networkLoadPercent: 45 }
];

export const stationEmfProfiles = [
  { id: 'STATION-EMF-01', stationName: 'Financial Rooftop RF Spectrum Meter', activeSensors: 8, avgPowerDensity: 8.4, limitViolationCount: 16, category: 'Telecom' },
  { id: 'STATION-EMF-02', stationName: 'Grid Power Corridor ELF Sensor', activeSensors: 14, avgPowerDensity: 4.2, limitViolationCount: 4, category: 'Power Grid' },
  { id: 'STATION-EMF-03', stationName: 'Broadcast Tower Monitoring Station', activeSensors: 10, avgPowerDensity: 11.5, limitViolationCount: 28, category: 'Broadcast' },
  { id: 'STATION-EMF-04', stationName: 'Substation Perimeter Telemetry', activeSensors: 6, avgPowerDensity: 2.8, limitViolationCount: 1, category: 'Substation' },
  { id: 'STATION-EMF-05', stationName: 'Aviation Radar Boundary Sensor', activeSensors: 12, avgPowerDensity: 9.1, limitViolationCount: 19, category: 'Radar' }
];

export const emfMitigationGoals = [
  { id: 'EMFG1', title: '5G Base Station Beamforming Calibration', targetPowerDensity: 5.0, currentPowerDensity: 8.6, status: 'IN_PROGRESS' },
  { id: 'EMFG2', title: 'Broadcast Tower Shielding Barrier', targetPowerDensity: 10.0, currentPowerDensity: 12.4, status: 'IN_PROGRESS' },
  { id: 'EMFG3', title: 'School Zone RF Boundary Compliance', targetPowerDensity: 1.0, currentPowerDensity: 0.8, status: 'ACHIEVED' },
  { id: 'EMFG4', title: 'Substation Low-Frequency Magnetic Shielding', targetPowerDensity: 2.0, currentPowerDensity: 3.1, status: 'IN_PROGRESS' }
];

export const emfDataStore = {
  sources: EMF_SOURCES,
  zones: EMF_ZONES,
  limits: ICNIRP_SAFETY_LIMITS,
  hourlyTrends: hourlyEmfTrends,
  stationProfiles: stationEmfProfiles,
  goals: emfMitigationGoals
};

export function calculateEmfDistanceAttenuation(sourceId, distanceMeters = 10) {
  const source = EMF_SOURCES.find((s) => s.id === sourceId) || EMF_SOURCES[0];

  // Inverse Square Law: S_d = S_0 / (d / d_0)^2
  const distanceRatio = Math.max(1.0, distanceMeters / 2.0);
  const estimatedPowerDensity = parseFloat((source.avgPowerDensityWm2 / Math.pow(distanceRatio, 2)).toFixed(2));

  return {
    source,
    distanceMeters,
    estimatedPowerDensity,
    isIcnirpCompliant: estimatedPowerDensity <= ICNIRP_SAFETY_LIMITS.PUBLIC_POWER_DENSITY_WM2,
    recommendedBufferMeters: Math.ceil(2.0 * Math.sqrt(source.avgPowerDensityWm2 / ICNIRP_SAFETY_LIMITS.PUBLIC_POWER_DENSITY_WM2))
  };
}
