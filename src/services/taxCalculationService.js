/**
 * @fileoverview Frontend service for submitting simulation parameters and fetching projected outcome data.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches the current active tax and incentive rules.
 * @returns {Promise<Object>}
 */
export const fetchActiveRules = async () => {
    const response = await fetch(`${API_BASE}/tax-engine/rules`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch tax and incentive rules.');
    }
    return response.json();
};

/**
 * Runs a simulation with the provided parameters.
 * @param {import('../types/taxIncentive').SimulationParameters} params 
 * @returns {Promise<import('../types/taxIncentive').ProjectionResult>}
 */
export const runSimulation = async (params) => {
    const response = await fetch(`${API_BASE}/tax-engine/simulate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Simulation failed.');
    }
    return response.json();
};
