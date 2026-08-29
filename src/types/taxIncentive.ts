/**
 * @fileoverview Type definitions for Dynamic Pollution Tax and Incentive Calculation Engine
 */

export interface TaxRule {
    id: string;
    name: string;
    pollutant: string;
    ratePerTon: number;
    thresholdTons: number;
    isActive: boolean;
}

export interface IncentiveRule {
    id: string;
    name: string;
    category: 'RENEWABLE_ENERGY' | 'EV_TRANSIT' | 'EMISSION_REDUCTION';
    multiplier: number; // e.g., 1.5 for 50% bonus
    maxCap: number;
    isActive: boolean;
}

export interface SimulationParameters {
    taxRules: TaxRule[];
    incentiveRules: IncentiveRule[];
    baselineEmissions: number; // Total tons
    projectedReductionPercentage: number; // 0-100
}

export interface ProjectionResult {
    totalTaxRevenue: number;
    netEmissionsAfterReduction: number;
    totalIncentivesDistributed: number;
    financialImpactOnIndustries: number;
    environmentalBenefitScore: number;
}
