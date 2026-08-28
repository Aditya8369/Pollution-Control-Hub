/**
 * @fileoverview Frontend service for fetching challenges, updating user progress, and claiming rewards.
 */

import { apiClient } from './apiClient';

/**
 * Fetches all active challenges and the current user's progress.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<import('../types/challenge').ChallengeResponse>}
 */
export const fetchActiveChallenges = (signal) => {
    return apiClient(['challenges', 'active'], {
        method: 'GET',
        signal,
        defaultError: 'Failed to fetch active challenges.'
    });
};

/**
 * Joins a specific challenge for the current user.
 * @param {string} challengeId - The ID of the challenge to join.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const joinChallenge = (challengeId, signal) => {
    return apiClient(['challenges', challengeId, 'join'], {
        method: 'POST',
        signal,
        defaultError: 'Failed to join challenge.'
    });
};

/**
 * Claims the reward for a completed challenge.
 * @param {string} challengeId - The ID of the completed challenge.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const claimChallengeReward = (challengeId, signal) => {
    return apiClient(['challenges', challengeId, 'claim'], {
        method: 'POST',
        signal,
        defaultError: 'Failed to claim reward.'
    });
};
