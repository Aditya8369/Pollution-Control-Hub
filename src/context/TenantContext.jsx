import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { fetchUserTenants, updateTenantSettings as updateSettingsApi } from '../services/tenantService';

const STORAGE_KEY = "pch_tenant_id";

export const DEFAULT_TENANT_ID = "default";

const KNOWN_TENANTS = [
  { id: "default", name: "Default Organisation" },
  { id: "mumbai-municipal", name: "Mumbai Municipal Corporation" },
  { id: "delhi-pollution-board", name: "Delhi Pollution Control Board" },
  { id: "bangalore-civic", name: "Bangalore Civic Authority" },
];

const DEFAULT_TENANT_NAME = KNOWN_TENANTS[0].name;

/**
 * The shape consumers receive from `useTenant()`.
 *
 * @typedef {object} TenantContextValue
 * @property {string} tenantId - The active tenant's id.
 * @property {string} tenantName - Its display name.
 * @property {(id: string) => void} setTenant - Selects a tenant by id.
 * @property {() => void} clearTenant - Returns to the default and forgets the choice.
 * @property {boolean} isMultiTenant - False on the inert default context.
 * @property {{id: string, name: string}[]} knownTenants - Selectable tenants.
 * @property {object|null} currentTenant - The full current tenant object from API.
 * @property {object[]} tenants - All available tenants from API.
 * @property {boolean} isLoading - Whether tenant data is being fetched.
 * @property {string|null} error - Error message if fetching fails.
 * @property {(tenantId: string) => Promise<void>} switchTenant - Switches to a different tenant.
 * @property {() => Promise<void>} fetchTenants - Fetches tenant list from API.
 * @property {(settings: object) => Promise<void>} updateTenantSettings - Updates tenant settings.
 */

/** @type {import('react').Context<TenantContextValue>} */
const TenantContext = createContext({
  tenantId: DEFAULT_TENANT_ID,
  tenantName: DEFAULT_TENANT_NAME,
  setTenant: () => { },
  clearTenant: () => { },
  isMultiTenant: false,
  knownTenants: KNOWN_TENANTS,
  currentTenant: null,
  tenants: [],
  isLoading: true,
  error: null,
  switchTenant: async () => { },
  fetchTenants: async () => { },
  updateTenantSettings: async () => { },
});

/**
 * Whether `id` names a tenant this build knows about.
 *
 * @param {unknown} id
 * @returns {boolean}
 */
function isKnownTenant(id) {
  return (
    typeof id === "string" && KNOWN_TENANTS.some((tenant) => tenant.id === id)
  );
}

/**
 * The display name for a tenant id.
 *
 * An unrecognised id resolves to the default name rather than being echoed back.
 *
 * @param {string} id
 * @returns {string}
 */
function nameFor(id) {
  const found = KNOWN_TENANTS.find((tenant) => tenant.id === id);
  return found ? found.name : DEFAULT_TENANT_NAME;
}

/**
 * The tenant the visitor previously chose, or the default.
 *
 * Anything unrecognised in storage is discarded rather than trusted.
 *
 * @returns {string}
 */
function readStoredTenant() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isKnownTenant(stored) ? stored : DEFAULT_TENANT_ID;
  } catch {
    return DEFAULT_TENANT_ID;
  }
}

/**
 * Records the chosen tenant, tolerating a storage layer that refuses the write.
 *
 * @param {string} id
 */
function persistTenant(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private browsing, or the quota is full. The choice still applies for this session.
  }
}

/**
 * Removes the stored tenant.
 */
function forgetTenant() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Unreadable storage is also uncleared storage. Nothing useful to do here.
  }
}

/**
 * Provides the active tenant and the operations that change it.
 *
 * Combines static known tenants with dynamic API-driven tenant management.
 */
export function TenantProvider({ children }) {
  const [tenantId, setTenantId] = useState(readStoredTenant);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUserTenants();
      setTenants(data);

      // If we have API tenants and no current tenant is set, use the first one
      if (data.length > 0 && !currentTenant) {
        const savedTenantId = localStorage.getItem(STORAGE_KEY);
        const savedTenant = savedTenantId
          ? data.find(t => t.id === savedTenantId) || data[0]
          : data[0];

        setCurrentTenant(savedTenant);
        setTenantId(savedTenant.id);
        persistTenant(savedTenant.id);
      }
    } catch (err) {
      setError('Failed to fetch workspaces. Please try again.');
      console.error('TenantContext fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  const setTenant = useCallback((id) => {
    // Reject unknown ids at the door
    if (!isKnownTenant(id)) return;

    setTenantId(id);

    // Find matching tenant from API data if available
    const matchedTenant = tenants.find(t => t.id === id);
    if (matchedTenant) {
      setCurrentTenant(matchedTenant);
    } else if (id === DEFAULT_TENANT_ID) {
      setCurrentTenant(null);
    }

    // The default is the absence of a choice, so selecting it clears the key
    if (id === DEFAULT_TENANT_ID) {
      forgetTenant();
    } else {
      persistTenant(id);
    }
  }, [tenants]);

  const switchTenant = useCallback(async (tenantId) => {
    setIsLoading(true);
    try {
      const selected = tenants.find((t) => t.id === tenantId);
      if (selected) {
        setCurrentTenant(selected);
        setTenantId(tenantId);
        persistTenant(tenantId);
      }
    } catch (err) {
      setError('Failed to switch workspace.');
      console.error('TenantContext switch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenants]);

  const clearTenant = useCallback(() => {
    setTenantId(DEFAULT_TENANT_ID);
    setCurrentTenant(null);
    forgetTenant();
  }, []);

  const updateTenantSettings = useCallback(async (settings) => {
    if (!currentTenant) return;
    try {
      const updated = await updateSettingsApi(currentTenant.id, settings);
      setCurrentTenant(updated);
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError('Failed to update workspace settings.');
      console.error('TenantContext update error:', err);
    }
  }, [currentTenant]);

  // Derived from `tenantId` rather than mirrored into state
  const tenantName = useMemo(() => {
    // Prefer API tenant name if available, fall back to static lookup
    if (currentTenant) {
      return currentTenant.name;
    }
    return nameFor(tenantId);
  }, [tenantId, currentTenant]);

  useEffect(() => {
    let activeId = null;
    try {
      activeId = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable or insecure
    }
    fetchTenants().then(() => {
      if (activeId && tenants.length > 0) {
        const saved = tenants.find((t) => t.id === activeId);
        if (saved) {
          setCurrentTenant(saved);
          setTenantId(activeId);
        }
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      tenantId,
      tenantName,
      setTenant,
      clearTenant,
      isMultiTenant: true,
      knownTenants: KNOWN_TENANTS,
      currentTenant,
      tenants,
      isLoading,
      error,
      switchTenant,
      fetchTenants,
      updateTenantSettings,
    }),
    [tenantId, tenantName, setTenant, clearTenant, currentTenant, tenants, isLoading, error, switchTenant, fetchTenants, updateTenantSettings]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export { TenantContext, KNOWN_TENANTS };
