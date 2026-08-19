import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

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
 * Declared rather than left to inference from the default below. Inference reads
 * `setTenant: () => {}` as taking no arguments, so every real `setTenant(id)` call
 * type-checked as "Expected 0 arguments, but got 1" — and `knownTenants` was absent
 * from the inferred type altogether, so reading it in TenantSwitcher was an error too.
 *
 * @typedef {object} TenantContextValue
 * @property {string} tenantId - The active tenant's id.
 * @property {string} tenantName - Its display name.
 * @property {(id: string) => void} setTenant - Selects a tenant by id.
 * @property {() => void} clearTenant - Returns to the default and forgets the choice.
 * @property {boolean} isMultiTenant - False on the inert default context.
 * @property {{id: string, name: string}[]} knownTenants - Selectable tenants.
 */

/** @type {import('react').Context<TenantContextValue>} */
const TenantContext = createContext({
  tenantId: DEFAULT_TENANT_ID,
  tenantName: DEFAULT_TENANT_NAME,
  setTenant: () => {},
  clearTenant: () => {},
  isMultiTenant: false,
  knownTenants: KNOWN_TENANTS,
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
 * An unrecognised id resolves to the default name rather than being echoed back, so a
 * retired or hand-edited id can never surface in the UI as a label.
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
 * Anything unrecognised in storage — a tenant since removed, a value written by an older
 * build, or something typed in by hand — is discarded rather than trusted. Returning it
 * would put an id the app has no name for into `tenantId`; the name lookup would quietly
 * fall back to "Default Organisation" while the id itself stayed wrong, so the switcher
 * would show the default with no row ticked.
 *
 * The read is guarded because `localStorage` throws outright when a browser blocks it —
 * Safari's private mode does — rather than returning null. The provider has to render
 * either way.
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
 * Storage is written by the two actions that represent a decision — `setTenant` and
 * `clearTenant` — and by nothing else.
 *
 * It used to be written by an effect keyed on `tenantId`, which had two consequences.
 * `clearTenant()` removed the key and then set state to `"default"`; that state change
 * re-ran the effect, which wrote `"default"` straight back, so clearing never cleared
 * anything. And the same effect ran on mount, so a visitor who had never opened the
 * tenant switcher still got `pch_tenant_id=default` written to their browser on first
 * paint — leaving no way to tell "never chose one" apart from "deliberately chose the
 * default", and no way to change what the default means for anyone who already has the
 * key.
 */
export function TenantProvider({ children }) {
  const [tenantId, setTenantId] = useState(readStoredTenant);

  const setTenant = useCallback((id) => {
    // An unknown id is rejected at the door. Accepting it would persist a value that
    // `readStoredTenant` is then obliged to throw away on the next load, so the
    // selection would appear to work and silently not survive a reload.
    if (!isKnownTenant(id)) return;

    setTenantId(id);

    // The default is the absence of a choice, so selecting it clears the key rather than
    // recording it. That keeps one meaning for "no key present".
    if (id === DEFAULT_TENANT_ID) {
      forgetTenant();
    } else {
      persistTenant(id);
    }
  }, []);

  const clearTenant = useCallback(() => {
    setTenantId(DEFAULT_TENANT_ID);
    forgetTenant();
  }, []);

  // Derived from `tenantId` rather than mirrored into state of its own, so the name
  // cannot lag the id by a render.
  const tenantName = useMemo(() => nameFor(tenantId), [tenantId]);

  const value = useMemo(
    () => ({
      tenantId,
      tenantName,
      setTenant,
      clearTenant,
      isMultiTenant: true,
      knownTenants: KNOWN_TENANTS,
    }),
    [tenantId, tenantName, setTenant, clearTenant]
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
