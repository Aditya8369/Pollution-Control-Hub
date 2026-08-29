/**
 * @fileoverview Frontend service for fetching meteorological data and calculated dispersion parameters.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches available point sources and the latest dispersion model run.
 * @param {string} [pointSourceId] - Optional ID to filter for a specific source.
 * @returns {Promise<import('../types/dispersion').DispersionResponse>}
 */
export const fetchDispersionData = async (pointSourceId) => {
    const url = pointSourceId
        ? `${API_BASE}/dispersion?pointSourceId=${pointSourceId}`
        : `${API_BASE}/dispersion`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch dispersion modeling data.');
    }

    return response.json();
};

/**
 * Triggers a new dispersion model computation for a specific point source.
 * @param {string} pointSourceId - The ID of the point source.
 * @returns {Promise<import('../types/dispersion').DispersionRun>}
 */
export const triggerDispersionRun = async (pointSourceId) => {
    const response = await fetch(`${API_BASE}/dispersion/compute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ pointSourceId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to trigger dispersion computation.');
    }

    return response.json();
};
