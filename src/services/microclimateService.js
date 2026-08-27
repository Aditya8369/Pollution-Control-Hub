/**
 * @fileoverview Service layer for fetching gridded temperature, humidity, and land-cover data.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches hyperlocal microclimate and UHI data for a specific bounding box.
 * @param {number} north - Northern latitude bound.
 * @param {number} south - Southern latitude bound.
 * @param {number} east - Eastern longitude bound.
 * @param {number} west - Western longitude bound.
 * @returns {Promise<import('../types/microclimate').MicroclimateResponse>}
 */
export const fetchMicroclimateData = async (north, south, east, west) => {
    const queryParams = new URLSearchParams({ north, south, east, west });
    const response = await fetch(`${API_BASE}/microclimate/grid?${queryParams}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch microclimate grid data.');
    }

    return response.json();
};

/**
 * Saves a microclimate zone for the current user.
 * @param {Object} zoneData - The zone data to save.
 * @returns {Promise<Object>}
 */
export const saveMicroclimateZone = async (zoneData) => {
    const response = await fetch(`${API_BASE}/microclimate/zones`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(zoneData),
    });

    if (!response.ok) {
        throw new Error('Failed to save microclimate zone.');
    }

    return response.json();
};
