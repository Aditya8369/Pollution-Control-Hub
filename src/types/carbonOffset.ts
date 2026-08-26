/**
 * @fileoverview Type definitions for Carbon Offset Marketplace
 */

export interface OffsetProject {
    id: string;
    name: string;
    description: string;
    location: string;
    type: 'REFORESTATION' | 'RENEWABLE_ENERGY' | 'COMMUNITY' | 'TECHNOLOGY';
    pricePerTon: number;
    availableTons: number;
    certification: 'GOLD_STANDARD' | 'VERIFIED_CARBON_STANDARD' | 'OTHER';
    impactMetrics: {
        treesPlanted?: number;
        co2Reduced: number;
        communityBenefit: string;
    };
    imageUrl?: string;
}

export interface OffsetTransaction {
    id: string;
    userId: string;
    projectId: string;
    projectName: string;
    tonsPurchased: number;
    totalCost: number;
    currency: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
}

export interface UserCarbonPortfolio {
    totalOffsetTons: number;
    activeProjects: string[];
    recentTransactions: OffsetTransaction[];
}
