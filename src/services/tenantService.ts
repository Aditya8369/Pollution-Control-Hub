// src/services/tenantService.ts
//
// Scopes IndexedDB and API requests by tenant_id (Issue #759).

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
