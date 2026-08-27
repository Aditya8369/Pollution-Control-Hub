// src/services/tenantService.ts
//
// Scopes IndexedDB and API requests by tenant_id (Issue #759) and provides
// service layer for tenant workspace CRUD operations and member management.

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api';
const TENANT_STORAGE_KEY = "pch_tenant_id";

/**
 * Returns the current tenant ID from localStorage, or "default".
 */
export function getCurrentTenantId(): string {
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
export function getTenantScopedDbName(baseName: string): string {
  const tenantId = getCurrentTenantId();
  return `${baseName}__${tenantId}`;
}

/**
 * Returns a scoped object store name for the current tenant.
 */
export function getTenantScopedStoreName(baseName: string): string {
  const tenantId = getCurrentTenantId();
  return `${baseName}__${tenantId}`;
}

/**
 * Returns a scoped cache key for the current tenant.
 * Use this to prefix localStorage / sessionStorage keys.
 */
export function getTenantScopedKey(key: string): string {
  const tenantId = getCurrentTenantId();
  return `${tenantId}:${key}`;
}

/**
 * Appends `tenant_id` as a query parameter to an API URL.
 */
export function scopeApiUrl(url: string): string {
  const tenantId = getCurrentTenantId();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tenant_id=${encodeURIComponent(tenantId)}`;
}

/**
 * Fetches all tenants associated with the current authenticated user.
 */
export const fetchUserTenants = async (): Promise<any[]> => {
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
 */
export const updateTenantSettings = async (tenantId: string, settings: any): Promise<any> => {
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
 */
export const inviteTenantMember = async (tenantId: string, email: string, role: string): Promise<any> => {
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
 */
export const removeTenantMember = async (tenantId: string, memberId: string): Promise<void> => {
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
