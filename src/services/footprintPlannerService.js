/**
 * @fileoverview Frontend service for saving activity logs, fetching historical trends, and retrieving personalized plans.
 *
 * The transport moved to `./apiClient` in #1075.
 */

import { apiRequest } from './apiClient';

/**
 * Logs a new carbon-emitting activity.
 *
 * @param {Object} activityData - The activity details.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const logActivity = (activityData, signal) =>
  apiRequest({
    path: ['footprint', 'activities'],
    method: 'POST',
    body: activityData,
    auth: true,
    errorMessage: 'Failed to log activity.',
    signal,
  });

/**
 * Fetches the user's comprehensive footprint summary and reduction plan.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../types/footprint').FootprintSummary>}
 */
export const fetchFootprintSummary = (signal) =>
  apiRequest({
    path: ['footprint', 'summary'],
    auth: true,
    errorMessage: 'Failed to fetch footprint summary.',
    signal,
  });

/**
 * Toggles the completion status of a reduction step.
 *
 * @param {string} stepId - The ID of the reduction step.
 * @param {boolean} isCompleted - The new completion status.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const updateReductionStep = (stepId, isCompleted, signal) =>
  apiRequest({
    path: ['footprint', 'steps', stepId],
    method: 'PATCH',
    body: { isCompleted },
    auth: true,
    errorMessage: 'Failed to update reduction step.',
    signal,
  });
