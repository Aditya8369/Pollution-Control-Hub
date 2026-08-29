/**
 * @fileoverview Type definitions for Crowdsourced Low-Cost Sensor Calibration and Drift Correction
 */

export interface CalibrationEvent {
    id: string;
    lowCostSensorId: string;
    referenceSensorId: string;
    lowCostReading: number;
    referenceReading: number;
    pollutant: 'PM25' | 'PM10' | 'NO2' | 'O3';
    timestamp: string;
    submittedBy: string;
}

export interface CorrectionCoefficient {
    id: string;
    lowCostSensorId: string;
    pollutant: string;
    slope: number;
    intercept: number;
    rSquared: number;
    isActive: boolean;
    computedAt: string;
    validUntil: string;
}

export interface SensorAccuracyStatus {
    sensorId: string;
    sensorName: string;
    pollutant: string;
    rawAccuracy: number; // percentage
    calibratedAccuracy: number; // percentage
    lastCalibration: string;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_CALIBRATION' | 'OFFLINE';
}
