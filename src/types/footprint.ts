/**
 * @fileoverview Type definitions for Personalized Carbon Footprint Tracker and Reduction Planner
 */

export type ActivityCategory = 'COMMUTE' | 'ENERGY' | 'DIET' | 'SHOPPING' | 'TRAVEL';

export interface EmissionFactor {
    category: ActivityCategory;
    subcategory: string;
    unit: string;
    kgCo2PerUnit: number;
}

export interface ActivityLog {
    id: string;
    userId: string;
    category: ActivityCategory;
    subcategory: string;
    quantity: number;
    date: string;
    estimatedEmissions: number;
}

export interface ReductionStep {
    id: string;
    title: string;
    description: string;
    category: ActivityCategory;
    potentialSavingsKg: number;
    difficulty: 'EASY' | 'MODERATE' | 'HARD';
    isCompleted: boolean;
}

export interface FootprintSummary {
    totalEmissions: number;
    monthlyBreakdown: { month: string; emissions: number }[];
    categoryBreakdown: { category: ActivityCategory; emissions: number; percentage: number }[];
    activeReductionSteps: ReductionStep[];
    projectedAnnualSavings: number;
}
