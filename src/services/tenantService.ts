// src/services/tenantService.ts
//
// The single module answering to `./tenantService`.
//
// This file previously held only the scoping helpers (#759). The workspace
// management work (#1031) added a second `tenantService.js` beside it holding
// the REST client, and the two collided: both satisfy the extensionless
// specifier `../services/tenantService`, Vite resolves `.js` before `.ts`, and
// `historicalDataService` — which imports `getTenantScopedDbName` at module
// scope — started throwing `TypeError: getTenantScopedDbName is not a function`
// before it had executed a single statement of its own.
//
// The two halves are not unrelated: both answer "which organisation is this
// request for", one for local storage and one for the API. They belong in one
// module, which is also what keeps `npm run check:shadowing` (a blocking step
// in CI, added for #990) green.

import type { Tenant, TenantMember, TenantSettings } from '../types/tenant';

const TENANT_STORAGE_KEY = 'pch_tenant_id';
const AUTH_TOKEN_KEY = 'token';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TenantChallengePayload {
  id?: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  unit?: string;
  rewardValue?: number;
  badgeName?: string | null;
  verificationType?: string;
  startDate?: string;
  endDate?: string;
  isGlobal?: boolean;
}

// ─── Local scoping (#759) ────────────────────────────────────────────────────

/**
 * Reads a key from localStorage, or null when storage is unusable.
 *
 * Every read here goes through this. A Firefox private window and a browser
 * configured to block site data both throw `SecurityError` on plain property
 * access, so an unguarded `localStorage.getItem` is not a missing value — it is
 * an exception thrown out of whichever render or module evaluation reached it.
 */
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The current tenant ID from localStorage, or "default".
 */
export function getCurrentTenantId(): string {
  return readStorage(TENANT_STORAGE_KEY) || 'default';
}

/**
 * A scoped IndexedDB database name for the current tenant.
 * Each tenant gets its own isolated IndexedDB database.
 */
export function getTenantScopedDbName(baseName: string): string {
  return `${baseName}__${getCurrentTenantId()}`;
}

/**
 * A scoped object store name for the current tenant.
 */
export function getTenantScopedStoreName(baseName: string): string {
  return `${baseName}__${getCurrentTenantId()}`;
}

/**
 * A scoped cache key for the current tenant.
 * Use this to prefix localStorage / sessionStorage keys.
 */
export function getTenantScopedKey(key: string): string {
  return `${getCurrentTenantId()}:${key}`;
}

/**
 * Appends `tenant_id` as a query parameter to an API URL.
 */
export function scopeApiUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tenant_id=${encodeURIComponent(getCurrentTenantId())}`;
}

// ─── Workspace REST client (#1031) ───────────────────────────────────────────

/**
 * Request headers carrying the stored bearer token.
 *
 * The token is only attached when there is one. Sending `Authorization: Bearer
 * null` — which is what template-interpolating a missing token produces — asks
 * the server to reject a request that an anonymous call might have been allowed
 * to make, and turns "not signed in" into an opaque 401.
 */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = readStorage(AUTH_TOKEN_KEY);
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * The server's error message for a failed response, falling back to the status.
 *
 * `response.json()` on an error is not guaranteed to be JSON — a proxy 502 is
 * usually HTML — so the parse is guarded and the status is used when it fails.
 */
async function errorFor(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (body && typeof body.message === 'string' && body.message) {
      return new Error(body.message);
    }
  } catch {
    // Not JSON. The status line below is the best available description.
  }
  return new Error(`${fallback} (HTTP ${response.status})`);
}

/**
 * All tenants associated with the current authenticated user.
 */
export async function fetchUserTenants(): Promise<Tenant[]> {
  const response = await fetch(`${API_BASE}/tenants`, {
    method: 'GET',
    headers: authHeaders(JSON_HEADERS),
  });
  if (!response.ok) {
    throw await errorFor(response, 'Failed to load workspaces');
  }
  return response.json();
}

/**
 * Updates the settings of a specific tenant.
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: Partial<TenantSettings>
): Promise<Tenant> {
  const response = await fetch(`${API_BASE}/tenants/${encodeURIComponent(tenantId)}/settings`, {
    method: 'PATCH',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify({ settings }),
  });
  if (!response.ok) {
    throw await errorFor(response, 'Failed to update workspace settings');
  }
  return response.json();
}

/**
 * Invites a new member to a tenant workspace.
 */
export async function inviteTenantMember(
  tenantId: string,
  email: string,
  role: TenantMember['role']
): Promise<TenantMember> {
  const response = await fetch(`${API_BASE}/tenants/${encodeURIComponent(tenantId)}/members`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify({ email, role }),
  });
  if (!response.ok) {
    throw await errorFor(response, 'Failed to invite member');
  }
  return response.json();
}

/**
 * Removes a member from a tenant workspace.
 *
 * The path segments are encoded. They are ids that arrive from the API, but a
 * `/` or `?` in one would otherwise re-point the request at a different route
 * rather than 404 — an id is a value, not a path fragment.
 */
export async function removeTenantMember(tenantId: string, memberId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    }
  );
  if (!response.ok) {
    throw await errorFor(response, 'Failed to remove member');
  }
}

/**
 * Creates a tenant-owned custom challenge.
 */
export async function createTenantChallenge(
  tenantId: string,
  challenge: TenantChallengePayload
): Promise<Record<string, any>> {
  const response = await fetch(`${API_BASE}/tenants/${encodeURIComponent(tenantId)}/challenges`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(challenge),
  });
  if (!response.ok) {
    throw await errorFor(response, 'Failed to create tenant challenge');
  }
  return response.json();
}

/**
 * Updates a tenant-owned custom challenge.
 */
export async function updateTenantChallenge(
  tenantId: string,
  challengeId: string,
  challenge: Partial<TenantChallengePayload>
): Promise<Record<string, any>> {
  const response = await fetch(
    `${API_BASE}/tenants/${encodeURIComponent(tenantId)}/challenges/${encodeURIComponent(challengeId)}`,
    {
      method: 'PUT',
      headers: authHeaders(JSON_HEADERS),
      body: JSON.stringify(challenge),
    }
  );
  if (!response.ok) {
    throw await errorFor(response, 'Failed to update tenant challenge');
  }
  return response.json();
}

/**
 * Deletes a tenant-owned custom challenge.
 */
export async function deleteTenantChallenge(tenantId: string, challengeId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/tenants/${encodeURIComponent(tenantId)}/challenges/${encodeURIComponent(challengeId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    }
  );
  if (!response.ok) {
    throw await errorFor(response, 'Failed to delete tenant challenge');
  }
}

