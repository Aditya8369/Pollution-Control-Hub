/**
 * @fileoverview Frontend service for uploading reference data pairs and fetching applied correction coefficients.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Submits a new co-located calibration reading pair.
 * @param {import('../types/calibration').CalibrationEvent} eventData - The calibration data.
 * @returns {Promise<Object>}
 */
export const submitCalibrationReading = async (eventData) => {
    const response = await fetch(`${API_BASE}/calibration/readings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit calibration reading.');
    }

    return response.json();
};

/**
 * Fetches active correction coefficients and accuracy status for sensors.
 * @returns {Promise<Object>}
 */
export const fetchCalibrationStatus = async () => {
    const response = await fetch(`${API_BASE}/calibration/status`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch calibration status.');
    }

    return response.json();
};

/**
 * Toggles the active state of a correction coefficient.
 * @param {string} coefficientId - The ID of the coefficient.
 * @param {boolean} isActive - The new active state.
 * @returns {Promise<Object>}
 */
export const toggleCorrectionFactor = async (coefficientId, isActive) => {
    const response = await fetch(`${API_BASE}/calibration/factors/${coefficientId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
        throw new Error('Failed to update correction factor.');
    }

    return response.json();
};
