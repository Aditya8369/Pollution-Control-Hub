/**
 * @fileoverview Frontend service for fetching challenges, updating user progress, and claiming rewards.
 *
 * The transport moved to `./apiClient` in #1075 — this file had its own copy of
 * it, as did four sibling services, and the copies disagreed. The signatures are
 * unchanged; each function gained an optional `signal`.
 */

import { apiRequest } from './apiClient';

/**
 * Fetches all active challenges and the current user's progress.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../types/challenge').ChallengeResponse>}
 */
export const fetchActiveChallenges = (signal) =>
  apiRequest({
    path: ['challenges', 'active'],
    auth: true,
    // Was a fixed string that discarded the server's message; the routes send a
    // real reason and `EcoChallengeDashboard` shows it to the visitor.
    errorMessage: 'Failed to fetch active challenges.',
    signal,
  });

/**
 * Joins a specific challenge for the current user.
 *
 * @param {string} challengeId - The ID of the challenge to join.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const joinChallenge = (challengeId, signal) =>
  apiRequest({
    path: ['challenges', challengeId, 'join'],
    method: 'POST',
    auth: true,
    errorMessage: 'Failed to join challenge.',
    signal,
  });

/**
 * Claims the reward for a completed challenge.
 *
 * @param {string} challengeId - The ID of the completed challenge.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const claimChallengeReward = (challengeId, signal) =>
  apiRequest({
    path: ['challenges', challengeId, 'claim'],
    method: 'POST',
    auth: true,
    errorMessage: 'Failed to claim reward.',
    signal,
  });
