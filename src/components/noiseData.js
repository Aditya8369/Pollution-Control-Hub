/**
 * Enterprise Architectural Specification:
 * Module: Noise Pollution & Acoustic Telemetry Mock Dataset
 * File: src/components/noiseData.js
 * Domain: Urban Sensor Networks, Hourly dBA Telemetry Trends, District Acoustic Profiles
 */

import { NOISE_SOURCES, NOISE_ZONES, NOISE_MITIGATION_GOALS } from './noiseTypes';

export const noiseTelemetryRoutes = [
  { id: 'ROUTE-01', name: 'Downtown Commuter Express', avgDba: 76.4, maxPeakDba: 88.2, durationMin: 28, distanceKm: 12.4 },
  { id: 'ROUTE-02', name: 'Suburban Greenway Corridor', avgDba: 46.8, maxPeakDba: 54.1, durationMin: 35, distanceKm: 14.8 },
  { id: 'ROUTE-03', name: 'Industrial Belt Freight Route', avgDba: 84.1, maxPeakDba: 97.5, durationMin: 42, distanceKm: 21.0 },
  { id: 'ROUTE-04', name: 'University Quiet Perimeter', avgDba: 51.2, maxPeakDba: 62.0, durationMin: 18, distanceKm: 6.2 },
  { id: 'ROUTE-05', name: 'Airport Transit Ring Road', avgDba: 81.5, maxPeakDba: 92.4, durationMin: 30, distanceKm: 18.5 }
];

export const hourlyAcousticTrends = [
  { hour: '00:00', avgDba: 48.2, peakDba: 62.1, trafficVolume: 120 },
  { hour: '02:00', avgDba: 42.5, peakDba: 55.4, trafficVolume: 60 },
  { hour: '04:00', avgDba: 44.1, peakDba: 58.0, trafficVolume: 90 },
  { hour: '06:00', avgDba: 62.8, peakDba: 74.5, trafficVolume: 450 },
  { hour: '08:00', avgDba: 78.4, peakDba: 89.2, trafficVolume: 1250 },
  { hour: '10:00', avgDba: 71.2, peakDba: 82.0, trafficVolume: 980 },
  { hour: '12:00', avgDba: 73.5, peakDba: 84.6, trafficVolume: 1040 },
  { hour: '14:00', avgDba: 72.1, peakDba: 83.1, trafficVolume: 1010 },
  { hour: '16:00', avgDba: 76.8, peakDba: 87.9, trafficVolume: 1180 },
  { hour: '18:00', avgDba: 81.2, peakDba: 92.4, trafficVolume: 1320 },
  { hour: '20:00', avgDba: 68.4, peakDba: 79.1, trafficVolume: 740 },
  { hour: '22:00', avgDba: 58.9, peakDba: 71.0, trafficVolume: 380 }
];

export const districtAcousticProfiles = [
  { id: 'DIST-01', districtName: 'Central Business District', activeSensors: 42, avgDba: 71.8, peakViolationCount: 14, primaryCategory: 'Commercial' },
  { id: 'DIST-02', districtName: 'Harbor Industrial Park', activeSensors: 28, avgDba: 79.4, peakViolationCount: 26, primaryCategory: 'Industrial' },
  { id: 'DIST-03', districtName: 'Northside Medical Center', activeSensors: 18, avgDba: 46.2, peakViolationCount: 2, primaryCategory: 'Healthcare' },
  { id: 'DIST-04', districtName: 'West End Residential', activeSensors: 35, avgDba: 52.4, peakViolationCount: 5, primaryCategory: 'Residential' },
  { id: 'DIST-05', districtName: 'Tech University Campus', activeSensors: 22, avgDba: 54.1, peakViolationCount: 4, primaryCategory: 'Academic' },
  { id: 'DIST-06', districtName: 'Eastern Rail & Freight Yard', activeSensors: 19, avgDba: 83.6, peakViolationCount: 31, primaryCategory: 'Transport' }
];

export const acousticMitigationData = {
  sources: NOISE_SOURCES,
  zones: NOISE_ZONES,
  goals: NOISE_MITIGATION_GOALS,
  routes: noiseTelemetryRoutes,
  hourlyTrends: hourlyAcousticTrends,
  districtProfiles: districtAcousticProfiles
};

export function generateNoiseComparison(sourceId, distanceMeters = 10) {
  const source = NOISE_SOURCES.find((s) => s.id === sourceId) || NOISE_SOURCES[0];
  
  // Inverse square law decay approximation: dBA_d = dBA_ref - 20 * log10(d / d0)
  const distanceFactor = 20 * Math.log10(Math.max(1, distanceMeters / 5));
  const estimatedDbaAtDistance = Math.max(30, parseFloat((source.avgDba - distanceFactor).toFixed(1)));
  const estimatedPeakAtDistance = Math.max(35, parseFloat((source.maxDba - distanceFactor).toFixed(1)));

  return {
    source,
    distanceMeters,
    estimatedDbaAtDistance,
    estimatedPeakAtDistance,
    isWhoExceeded: estimatedDbaAtDistance > 55,
    recommendedBufferMeters: Math.ceil(5 * Math.pow(10, (source.avgDba - 55) / 20))
  };
}
