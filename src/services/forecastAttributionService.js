/**
 * @fileoverview Frontend service layer for fetching forecast data and attribution metrics.
 */

import { apiClient } from './apiClient';

/**
 * Fetches the AI-powered AQI forecast and source attribution for a specific location.
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {number} days - Number of days to forecast (default 3).
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<import('../types/forecast').ForecastResponse>}
 */
export const fetchAqiForecast = (lat, lng, days = 3, signal) => {
    return apiClient(['forecast', 'aqi'], {
        method: 'GET',
        params: { lat, lng, days },
        signal,
        defaultError: 'Failed to fetch AQI forecast data.'
    });
};

/**
 * Fetches historical attribution data to compare with current forecasts.
 * @param {string} locationId - Identifier for the location.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Array>}
 */
export const fetchHistoricalAttribution = (locationId, signal) => {
    return apiClient(['forecast', 'attribution', 'history'], {
        method: 'GET',
        params: { locationId },
        signal,
        defaultError: 'Failed to fetch historical attribution data.'
    });
};
