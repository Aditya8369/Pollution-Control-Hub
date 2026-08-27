/**
 * @fileoverview Type definitions for AI-Powered Pollution Source Attribution and Forecasting
 */

export type PollutionSource = 'VEHICULAR' | 'INDUSTRIAL' | 'BIOMASS' | 'CONSTRUCTION' | 'NATURAL';

export interface AttributionConfidence {
    source: PollutionSource;
    percentage: number;
    indicators: string[];
}

export interface HourlyForecast {
    hour: string;
    aqiMin: number;
    aqiMax: number;
    dominantPollutant: string;
}

export interface DailyForecast {
    date: string;
    avgAqi: number;
    maxAqi: number;
    minAqi: number;
    hourlyBreakdown: HourlyForecast[];
    attributions: AttributionConfidence[];
    healthAdvisory: string;
    confidenceScore: number;
}

export interface ForecastResponse {
    location: string;
    generatedAt: string;
    forecasts: DailyForecast[];
    modelVersion: string;
}
