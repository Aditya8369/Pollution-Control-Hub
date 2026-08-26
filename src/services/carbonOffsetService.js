/**
 * @fileoverview Service layer for fetching carbon offset projects and processing transactions.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches available carbon offset projects.
 * @returns {Promise<Array<OffsetProject>>}
 */
export const fetchOffsetProjects = async () => {
    const response = await fetch(`${API_BASE}/carbon-offset/projects`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch offset projects');
    return response.json();
};

/**
 * Processes a carbon offset purchase.
 * @param {string} projectId - The ID of the project to support.
 * @param {number} tons - The amount of tons to purchase.
 * @returns {Promise<OffsetTransaction>}
 */
export const purchaseCarbonOffset = async (projectId, tons) => {
    const response = await fetch(`${API_BASE}/carbon-offset/purchase`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ projectId, tons }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Transaction failed');
    }
    return response.json();
};

/**
 * Fetches the current user's carbon offset portfolio.
 * @returns {Promise<UserCarbonPortfolio>}
 */
export const fetchUserPortfolio = async () => {
    const response = await fetch(`${API_BASE}/carbon-offset/portfolio`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });
    if (!response.ok) throw new Error('Failed to fetch portfolio');
    return response.json();
};
