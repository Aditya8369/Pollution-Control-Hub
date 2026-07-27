import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MultiLevelCache } from "./cache";

describe("MultiLevelCache", () => {
  let cache;

  beforeEach(() => {
    // Set a small maxEntries (3) for LRU testing
    cache = new MultiLevelCache("test-cache", 1000, 3);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retrieves data from memory cache", () => {
    const data = { aqi: 50 };
    cache.set("city", data);
    expect(cache.get("city")).toEqual(data);
  });

  it("returns null when cache entry has expired in memory", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    cache.set("city", { aqi: 90 }, 100);

    vi.spyOn(Date, "now").mockReturnValue(now + 200);
    expect(cache.get("city")).toBeNull();
  });

  it("returns null on cache miss", () => {
    expect(cache.get("unknown")).toBeNull();
  });

  it("evicts least recently used item when maxEntries is exceeded", () => {
    cache.set("city1", { aqi: 10 });
    cache.set("city2", { aqi: 20 });
    cache.set("city3", { aqi: 30 });

    // Access city1 to make it most recently used
    cache.get("city1");

    // Add 4th item, exceeding maxEntries (3)
    // The least recently used is now city2
    cache.set("city4", { aqi: 40 });

    expect(cache.get("city1")).toEqual({ aqi: 10 }); // Kept (recently used)
    expect(cache.get("city2")).toBeNull();           // Evicted (least recently used)
    expect(cache.get("city3")).toEqual({ aqi: 30 }); // Kept
    expect(cache.get("city4")).toEqual({ aqi: 40 }); // Kept (newest)
  });

  it("refreshes LRU order when overwriting an existing key", () => {
    cache.set("city1", { aqi: 10 });
    cache.set("city2", { aqi: 20 });
    cache.set("city3", { aqi: 30 });

    // Update city1 to make it most recently used
    cache.set("city1", { aqi: 15 });

    // Add 4th item, exceeding maxEntries (3)
    // The least recently used is now city2
    cache.set("city4", { aqi: 40 });

    expect(cache.get("city1")).toEqual({ aqi: 15 }); // Kept (recently updated)
    expect(cache.get("city2")).toBeNull();           // Evicted
    expect(cache.get("city3")).toEqual({ aqi: 30 }); // Kept
    expect(cache.get("city4")).toEqual({ aqi: 40 }); // Kept
  });

  it("clears memory cache", () => {
    cache.set("city1", { aqi: 50 });
    cache.set("city2", { aqi: 60 });

    expect(cache.memoryCache.size).toBe(2);

    cache.clear();

    expect(cache.memoryCache.size).toBe(0);
    expect(cache.get("city1")).toBeNull();
  });
});