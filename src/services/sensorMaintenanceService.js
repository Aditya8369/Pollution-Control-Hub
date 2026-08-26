/**
 * @fileoverview Frontend service for fetching health metrics and acknowledging maintenance alerts.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches health metrics and unacknowledged alerts for a sensor.
 * @param {string} sensorId - The ID of the sensor.
 * @returns {Promise<Object>}
 */
export const fetchHealthMetrics = async (sensorId) => {
    const response = await fetch(`${API_BASE}/maintenance/sensors/${sensorId}/health`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });
    if (!response.ok) throw new Error('Failed to fetch health metrics');
    return response.json();
};

/**
 * Acknowledges a maintenance alert and adds resolution notes.
 * @param {string} alertId - The ID of the alert.
 * @param {string} notes - Resolution notes.
 * @returns {Promise<Object>}
 */
export const acknowledgeAlert = async (alertId, notes) => {
    const response = await fetch(`${API_BASE}/maintenance/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error('Failed to acknowledge alert');
    return response.json();
};
