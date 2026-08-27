// src/types/pollutionTypes.ts

export interface Segment {
    id: string;
    startPoint: string;
    endPoint: string;
    aqi: number;
    pollutantMain: string;
    distanceKm: number;
}

export interface Route {
    id: string;
    routeName: string;
    totalDistanceKm: number;
    averageAqi: number;
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
    segments: Segment[];
    createdAt: string;
}

export interface SavedLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    currentAqi: number;
}
