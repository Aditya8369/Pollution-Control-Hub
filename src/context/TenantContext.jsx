import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const STORAGE_KEY = "pch_tenant_id";

const TenantContext = createContext({
  tenantId: "default",
  tenantName: "Default Organisation",
  setTenant: () => {},
  clearTenant: () => {},
  isMultiTenant: false,
});

const KNOWN_TENANTS = [
  { id: "default", name: "Default Organisation" },
  { id: "mumbai-municipal", name: "Mumbai Municipal Corporation" },
  { id: "delhi-pollution-board", name: "Delhi Pollution Control Board" },
  { id: "bangalore-civic", name: "Bangalore Civic Authority" },
];

export function TenantProvider({ children }) {
  const [tenantId, setTenantId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "default";
    } catch {
      return "default";
    }
  });

  const [tenantName, setTenantName] = useState("Default Organisation");

  useEffect(() => {
    const found = KNOWN_TENANTS.find((t) => t.id === tenantId);
    setTenantName(found ? found.name : "Default Organisation");
    try {
      localStorage.setItem(STORAGE_KEY, tenantId);
    } catch {
      // ignore write errors (private mode)
    }
  }, [tenantId]);

  const setTenant = useCallback((id) => {
    setTenantId(id);
  }, []);

  const clearTenant = useCallback(() => {
    setTenantId("default");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName,
        setTenant,
        clearTenant,
        isMultiTenant: true,
        knownTenants: KNOWN_TENANTS,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export { TenantContext };
