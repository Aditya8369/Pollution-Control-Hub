/**
 * @fileoverview Service layer for tenant workspace CRUD operations and member management.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetches all tenants associated with the current authenticated user.
 * @returns {Promise<Array>} List of tenant objects.
 */
export const fetchUserTenants = async () => {
    const response = await fetch(`${API_BASE}/tenants`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

/**
 * Updates the settings of a specific tenant.
 * @param {string} tenantId - The ID of the tenant to update.
 * @param {Object} settings - The new settings object.
 * @returns {Promise<Object>} The updated tenant object.
 */
export const updateTenantSettings = async (tenantId, settings) => {
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/settings`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ settings }),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

/**
 * Invites a new member to a specific tenant workspace.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} email - The email address of the user to invite.
 * @param {string} role - The role to assign ('ADMIN', 'MANAGER', 'MEMBER').
 * @returns {Promise<Object>} The created tenant member record.
 */
export const inviteTenantMember = async (tenantId, email, role) => {
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/members`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email, role }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

/**
 * Removes a member from a tenant workspace.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} memberId - The ID of the membership record to remove.
 * @returns {Promise<void>}
 */
export const removeTenantMember = async (tenantId, memberId) => {
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
};
