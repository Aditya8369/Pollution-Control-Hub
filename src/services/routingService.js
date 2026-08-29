/**
 * @fileoverview Frontend service for requesting route alternatives and their associated pollution exposure scores.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Requests route alternatives with AQI exposure scoring.
 * @param {import('../types/routing').RoutingRequest} request - The routing parameters.
 * @returns {Promise<import('../types/routing').RoutingResponse>}
 */
export const fetchRouteAlternatives = async (request) => {
    const response = await fetch(`${API_BASE}/routing/alternatives`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch route alternatives.');
    }

    return response.json();
};

/**
 * Fetches cached route exposure data if available.
 * @param {string} routeHash - A unique hash representing the start/end points.
 * @returns {Promise<import('../types/routing').RoutingResponse | null>}
 */
export const fetchCachedRoute = async (routeHash) => {
    const response = await fetch(`${API_BASE}/routing/cache/${routeHash}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Failed to fetch cached route.');
    }

    return response.json();
};
