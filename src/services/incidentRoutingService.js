/**
 * @fileoverview Frontend service for fetching routed incidents and updating their lifecycle status.
 */

import { apiClient } from './apiClient';

/**
 * Fetches all routed incidents, optionally filtered by status or category.
 * @param {string} [status] - Optional status filter.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Array<import('../types/incidentRouting').RoutedIncident>>}
 */
export const fetchRoutedIncidents = (status, signal) => {
    return apiClient(['incidents', 'routed'], {
        method: 'GET',
        params: status ? { status } : {},
        signal,
        defaultError: 'Failed to fetch routed incidents.'
    });
};

/**
 * Updates the verification status and adds notes to an incident.
 * @param {string} incidentId - The ID of the incident.
 * @param {string} status - The new status.
 * @param {string} notes - Verification or resolution notes.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const updateIncidentStatus = (incidentId, status, notes, signal) => {
    return apiClient(['incidents', incidentId, 'status'], {
        method: 'PATCH',
        body: { status, notes },
        signal,
        defaultError: 'Failed to update incident status.'
    });
};
