/**
 * @fileoverview Type definitions for Gamified Community Eco-Challenges
 */

export type ChallengeFrequency = 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
export type ChallengeCategory = 'REPORTING' | 'TRANSIT' | 'CONSERVATION' | 'EDUCATION';
export type RewardType = 'POINTS' | 'BADGE' | 'BOTH';

export interface Challenge {
    id: string;
    title: string;
    description: string;
    category: ChallengeCategory;
    frequency: ChallengeFrequency;
    targetValue: number;
    currentValue: number;
    unit: string;
    rewardType: RewardType;
    rewardValue: number;
    badgeName?: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export interface UserChallengeProgress {
    challengeId: string;
    userId: string;
    progress: number;
    isCompleted: boolean;
    completedAt?: string;
    rewardClaimed: boolean;
}

export interface ChallengeResponse {
    challenges: Challenge[];
    userProgress: Record<string, UserChallengeProgress>;
    totalPointsEarned: number;
}
