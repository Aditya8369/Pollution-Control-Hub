import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MultiLevelCache } from "./cache";

describe("MultiLevelCache", () => {
  let cache;

  beforeEach(() => {
    localStorage.clear();
    cache = new MultiLevelCache("test-cache", 1000);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("retrieves data from memory cache", () => {
    const data = { aqi: 50 };

    cache.set("city", data);

    expect(cache.get("city")).toEqual(data);
  });

  it("retrieves data from localStorage when memory cache is empty", () => {
    const entry = {
      data: { aqi: 75 },
      expiresAt: Date.now() + 5000,
    };

    localStorage.setItem(
      "test-cache:city",
      JSON.stringify(entry)
    );

    expect(cache.get("city")).toEqual(entry.data);

    // should backfill L1 cache
    expect(cache.memoryCache.size).toBe(1);
  });

  it("returns null when cache entry has expired in memory", () => {
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now);

    cache.set("city", { aqi: 90 }, 100);

    vi.spyOn(Date, "now").mockReturnValue(now + 200);

    expect(cache.get("city")).toBeNull();
  });

  it("returns null when localStorage entry has expired", () => {
    const expired = {
      data: { aqi: 80 },
      expiresAt: Date.now() - 1000,
    };

    localStorage.setItem(
      "test-cache:city",
      JSON.stringify(expired)
    );

    expect(cache.get("city")).toBeNull();
    expect(localStorage.getItem("test-cache:city")).toBeNull();
  });

  it("returns null on cache miss", () => {
    expect(cache.get("unknown")).toBeNull();
  });

  it("returns fallback data", () => {
    const data = { aqi: 120 };

    cache.set("city", data);

    expect(cache.getFallback("city")).toEqual(data);
  });

  it("returns null when fallback does not exist", () => {
    expect(cache.getFallback("missing")).toBeNull();
  });

  it("persists data to memory and localStorage", () => {
    const data = { aqi: 60 };

    cache.set("city", data);

    expect(cache.memoryCache.size).toBe(1);

    const stored = JSON.parse(
      localStorage.getItem("test-cache:city")
    );

    expect(stored.data).toEqual(data);

    const fallback = JSON.parse(
      localStorage.getItem("test-cache:fallback:city")
    );

    expect(fallback).toEqual(data);
  });

  it("clears memory and localStorage", () => {
    cache.set("city1", { aqi: 50 });
    cache.set("city2", { aqi: 60 });

    expect(cache.memoryCache.size).toBe(2);

    cache.clear();

    expect(cache.memoryCache.size).toBe(0);

    expect(localStorage.getItem("test-cache:city1")).toBeNull();
    expect(localStorage.getItem("test-cache:city2")).toBeNull();
    expect(localStorage.getItem("test-cache:fallback:city1")).toBeNull();
    expect(localStorage.getItem("test-cache:fallback:city2")).toBeNull();
  });

  it("handles localStorage getItem errors gracefully", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage read failed");
    });

    expect(() => cache.get("city")).not.toThrow();
    expect(cache.get("city")).toBeNull();
  });

  it("handles localStorage setItem errors gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage write failed");
    });

    expect(() =>
      cache.set("city", { aqi: 100 })
    ).not.toThrow();
  });

  it("handles localStorage removeItem errors during clear()", () => {
    cache.set("city", { aqi: 50 });

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Storage remove failed");
    });

    expect(() => cache.clear()).not.toThrow();
  });

  it("handles malformed JSON in localStorage", () => {
    localStorage.setItem("test-cache:city", "invalid-json");

    expect(() => cache.get("city")).not.toThrow();
    expect(cache.get("city")).toBeNull();
  });

  it("handles malformed fallback JSON", () => {
    localStorage.setItem(
      "test-cache:fallback:city",
      "invalid-json"
    );

    expect(() => cache.getFallback("city")).not.toThrow();
    expect(cache.getFallback("city")).toBeNull();
  });
});