/**
 * @fileoverview Frontend service to fetch and manage aggregated IoT telemetry state.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches recent telemetry data for a specific sensor.
 * @param {string} sensorId - The ID of the sensor.
 * @param {number} limit - Number of recent records to fetch.
 * @returns {Promise<Array>}
 */
export const fetchRecentTelemetry = async (sensorId, limit = 20) => {
    const response = await fetch(`${API_BASE}/iot/sensors/${sensorId}/telemetry?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch telemetry');
    return response.json();
};

/**
 * Fetches the status of all registered IoT sensors.
 * @returns {Promise<Array>}
 */
export const fetchSensorStatuses = async () => {
    const response = await fetch(`${API_BASE}/iot/sensors/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch sensor statuses');
    return response.json();
};
