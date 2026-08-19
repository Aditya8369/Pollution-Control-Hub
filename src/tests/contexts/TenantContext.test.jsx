import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  TenantProvider,
  useTenant,
  DEFAULT_TENANT_ID,
  KNOWN_TENANTS,
} from "../../context/TenantContext";

const STORAGE_KEY = "pch_tenant_id";

function wrapper({ children }) {
  return <TenantProvider>{children}</TenantProvider>;
}

function mountTenant() {
  return renderHook(() => useTenant(), { wrapper });
}

describe("TenantContext (Issue #759)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the 'default' tenant", () => {
    const { result } = mountTenant();
    expect(result.current.tenantId).toBe("default");
    expect(result.current.tenantName).toBe("Default Organisation");
  });

  it("sets and persists a new tenant", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("delhi-pollution-board");
    });
    expect(result.current.tenantId).toBe("delhi-pollution-board");
    expect(result.current.tenantName).toBe("Delhi Pollution Control Board");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("delhi-pollution-board");
  });

  it("clears the tenant back to default", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("mumbai-municipal");
    });
    act(() => {
      result.current.clearTenant();
    });
    expect(result.current.tenantId).toBe("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loads from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, "bangalore-civic");
    const { result } = mountTenant();
    expect(result.current.tenantId).toBe("bangalore-civic");
    expect(result.current.tenantName).toBe("Bangalore Civic Authority");
  });

  it("exposes the known tenants list", () => {
    const { result } = mountTenant();
    expect(result.current.knownTenants).toHaveLength(4);
    expect(result.current.knownTenants[0]).toEqual({
      id: "default",
      name: "Default Organisation",
    });
  });

  it("isMultiTenant is true", () => {
    const { result } = mountTenant();
    expect(result.current.isMultiTenant).toBe(true);
  });
});

describe("TenantContext — clearing stays cleared (Issue #843)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a cleared tenant does not come back on the next mount", () => {
    const first = mountTenant();
    act(() => {
      first.result.current.setTenant("mumbai-municipal");
    });
    act(() => {
      first.result.current.clearTenant();
    });
    first.unmount();

    // The bug was invisible within a single mount: state read "default" either way. It
    // only showed itself on the next page load, when the rewritten key was read back.
    const second = mountTenant();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(second.result.current.tenantId).toBe("default");
  });

  it("clearing is idempotent when nothing was ever chosen", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.clearTenant();
    });
    expect(result.current.tenantId).toBe("default");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("selecting the default explicitly clears the key rather than storing it", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("bangalore-civic");
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("bangalore-civic");

    act(() => {
      result.current.setTenant(DEFAULT_TENANT_ID);
    });
    expect(result.current.tenantId).toBe("default");
    // "No key" is the single representation of "no choice made".
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("switching between tenants overwrites rather than accumulates", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("mumbai-municipal");
    });
    act(() => {
      result.current.setTenant("delhi-pollution-board");
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("delhi-pollution-board");
    expect(result.current.tenantName).toBe("Delhi Pollution Control Board");
  });
});

describe("TenantContext — storage is only written on a real choice (Issue #843)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes nothing on mount for a first-time visitor", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mountTenant();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)
    ).toHaveLength(0);
  });

  it("writes nothing on mount for a returning visitor", () => {
    localStorage.setItem(STORAGE_KEY, "mumbai-municipal");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const { result } = mountTenant();
    expect(result.current.tenantId).toBe("mumbai-municipal");
    // Reading a stored preference is not a decision, so it must not re-write the key.
    expect(
      setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)
    ).toHaveLength(0);
  });

  it("re-selecting the current tenant does not disturb the stored value", () => {
    localStorage.setItem(STORAGE_KEY, "bangalore-civic");
    const { result } = mountTenant();

    act(() => {
      result.current.setTenant("bangalore-civic");
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("bangalore-civic");
    expect(result.current.tenantId).toBe("bangalore-civic");
  });
});

describe("TenantContext — unrecognised ids (Issue #843)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the default when storage holds a retired tenant id", () => {
    localStorage.setItem(STORAGE_KEY, "chennai-board-that-no-longer-exists");
    const { result } = mountTenant();

    expect(result.current.tenantId).toBe("default");
    expect(result.current.tenantName).toBe("Default Organisation");
  });

  it("falls back to the default when storage holds an empty string", () => {
    localStorage.setItem(STORAGE_KEY, "");
    const { result } = mountTenant();
    expect(result.current.tenantId).toBe("default");
  });

  it("ignores an attempt to select an unknown tenant", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("not-a-real-tenant");
    });

    expect(result.current.tenantId).toBe("default");
    expect(result.current.tenantName).toBe("Default Organisation");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps the current selection when handed a non-string id", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("mumbai-municipal");
    });
    act(() => {
      result.current.setTenant(undefined);
    });
    act(() => {
      result.current.setTenant(null);
    });
    act(() => {
      // @ts-expect-error — callers are JS; the guard exists for exactly this.
      result.current.setTenant(42);
    });

    expect(result.current.tenantId).toBe("mumbai-municipal");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("mumbai-municipal");
  });

  it("every known tenant is selectable and resolves to its own name", () => {
    const { result } = mountTenant();

    for (const tenant of KNOWN_TENANTS) {
      act(() => {
        result.current.setTenant(tenant.id);
      });
      expect(result.current.tenantId).toBe(tenant.id);
      expect(result.current.tenantName).toBe(tenant.name);
    }
  });
});

describe("TenantContext — unavailable storage (Issue #843)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with the default when reading storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    const { result } = mountTenant();
    expect(result.current.tenantId).toBe("default");
    expect(result.current.tenantName).toBe("Default Organisation");
  });

  it("still applies a selection for the session when writing throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const { result } = mountTenant();
    expect(() => {
      act(() => {
        result.current.setTenant("delhi-pollution-board");
      });
    }).not.toThrow();

    // The write failed, but the app must not: the choice holds until the tab closes.
    expect(result.current.tenantId).toBe("delhi-pollution-board");
    expect(result.current.tenantName).toBe("Delhi Pollution Control Board");
  });

  it("clears the in-memory selection even when removal throws", () => {
    const { result } = mountTenant();
    act(() => {
      result.current.setTenant("mumbai-municipal");
    });

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(() => {
      act(() => {
        result.current.clearTenant();
      });
    }).not.toThrow();
    expect(result.current.tenantId).toBe("default");
  });
});

describe("TenantContext — context identity (Issue #843)", () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the context value stable across re-renders that change nothing", () => {
    const { result, rerender } = mountTenant();
    const before = result.current;

    rerender();
    expect(result.current).toBe(before);
  });

  it("produces a new context value when the tenant changes", () => {
    const { result } = mountTenant();
    const before = result.current;

    act(() => {
      result.current.setTenant("bangalore-civic");
    });
    expect(result.current).not.toBe(before);
    expect(result.current.tenantId).toBe("bangalore-civic");
  });

  it("keeps the action identities stable so consumers do not re-subscribe", () => {
    const { result } = mountTenant();
    const { setTenant, clearTenant } = result.current;

    act(() => {
      result.current.setTenant("mumbai-municipal");
    });
    expect(result.current.setTenant).toBe(setTenant);
    expect(result.current.clearTenant).toBe(clearTenant);
  });

  it("falls back to the inert default context outside a provider", () => {
    // createContext supplies a default, so this reads rather than throws. The default
    // must be inert: no-op actions and isMultiTenant false, so a component rendered
    // outside the provider cannot appear to switch anything.
    const { result } = renderHook(() => useTenant());

    expect(result.current.tenantId).toBe("default");
    expect(result.current.isMultiTenant).toBe(false);
    expect(() => result.current.setTenant("mumbai-municipal")).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
