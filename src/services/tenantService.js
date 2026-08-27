/**
 * @fileoverview Service layer for tenant workspace CRUD operations,
 * member management, and tenant-scoped local data.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TENANT_STORAGE_KEY = 'pch_tenant_id';

/**
 * Returns the current tenant ID from localStorage, or "default".
 *
 * @returns {string} Current tenant ID.
 */
export const getCurrentTenantId = () => {
    try {
        return localStorage.getItem(TENANT_STORAGE_KEY) || 'default';
    } catch {
        return 'default';
    }
};

/**
 * Returns a scoped IndexedDB database name for the current tenant.
 *
 * @param {string} baseName - Base database name.
 * @returns {string} Tenant-scoped database name.
 */
export const getTenantScopedDbName = (baseName) => {
    const tenantId = getCurrentTenantId();
    return `${baseName}__${tenantId}`;
};

/**
 * Returns a scoped object store name for the current tenant.
 *
 * @param {string} baseName - Base object store name.
 * @returns {string} Tenant-scoped object store name.
 */
export const getTenantScopedStoreName = (baseName) => {
    const tenantId = getCurrentTenantId();
    return `${baseName}__${tenantId}`;
};

/**
 * Returns a scoped cache key for the current tenant.
 *
 * @param {string} key - Base cache key.
 * @returns {string} Tenant-scoped cache key.
 */
export const getTenantScopedKey = (key) => {
    const tenantId = getCurrentTenantId();
    return `${tenantId}:${key}`;
};

/**
 * Appends tenant_id as a query parameter to an API URL.
 *
 * @param {string} url - API URL.
 * @returns {string} Tenant-scoped API URL.
 */
export const scopeApiUrl = (url) => {
    const tenantId = getCurrentTenantId();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tenant_id=${encodeURIComponent(tenantId)}`;
};

/**
 * Fetches all tenants associated with the current authenticated user.
 *
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
 *
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
 *
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
        throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
        );
    }

    return response.json();
};

/**
 * Removes a member from a tenant workspace.
 *
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} memberId - The ID of the membership record to remove.
 * @returns {Promise<void>}
 */
export const removeTenantMember = async (tenantId, memberId) => {
    const response = await fetch(
        `${API_BASE}/tenants/${tenantId}/members/${memberId}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
};


const TENANT_STORAGE_KEY = "pch_tenant_id";

/**
 * Returns the current tenant ID from localStorage, or "default".
 */
export function getCurrentTenantId() {
  try {
    return localStorage.getItem(TENANT_STORAGE_KEY) || "default";
  } catch {
    return "default";
  }
}

/**
 * Returns a scoped IndexedDB database name for the current tenant.
 * Each tenant gets its own isolated IndexedDB database.
 */
export function getTenantScopedDbName(baseName) {
  const tenantId = getCurrentTenantId();
  return `${baseName}__${tenantId}`;
}

/**
 * Returns a scoped object store name for the current tenant.
 */
export function getTenantScopedStoreName(baseName) {
  const tenantId = getCurrentTenantId();
  return `${baseName}__${tenantId}`;
}

/**
 * Returns a scoped cache key for the current tenant.
 * Use this to prefix localStorage / sessionStorage keys.
 */
export function getTenantScopedKey(key) {
  const tenantId = getCurrentTenantId();
  return `${tenantId}:${key}`;
}

/**
 * Appends `tenant_id` as a query parameter to an API URL.
 */
export function scopeApiUrl(url) {
  const tenantId = getCurrentTenantId();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tenant_id=${encodeURIComponent(tenantId)}`;
}

