/**
 * @fileoverview Frontend service layer for fetching forecast data and attribution metrics.
 *
 * The transport moved to `./apiClient` in #1075.
 */

import { apiRequest } from './apiClient';

/**
 * Fetches the AI-powered AQI forecast and source attribution for a specific location.
 *
 * @param {number} lat - Latitude of the location.
 * @param {number} lng - Longitude of the location.
 * @param {number} [days] - Number of days to forecast (default 3).
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../types/forecast').ForecastResponse>}
 */
export const fetchAqiForecast = (lat, lng, days = 3, signal) =>
  apiRequest({
    path: ['forecast', 'aqi'],
    query: { lat, lng, days },
    auth: true,
    errorMessage: 'Failed to fetch AQI forecast data.',
    signal,
  });

/**
 * Fetches historical attribution data to compare with current forecasts.
 *
 * `locationId` is a free-form string with no stated format, and was
 * interpolated into the query string unencoded.
 *
 * @param {string} locationId - Identifier for the location.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>}
 */
export const fetchHistoricalAttribution = (locationId, signal) =>
  apiRequest({
    path: ['forecast', 'attribution', 'history'],
    query: { locationId },
    errorMessage: 'Failed to fetch historical attribution data.',
    signal,
  });
