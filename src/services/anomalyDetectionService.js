/**
 * @fileoverview Frontend service for fetching anomaly reports and managing sensor isolation states.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches recent anomaly events and current sensor isolation states.
 * @returns {Promise<Object>}
 */
export const fetchAnomalyData = async () => {
    const response = await fetch(`${API_BASE}/anomalies/dashboard`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch anomaly data.');
    }
    return response.json();
};

/**
 * Manually overrides the isolation state of a specific sensor.
 * @param {string} sensorId - The ID of the sensor.
 * @param {import('../types/anomaly').IsolationState} state - The new state.
 * @param {string} reason - The reason for the override.
 * @returns {Promise<Object>}
 */
export const overrideSensorState = async (sensorId, state, reason) => {
    const response = await fetch(`${API_BASE}/anomalies/isolate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ sensorId, state, reason }),
    });

    if (!response.ok) {
        throw new Error('Failed to update sensor state.');
    }
    return response.json();
};

/**
 * Acknowledges an anomaly event to prevent repeated alerts.
 * @param {string} anomalyId - The ID of the anomaly event.
 * @returns {Promise<void>}
 */
export const acknowledgeAnomaly = async (anomalyId) => {
    const response = await fetch(`${API_BASE}/anomalies/${anomalyId}/acknowledge`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to acknowledge anomaly.');
    }
};
