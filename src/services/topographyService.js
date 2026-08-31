/**
 * @fileoverview Frontend service for fetching gridded 3D spatial pollution data and elevation models.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches the 3D topographical pollution grid for a specific bounding box.
 * @param {Object} bounds - The geographic bounds {north, south, east, west}.
 * @returns {Promise<import('../types/topography').InterpolationResult>}
 */
export const fetch3DGrid = async (bounds) => {
    const queryParams = new URLSearchParams(bounds);
    const response = await fetch(`${API_BASE}/topography/3d-grid?${queryParams}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch 3D topography grid.');
    }
    return response.json();
};
