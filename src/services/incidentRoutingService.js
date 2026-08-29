/**
 * @fileoverview Frontend service for fetching routed incidents and updating their lifecycle status.
 *
 * The transport moved to `./apiClient` in #1075.
 */

import { apiRequest } from './apiClient';

/**
 * Fetches all routed incidents, optionally filtered by status or category.
 *
 * `status` used to be interpolated into the query string unencoded. It comes
 * from a `<select>` today, but it is a public parameter with nothing enforcing
 * that, and an explicit `undefined` produced `?status=undefined`.
 *
 * @param {string} [status] - Optional status filter.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<import('../types/incidentRouting').RoutedIncident>>}
 */
export const fetchRoutedIncidents = (status, signal) =>
  apiRequest({
    path: ['incidents', 'routed'],
    query: { status },
    auth: true,
    errorMessage: 'Failed to fetch routed incidents.',
    signal,
  });

/**
 * Updates the verification status and adds notes to an incident.
 *
 * @param {string} incidentId - The ID of the incident.
 * @param {string} status - The new status.
 * @param {string} notes - Verification or resolution notes.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const updateIncidentStatus = (incidentId, status, notes, signal) =>
  apiRequest({
    path: ['incidents', incidentId, 'status'],
    method: 'PATCH',
    body: { status, notes },
    auth: true,
    errorMessage: 'Failed to update incident status.',
    signal,
  });
