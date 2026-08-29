/**
 * @fileoverview Service layer for fetching gridded temperature, humidity, and land-cover data.
 *
 * The transport moved to `./apiClient` in #1075. This was the one of the five
 * that already built its query with `URLSearchParams` rather than string
 * interpolation — that is now what all of them do.
 */

import { apiRequest } from './apiClient';

/**
 * Fetches hyperlocal microclimate and UHI data for a specific bounding box.
 *
 * @param {number} north - Northern latitude bound.
 * @param {number} south - Southern latitude bound.
 * @param {number} east - Eastern longitude bound.
 * @param {number} west - Western longitude bound.
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../types/microclimate').MicroclimateResponse>}
 */
export const fetchMicroclimateData = (north, south, east, west, signal) =>
  apiRequest({
    path: ['microclimate', 'grid'],
    query: { north, south, east, west },
    errorMessage: 'Failed to fetch microclimate grid data.',
    signal,
  });

/**
 * Saves a microclimate zone for the current user.
 *
 * @param {Object} zoneData - The zone data to save.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const saveMicroclimateZone = (zoneData, signal) =>
  apiRequest({
    path: ['microclimate', 'zones'],
    method: 'POST',
    body: zoneData,
    auth: true,
    errorMessage: 'Failed to save microclimate zone.',
    signal,
  });
