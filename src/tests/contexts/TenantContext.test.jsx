import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TenantProvider, useTenant } from "../../context/TenantContext";

function wrapper({ children }) {
  return <TenantProvider>{children}</TenantProvider>;
}

describe("TenantContext (Issue #759)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the 'default' tenant", () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current.tenantId).toBe("default");
    expect(result.current.tenantName).toBe("Default Organisation");
  });

  it("sets and persists a new tenant", () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    act(() => {
      result.current.setTenant("delhi-pollution-board");
    });
    expect(result.current.tenantId).toBe("delhi-pollution-board");
    expect(result.current.tenantName).toBe("Delhi Pollution Control Board");
    expect(localStorage.getItem("pch_tenant_id")).toBe("delhi-pollution-board");
  });

  it("clears the tenant back to default", () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    act(() => {
      result.current.setTenant("mumbai-municipal");
    });
    act(() => {
      result.current.clearTenant();
    });
    expect(result.current.tenantId).toBe("default");
    expect(localStorage.getItem("pch_tenant_id")).toBeNull();
  });

  it("loads from localStorage on init", () => {
    localStorage.setItem("pch_tenant_id", "bangalore-civic");
    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current.tenantId).toBe("bangalore-civic");
    expect(result.current.tenantName).toBe("Bangalore Civic Authority");
  });

  it("exposes the known tenants list", () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current.knownTenants).toHaveLength(4);
    expect(result.current.knownTenants[0]).toEqual({
      id: "default",
      name: "Default Organisation",
    });
  });

  it("isMultiTenant is true", () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current.isMultiTenant).toBe(true);
  });
});
