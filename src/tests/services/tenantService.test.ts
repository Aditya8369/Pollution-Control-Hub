import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCurrentTenantId,
  getTenantScopedDbName,
  getTenantScopedStoreName,
  getTenantScopedKey,
  scopeApiUrl,
} from "../../services/tenantService";

describe("tenantService (Issue #759)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentTenantId", () => {
    it("returns 'default' when no tenant is set", () => {
      expect(getCurrentTenantId()).toBe("default");
    });

    it("returns the stored tenant ID", () => {
      localStorage.setItem("pch_tenant_id", "delhi-pollution-board");
      expect(getCurrentTenantId()).toBe("delhi-pollution-board");
    });
  });

  describe("getTenantScopedDbName", () => {
    it("scopes the DB name with the default tenant", () => {
      expect(getTenantScopedDbName("PollutionHubDB")).toBe(
        "PollutionHubDB__default"
      );
    });

    it("scopes the DB name with a custom tenant", () => {
      localStorage.setItem("pch_tenant_id", "mumbai-municipal");
      expect(getTenantScopedDbName("PollutionHubDB")).toBe(
        "PollutionHubDB__mumbai-municipal"
      );
    });
  });

  describe("getTenantScopedStoreName", () => {
    it("scopes the store name", () => {
      localStorage.setItem("pch_tenant_id", "bangalore-civic");
      expect(getTenantScopedStoreName("historicalDataCache")).toBe(
        "historicalDataCache__bangalore-civic"
      );
    });
  });

  describe("getTenantScopedKey", () => {
    it("prefixes the key with tenant_id", () => {
      localStorage.setItem("pch_tenant_id", "delhi");
      expect(getTenantScopedKey("user_settings")).toBe("delhi:user_settings");
    });
  });

  describe("scopeApiUrl", () => {
    it("appends tenant_id to a URL without query params", () => {
      localStorage.setItem("pch_tenant_id", "mumbai");
      expect(scopeApiUrl("https://api.example.com/data")).toBe(
        "https://api.example.com/data?tenant_id=mumbai"
      );
    });

    it("appends tenant_id to a URL with existing query params", () => {
      localStorage.setItem("pch_tenant_id", "delhi");
      expect(scopeApiUrl("https://api.example.com/data?page=1")).toBe(
        "https://api.example.com/data?page=1&tenant_id=delhi"
      );
    });

    it("uses 'default' when no tenant is set", () => {
      expect(scopeApiUrl("https://api.example.com/data")).toBe(
        "https://api.example.com/data?tenant_id=default"
      );
    });
  });
});
