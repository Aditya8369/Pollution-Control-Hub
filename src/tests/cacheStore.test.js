import { vi, beforeEach, afterEach } from 'vitest';
import { cacheStore } from '../utils/cacheStore';

beforeEach(async () => {
      // @ts-ignore
  await cacheStore.invalidate();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("getFromMemory returns null for missing key", () => {
  expect(cacheStore.getFromMemory("missing")).toBeNull();
});
test("set stores value in memory cache", async () => {
  await cacheStore.set("city", { aqi: 90 });

  expect(cacheStore.getFromMemory("city")).not.toBeNull();
});
test("get returns memory cache first", async () => {
  await cacheStore.set("hyderabad", { aqi: 120 });

  const value = await cacheStore.get("hyderabad");

  expect(value.data.aqi).toBe(120);
});
test("get returns null for missing key", async () => {
  const value = await cacheStore.get("unknown");

  expect(value).toBeNull();
});
test("invalidate removes cached item", async () => {
  await cacheStore.set("city", { aqi: 50 });

  await cacheStore.invalidate("city");

  expect(cacheStore.getFromMemory("city")).toBeNull();
});
test("invalidate without key clears cache", async () => {
  await cacheStore.set("a", { aqi: 1 });
  await cacheStore.set("b", { aqi: 2 });

      // @ts-ignore
  await cacheStore.invalidate();

  expect(cacheStore.getFromMemory("a")).toBeNull();
  expect(cacheStore.getFromMemory("b")).toBeNull();
});
test("isStale returns false for fresh cache", async () => {
  await cacheStore.set("fresh", { aqi: 100 });

  expect(await cacheStore.isStale("fresh", 100000)).toBe(false);
});
test("isStale returns true for expired cache", async () => {
  await cacheStore.set("old", { aqi: 80 });

  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200000);

  expect(await cacheStore.isStale("old", 1000)).toBe(true);

  vi.restoreAllMocks();
});
test("isStale returns true for missing entry", async () => {
  expect(await cacheStore.isStale("missing", 5000)).toBe(true);
});
test("deduplicate avoids duplicate fetches", async () => {
  const fetcher = vi.fn().mockResolvedValue({ aqi: 70 });

  const [a, b] = await Promise.all([
    cacheStore.deduplicate("key", fetcher),
    cacheStore.deduplicate("key", fetcher),
  ]);

  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(a).toEqual(b);
});
test("deduplicate returns null for empty key", async () => {
  const result = await cacheStore.deduplicate("", vi.fn());

  expect(result).toBeNull();
});
test("deduplicate stores resolved result in memoryCache for subsequent get calls", async () => {
  const fetcher = vi.fn().mockResolvedValue({ aqi: 95 });

  // First deduplicated fetch
  const result1 = await cacheStore.deduplicate("mem-key", fetcher);
  expect(result1).toEqual({ aqi: 95 });
  expect(fetcher).toHaveBeenCalledTimes(1);

  // Subsequent get() should serve from memoryCache instantly — no new fetch
  const fromCache = await cacheStore.get("mem-key");
  expect(fromCache).not.toBeNull();
  expect(fromCache.data).toEqual({ aqi: 95 });

  // A later deduplicate() for the same key fetches again once the first request has
  // settled. This assertion used to run the other way round — it expected the cached
  // value to be replayed and the fetcher never to be called — which is the defect in
  // #690: once a key had been fetched, it was never fetched again for the lifetime of
  // the tab, however old the entry got.
  const fetcher2 = vi.fn().mockResolvedValue({ aqi: 999 });
  const result2 = await cacheStore.deduplicate("mem-key", fetcher2);
  expect(result2).toEqual({ aqi: 999 });
  expect(fetcher2).toHaveBeenCalledTimes(1);
});

test("deduplicate serves a cached value when the caller names a freshness window", async () => {
  const fetcher = vi.fn().mockResolvedValue({ aqi: 95 });
  await cacheStore.deduplicate("ttl-key", fetcher, { ttl: 60_000 });

  const fetcher2 = vi.fn().mockResolvedValue({ aqi: 999 });
  const result = await cacheStore.deduplicate("ttl-key", fetcher2, { ttl: 60_000 });

  expect(result).toEqual({ aqi: 95 });
  expect(fetcher2).not.toHaveBeenCalled();
});

test("deduplicate populates memoryCache even when fetcher is slow", async () => {
  let resolveFetcher;
  const slowFetcher = () =>
    new Promise((resolve) => {
      resolveFetcher = resolve;
    });

  const p1 = cacheStore.deduplicate("slow-key", slowFetcher);
  const p2 = cacheStore.deduplicate("slow-key", slowFetcher);

  // Resolve the underlying fetch
  resolveFetcher({ pm25: 35 });

  const [r1, r2] = await Promise.all([p1, p2]);
  expect(r1).toEqual({ pm25: 35 });
  expect(r2).toEqual({ pm25: 35 });

  // Memory cache should now have the value
  const cached = cacheStore.getFromMemory("slow-key");
  expect(cached).not.toBeNull();
  expect(cached.data).toEqual({ pm25: 35 });
});
