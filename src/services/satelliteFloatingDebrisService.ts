/**
 * Ocean Plastic Satellite Remote Sensing Telemetry & Spectral Index Utility
 * Processes satellite multispectral imagery to calculate Floating Debris Index (FDI)
 * and detect ocean surface plastic slicks.
 */

export interface SatelliteSpectralPayload {
  tileId: string;
  nirBandReflectance: number; // Near Infrared
  swirBandReflectance: number; // Short-Wave Infrared
  redBandReflectance: number;
}

export interface FloatingDebrisAnalysis {
  tileId: string;
  floatingDebrisIndexFDI: number;
  plasticSlickDetected: boolean;
  confidenceScore: number; // 0 - 100
  estimatedSlickAreaKm2: number;
}

/**
 * Computes Floating Debris Index (FDI) from multispectral band reflectance data.
 */
export function analyzeSatelliteFloatingDebrisIndex(payload: SatelliteSpectralPayload): FloatingDebrisAnalysis {
  const fdi = payload.nirBandReflectance - (payload.redBandReflectance + (payload.swirBandReflectance - payload.redBandReflectance) * 0.5);
  const fdiFormatted = parseFloat(fdi.toFixed(4));
  const isDetected = fdiFormatted > 0.02;

  return {
    tileId: payload.tileId,
    floatingDebrisIndexFDI: fdiFormatted,
    plasticSlickDetected: isDetected,
    confidenceScore: isDetected ? Math.min(100, Math.round(fdiFormatted * 1500)) : 10,
    estimatedSlickAreaKm2: isDetected ? parseFloat((fdiFormatted * 100).toFixed(2)) : 0,
  };
}
