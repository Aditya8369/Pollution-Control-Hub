/**
 * @fileoverview Type definitions for Automated Anomaly Detection and Sensor Fault Isolation
 */

export type AnomalyType = 'SPIKE' | 'DROPOUT' | 'FLATLINE' | 'Z_SCORE_OUTLIER';
export type IsolationState = 'ACTIVE' | 'ISOLATED' | 'MAINTENANCE';

export interface AnomalyEvent {
    id: string;
    sensorId: string;
    type: AnomalyType;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    detectedAt: string;
    metricValue: number;
    expectedRange: { min: number; max: number };
    isAcknowledged: boolean;
}

export interface SensorIsolation {
    sensorId: string;
    state: IsolationState;
    reason: string;
    isolatedAt: string;
    isolatedBy?: string;
}

export interface AnomalyResponse {
    anomalyEvents: AnomalyEvent[];
    sensorIsolations: SensorIsolation[];
    metadata: {
        modelVersion: string;
        computedAt: string;
    };
}
