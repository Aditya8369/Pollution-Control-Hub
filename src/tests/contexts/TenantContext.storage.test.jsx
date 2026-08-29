import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import {
  TenantProvider,
  useTenant,
  DEFAULT_TENANT_ID,
} from "../../context/TenantContext";

/**
 * The API layer is mocked so these tests are about the provider's own behaviour:
 * how it reads storage, and what it does with the tenant list once it has one.
 */
vi.mock("../../services/tenantService", () => ({
  fetchUserTenants: vi.fn(async () => []),
  updateTenantSettings: vi.fn(async (id, settings) => ({ id, ...settings })),
}));

import { fetchUserTenants, updateTenantSettings } from "../../services/tenantService";

const STORAGE_KEY = "pch_tenant_id";

const API_TENANTS = [
  { id: "mumbai-municipal", name: "Mumbai Municipal Corporation" },
  { id: "delhi-pollution-board", name: "Delhi Pollution Control Board" },
];

function wrapper({ children }) {
  return <TenantProvider>{children}</TenantProvider>;
}

function mountTenant() {
  return renderHook(() => useTenant(), { wrapper });
}

/** Makes every `localStorage` operation throw the way a storage-blocked browser does. */
function blockStorage(...methods) {
  for (const method of methods) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  fetchUserTenants.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TenantProvider — storage that refuses to be read (#1137)", () => {
  it("mounts on the default workspace instead of crashing", async () => {
    blockStorage("getItem");

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(result.current.tenantName).toBe("Default Organisation");
  });

  it("survives a throwing read inside the mount effect, not only the initialiser", async () => {
    // The initial state is computed before the effect runs, so a getItem that only
    // starts throwing afterwards exercises the second read — the one at the old
    // line 230, whose SecurityError escaped into React's commit phase.
    const { result } = mountTenant();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    blockStorage("getItem");
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    await act(async () => { await result.current.fetchTenants(); });

    expect(result.current.error).toBeNull();
    expect(result.current.tenants).toHaveLength(2);
  });

  it("still selects a workspace from the API when storage cannot be read", async () => {
    blockStorage("getItem", "setItem");
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    // No stored preference is readable, so the first workspace is the honest default.
    expect(result.current.currentTenant.id).toBe("mumbai-municipal");
    expect(result.current.tenantId).toBe("mumbai-municipal");
  });

  it("keeps a selection for the session when the write is refused", async () => {
    blockStorage("setItem");

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setTenant("bangalore-civic"); });

    expect(result.current.tenantId).toBe("bangalore-civic");
    expect(result.current.tenantName).toBe("Bangalore Civic Authority");
  });
});

describe("TenantProvider — restoring the stored workspace (#1137)", () => {
  it("restores the stored workspace from the tenant list", async () => {
    localStorage.setItem(STORAGE_KEY, "delhi-pollution-board");
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    expect(result.current.currentTenant.id).toBe("delhi-pollution-board");
    expect(result.current.tenantId).toBe("delhi-pollution-board");
    expect(result.current.tenantName).toBe("Delhi Pollution Control Board");
  });

  it("falls back to the first workspace when the stored id is no longer in the list", async () => {
    localStorage.setItem(STORAGE_KEY, "a-workspace-that-was-deleted");
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    expect(result.current.currentTenant.id).toBe("mumbai-municipal");
  });

  it("restores an API-only workspace whose id is not in KNOWN_TENANTS", async () => {
    // The static KNOWN_TENANTS list is for the offline picker; the API can return
    // workspaces this build has never heard of, and a stored one of those must still
    // be restorable. This is why the raw read is not validated at the reader.
    const apiOnly = [{ id: "kolkata-wbpcb", name: "West Bengal PCB" }, ...API_TENANTS];
    localStorage.setItem(STORAGE_KEY, "kolkata-wbpcb");
    fetchUserTenants.mockResolvedValue(apiOnly);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    expect(result.current.currentTenant.id).toBe("kolkata-wbpcb");
    expect(result.current.tenantName).toBe("West Bengal PCB");
  });

  it("does not overwrite a workspace the visitor already chose", async () => {
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    act(() => { result.current.setTenant("delhi-pollution-board"); });
    expect(result.current.currentTenant.id).toBe("delhi-pollution-board");

    await act(async () => { await result.current.fetchTenants(); });
    expect(result.current.currentTenant.id).toBe("delhi-pollution-board");
  });

  it("fetches the tenant list exactly once on mount", async () => {
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchUserTenants).toHaveBeenCalledTimes(1);
  });

  it("keeps `fetchTenants` stable across a workspace change", async () => {
    // It is part of the context value, so a new identity invalidates the memo and
    // re-renders every consumer of useTenant().
    fetchUserTenants.mockResolvedValue(API_TENANTS);

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    const before = result.current.fetchTenants;
    act(() => { result.current.setTenant("delhi-pollution-board"); });

    expect(result.current.fetchTenants).toBe(before);
  });
});

describe("TenantProvider — a tenant API that misbehaves (#1137)", () => {
  it("reports a failed fetch without unmounting", async () => {
    fetchUserTenants.mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => { });

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.error).toBe("Failed to fetch workspaces. Please try again."));

    expect(result.current.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(result.current.isLoading).toBe(false);
  });

  it("treats a non-array response as an empty list rather than throwing", async () => {
    fetchUserTenants.mockResolvedValue({ tenants: API_TENANTS });

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tenants).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.tenantId).toBe(DEFAULT_TENANT_ID);
  });

  it("updates settings on the current workspace", async () => {
    fetchUserTenants.mockResolvedValue(API_TENANTS);
    updateTenantSettings.mockResolvedValue({ id: "mumbai-municipal", name: "Mumbai MC (renamed)" });

    const { result } = mountTenant();
    await waitFor(() => expect(result.current.currentTenant).not.toBeNull());

    await act(async () => { await result.current.updateTenantSettings({ name: "Mumbai MC (renamed)" }); });

    expect(result.current.currentTenant.name).toBe("Mumbai MC (renamed)");
    expect(result.current.tenants[0].name).toBe("Mumbai MC (renamed)");
  });
});
