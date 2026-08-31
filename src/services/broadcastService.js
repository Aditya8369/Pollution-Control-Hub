/**
 * @fileoverview Frontend service for triggering broadcasts and managing subscriber preferences.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Triggers a new broadcast campaign.
 * @param {Object} campaignData - The campaign details.
 * @returns {Promise<Object>}
 */
export const triggerBroadcast = async (campaignData) => {
    const response = await fetch(`${API_BASE}/broadcast/campaigns`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to trigger broadcast.');
    }
    return response.json();
};

/**
 * Fetches analytics and delivery logs for a specific campaign.
 * @param {string} campaignId - The ID of the campaign.
 * @returns {Promise<Object>}
 */
export const fetchCampaignAnalytics = async (campaignId) => {
    const response = await fetch(`${API_BASE}/broadcast/campaigns/${campaignId}/analytics`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch campaign analytics.');
    }
    return response.json();
};

/**
 * Fetches all recent broadcast campaigns.
 * @returns {Promise<Array>}
 */
export const fetchRecentCampaigns = async () => {
    const response = await fetch(`${API_BASE}/broadcast/campaigns`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch recent campaigns.');
    }
    return response.json();
};
