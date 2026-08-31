/**
 * @fileoverview Type definitions for Interactive 3D Urban Pollution Topography and Heatmap
 */

export interface GridPoint3D {
    lat: number;
    lng: number;
    elevation: number; // meters above sea level
    aqiValue: number;
    dominantPollutant: string;
}

export interface TopographyMetadata {
    resolution: number; // grid size in meters
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    lastUpdated: string;
}

export interface InterpolationResult {
    gridData: GridPoint3D[];
    metadata: TopographyMetadata;
}
