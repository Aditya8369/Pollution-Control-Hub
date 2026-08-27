/**
 * @fileoverview Type definitions for Hyperlocal Microclimate and Urban Heat Island (UHI) Mapping
 */

export interface GridCoordinate {
    lat: number;
    lng: number;
}

export interface MicroclimateDataPoint {
    id: string;
    coordinate: GridCoordinate;
    temperature: number;
    humidity: number;
    landCoverType: 'URBAN' | 'VEGETATION' | 'WATER' | 'BARREN';
    uhiSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    timestamp: string;
}

export interface MicroclimateZone {
    id: string;
    name: string;
    centerCoordinate: GridCoordinate;
    radiusMeters: number;
    avgTemperatureDiff: number;
    healthAdvisory: string;
    isSavedByUser: boolean;
}

export interface MicroclimateResponse {
    gridData: MicroclimateDataPoint[];
    savedZones: MicroclimateZone[];
    metadata: {
        resolution: string;
        dataSource: string;
        lastUpdated: string;
    };
}
