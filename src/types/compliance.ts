/**
 * @fileoverview Type definitions for Regulatory Compliance Reporting
 */

export type RegulatoryStandard = 'CPCB' | 'EPA' | 'WHO';

export interface ComplianceThreshold {
    standard: RegulatoryStandard;
    pollutant: 'PM25' | 'PM10' | 'NO2' | 'O3' | 'CO';
    limit: number;
    unit: string;
    averagingTime: '24h' | '1h' | 'Annual';
}

export interface Exceedance {
    id: string;
    timestamp: string;
    pollutant: string;
    recordedValue: number;
    threshold: number;
    standard: RegulatoryStandard;
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
}

export interface ComplianceReport {
    id: string;
    generatedAt: string;
    startDate: string;
    endDate: string;
    standard: RegulatoryStandard;
    totalExceedances: number;
    exceedances: Exceedance[];
    summary: string;
}
