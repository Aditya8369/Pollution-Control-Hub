/**
 * @fileoverview Frontend service layer for fetching forecast data and attribution metrics.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches the AI-powered AQI forecast and source attribution for a specific location.
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {number} days - Number of days to forecast (default 3).
 * @returns {Promise<import('../types/forecast').ForecastResponse>}
 */
export const fetchAqiForecast = async (lat, lng, days = 3) => {
    const response = await fetch(
        `${API_BASE}/forecast/aqi?lat=${lat}&lng=${lng}&days=${days}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch AQI forecast data.');
    }

    return response.json();
};

/**
 * Fetches historical attribution data to compare with current forecasts.
 * @param {string} locationId - Identifier for the location.
 * @returns {Promise<Array>}
 */
export const fetchHistoricalAttribution = async (locationId) => {
    const response = await fetch(`${API_BASE}/forecast/attribution/history?locationId=${locationId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch historical attribution data.');
    }

    return response.json();
};
