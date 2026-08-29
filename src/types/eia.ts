/**
 * @fileoverview Type definitions for Automated Environmental Impact Assessment (EIA) Baseline Report Generator
 */

export type PollutantType = 'PM25' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'O3';

export interface EiaProjectRequest {
    projectName: string;
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
    durationMonths: number;
    targetPollutants: PollutantType[];
}

export interface PollutantStatistic {
    pollutant: PollutantType;
    unit: string;
    mean: number;
    max: number;
    percentile98: number;
    regulatoryLimit: number;
    isCompliant: boolean;
    exceedanceDays: number;
}

export interface EiaBaselineSummary {
    projectId: string;
    projectName: string;
    location: {
        lat: number;
        lng: number;
        radiusMeters: number;
    };
    assessmentPeriod: {
        startDate: string;
        endDate: string;
    };
    statistics: PollutantStatistic[];
    overallComplianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'MARGINAL';
    generatedAt: string;
}

export interface EiaReportRecord {
    id: string;
    projectName: string;
    summary: EiaBaselineSummary;
    status: 'GENERATING' | 'COMPLETED' | 'FAILED';
    downloadUrl?: string;
    createdAt: string;
}
