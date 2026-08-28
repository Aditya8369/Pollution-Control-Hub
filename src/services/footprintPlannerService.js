/**
 * @fileoverview Frontend service for saving activity logs, fetching historical trends, and retrieving personalized plans.
 */

import { apiClient } from './apiClient';

/**
 * Logs a new carbon-emitting activity.
 * @param {Object} activityData - The activity details.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const logActivity = (activityData, signal) => {
    return apiClient(['footprint', 'activities'], {
        method: 'POST',
        body: activityData,
        signal,
        defaultError: 'Failed to log activity.'
    });
};

/**
 * Fetches the user's comprehensive footprint summary and reduction plan.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<import('../types/footprint').FootprintSummary>}
 */
export const fetchFootprintSummary = (signal) => {
    return apiClient(['footprint', 'summary'], {
        method: 'GET',
        signal,
        defaultError: 'Failed to fetch footprint summary.'
    });
};

/**
 * Toggles the completion status of a reduction step.
 * @param {string} stepId - The ID of the reduction step.
 * @param {boolean} isCompleted - The new completion status.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const updateReductionStep = (stepId, isCompleted, signal) => {
    return apiClient(['footprint', 'steps', stepId], {
        method: 'PATCH',
        body: { isCompleted },
        signal,
        defaultError: 'Failed to update reduction step.'
    });
};
