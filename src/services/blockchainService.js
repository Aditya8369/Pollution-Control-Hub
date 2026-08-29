/**
 * @fileoverview Frontend service layer for interacting with the carbon credit ledger API.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches the current user's credit balance and recent transaction history.
 * @returns {Promise<Object>}
 */
export const fetchLedgerData = async () => {
    const response = await fetch(`${API_BASE}/carbon-credits/ledger`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch ledger data.');
    }
    return response.json();
};

/**
 * Executes a trade order to transfer carbon credits to another user.
 * @param {import('../types/carbonCredit').TradeOrder} order - The trade details.
 * @returns {Promise<Object>}
 */
export const executeTrade = async (order) => {
    const response = await fetch(`${API_BASE}/carbon-credits/trade`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(order),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Trade execution failed.');
    }
    return response.json();
};

/**
 * Verifies the integrity of the entire blockchain ledger.
 * @returns {Promise<boolean>}
 */
export const verifyLedgerIntegrity = async () => {
    const response = await fetch(`${API_BASE}/carbon-credits/verify`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Ledger verification failed.');
    }
    const data = await response.json();
    return data.isValid;
};
