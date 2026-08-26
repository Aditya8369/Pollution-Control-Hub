/**
 * @fileoverview Frontend service for fetching challenges, updating user progress, and claiming rewards.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches all active challenges and the current user's progress.
 * @returns {Promise<import('../types/challenge').ChallengeResponse>}
 */
export const fetchActiveChallenges = async () => {
    const response = await fetch(`${API_BASE}/challenges/active`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch active challenges.');
    }

    return response.json();
};

/**
 * Joins a specific challenge for the current user.
 * @param {string} challengeId - The ID of the challenge to join.
 * @returns {Promise<Object>}
 */
export const joinChallenge = async (challengeId) => {
    const response = await fetch(`${API_BASE}/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to join challenge.');
    }

    return response.json();
};

/**
 * Claims the reward for a completed challenge.
 * @param {string} challengeId - The ID of the completed challenge.
 * @returns {Promise<Object>}
 */
export const claimChallengeReward = async (challengeId) => {
    const response = await fetch(`${API_BASE}/challenges/${challengeId}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to claim reward.');
    }

    return response.json();
};
