/**
 * @fileoverview Type definitions for Real-Time Low-AQI Pedestrian and Cycling Route Planner
 */

export interface RouteSegment {
    lat: number;
    lng: number;
    distanceMeters: number;
    aqiValue: number;
    dominantPollutant: string;
}

export interface RouteAlternative {
    id: string;
    name: string; // e.g., "Cleanest Air Route", "Shortest Distance"
    totalDistanceMeters: number;
    estimatedDurationMinutes: number;
    totalAqiExposureScore: number; // Lower is better
    averageAqi: number;
    segments: RouteSegment[];
    polyline: [number, number][];
}

export interface RoutingRequest {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    mode: 'PEDESTRIAN' | 'CYCLING';
}

export interface RoutingResponse {
    alternatives: RouteAlternative[];
    metadata: {
        computedAt: string;
        dataSource: string;
    };
}
