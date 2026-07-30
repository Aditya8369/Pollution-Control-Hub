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