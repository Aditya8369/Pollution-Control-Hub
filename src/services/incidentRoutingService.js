/**
 * @fileoverview Frontend service for fetching routed incidents and updating their lifecycle status.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches all routed incidents, optionally filtered by status or category.
 * @param {string} [status] - Optional status filter.
 * @returns {Promise<Array<import('../types/incidentRouting').RoutedIncident>>}
 */
export const fetchRoutedIncidents = async (status) => {
    const url = status
        ? `${API_BASE}/incidents/routed?status=${status}`
        : `${API_BASE}/incidents/routed`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch routed incidents.');
    }

    return response.json();
};

/**
 * Updates the verification status and adds notes to an incident.
 * @param {string} incidentId - The ID of the incident.
 * @param {string} status - The new status.
 * @param {string} notes - Verification or resolution notes.
 * @returns {Promise<Object>}
 */
export const updateIncidentStatus = async (incidentId, status, notes) => {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status, notes }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update incident status.');
    }

    return response.json();
};
