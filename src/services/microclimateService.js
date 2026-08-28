/**
 * @fileoverview Service layer for fetching gridded temperature, humidity, and land-cover data.
 */

import { apiClient } from './apiClient';

/**
 * Fetches hyperlocal microclimate and UHI data for a specific bounding box.
 * @param {number} north - Northern latitude bound.
 * @param {number} south - Southern latitude bound.
 * @param {number} east - Eastern longitude bound.
 * @param {number} west - Western longitude bound.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<import('../types/microclimate').MicroclimateResponse>}
 */
export const fetchMicroclimateData = (north, south, east, west, signal) => {
    return apiClient(['microclimate', 'grid'], {
        method: 'GET',
        params: { north, south, east, west },
        signal,
        defaultError: 'Failed to fetch microclimate grid data.'
    });
};

/**
 * Saves a microclimate zone for the current user.
 * @param {Object} zoneData - The zone data to save.
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Object>}
 */
export const saveMicroclimateZone = (zoneData, signal) => {
    return apiClient(['microclimate', 'zones'], {
        method: 'POST',
        body: zoneData,
        signal,
        defaultError: 'Failed to save microclimate zone.'
    });
};
