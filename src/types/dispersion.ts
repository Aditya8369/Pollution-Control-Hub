/**
 * @fileoverview Type definitions for Advanced Pollutant Dispersion Modeling
 */

export interface WindMetrics {
    speed: number; // in m/s
    direction: number; // in degrees (0-360)
    directionCardinal: string; // e.g., 'N', 'NE', 'SW'
    atmosphericStability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Pasquill-Gifford stability classes
}

export interface PlumeCoordinate {
    lat: number;
    lng: number;
    concentration: number; // in µg/m³
    distanceFromSource: number; // in meters
}

export interface PointSource {
    id: string;
    name: string;
    type: 'INDUSTRIAL' | 'TRAFFIC' | 'POWER_PLANT' | 'OTHER';
    location: {
        lat: number;
        lng: number;
    };
    emissionRate: number; // g/s
    stackHeight: number; // meters
}

export interface DispersionRun {
    id: string;
    pointSourceId: string;
    timestamp: string;
    windMetrics: WindMetrics;
    plumeCoordinates: PlumeCoordinate[];
    maxDownwindConcentration: number;
    distanceToMaxConcentration: number;
}

export interface DispersionResponse {
    pointSources: PointSource[];
    activeRun: DispersionRun | null;
    metadata: {
        modelVersion: string;
        computedAt: string;
    };
}
