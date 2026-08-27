/**
 * @fileoverview Frontend service for saving activity logs, fetching historical trends, and retrieving personalized plans.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Logs a new carbon-emitting activity.
 * @param {Object} activityData - The activity details.
 * @returns {Promise<Object>}
 */
export const logActivity = async (activityData) => {
    const response = await fetch(`${API_BASE}/footprint/activities`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(activityData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to log activity.');
    }

    return response.json();
};

/**
 * Fetches the user's comprehensive footprint summary and reduction plan.
 * @returns {Promise<import('../types/footprint').FootprintSummary>}
 */
export const fetchFootprintSummary = async () => {
    const response = await fetch(`${API_BASE}/footprint/summary`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch footprint summary.');
    }

    return response.json();
};

/**
 * Toggles the completion status of a reduction step.
 * @param {string} stepId - The ID of the reduction step.
 * @param {boolean} isCompleted - The new completion status.
 * @returns {Promise<Object>}
 */
export const updateReductionStep = async (stepId, isCompleted) => {
    const response = await fetch(`${API_BASE}/footprint/steps/${stepId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isCompleted }),
    });

    if (!response.ok) {
        throw new Error('Failed to update reduction step.');
    }

    return response.json();
};
