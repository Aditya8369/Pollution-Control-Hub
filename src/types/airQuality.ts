/**
 * Shared type definitions for the air-quality / geocoding service layer.
 * Referenced from: airQualityService.ts, geocodingService.ts
 */

/** Pollutant concentration readings for a single point in time. Every field is
 * nullable: `null` means the hour had no value, distinct from `0` (measured zero). */
export interface PollutantMetrics {
    time?: string;
    pm2_5: number | null;
    pm10: number | null;
    carbon_monoxide: number | null;
    nitrogen_dioxide: number | null;
    sulfur_dioxide?: number | null;
    ozone: number | null;
    us_aqi: number | null;
}

/** A single grid/hotspot sample point returned by fetchLocalGrid. */
export interface GridPoint {
    id: string;
    lat: number;
    lon: number;
    aqi: number;
    areaName: string;
    pollutants: {
        pm2_5: number | null;
        pm10: number | null;
        nitrogen_dioxide: number | null;
        ozone: number | null;
        carbon_monoxide: number | null;
    };
}

/** One entry in the 24h trend series (subset of PollutantMetrics used for charts). */
export interface TrendPoint {
    time: string;
    pm2_5: number | null;
    pm10: number | null;
    us_aqi: number | null;
}

/** Full result payload returned by fetchAirQualityByCoords. */
export interface AQIData {
    current: PollutantMetrics;
    trend: TrendPoint[];
    nearbyPoints: GridPoint[];
    confidenceScore: 'High' | 'Medium' | 'Low';
    dataCompleteness: number;
    isCurrentHour: boolean;
    readingTime: string | null;
}

/** A geocoded place returned by geocodingService.searchLocations. */
export interface LocationResult {
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    lat: number;
    lon: number;
    displayName: string;
}

export interface AQIBand {
    label: string;
    color: string;
}

export interface Breakpoint {
    cLow: number;
    cHigh: number;
    iLow: number;
    iHigh: number;
}