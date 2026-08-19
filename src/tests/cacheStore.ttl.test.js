import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cacheStore } from '../utils/cacheStore';

/**
 * Additional unit test coverage for cacheStore.js, expanding on the existing
 * src/tests/cacheStore.test.js suite.
 *
 * Focus areas: overwriting values, TTL expiration (using fake timers rather than
 * real delays), getFromMemory/getFresh freshness handling, and deduplicate's
 * behaviour across distinct keys and failing fetchers.
 */

beforeEach(async () => {
  // @ts-ignore
  await cacheStore.invalidate();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('set - overwriting values', () => {
  it('overwrites an existing key with the new value', async () => {
    await cacheStore.set('city', { aqi: 10 });
    await cacheStore.set('city', { aqi: 99 });

    const entry = cacheStore.getFromMemory('city');
    expect(entry.data.aqi).toBe(99);
  });

  it('refreshes the timestamp when a key is overwritten', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('city', { aqi: 10 });
    const firstEntry = cacheStore.getFromMemory('city');

    vi.setSystemTime(5000);
    await cacheStore.set('city', { aqi: 20 });
    const secondEntry = cacheStore.getFromMemory('city');

    expect(secondEntry.timestamp).toBeGreaterThan(firstEntry.timestamp);
    expect(secondEntry.data.aqi).toBe(20);
  });
});

describe('getFromMemory - TTL handling', () => {
  it('returns the entry while it is within the TTL window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('fresh', { aqi: 42 });
    vi.advanceTimersByTime(500);

    const entry = cacheStore.getFromMemory('fresh', 1000);
    expect(entry).not.toBeNull();
    expect(entry.data.aqi).toBe(42);
  });

  it('returns null once the entry has aged past the TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('stale', { aqi: 42 });
    vi.advanceTimersByTime(1500);

    expect(cacheStore.getFromMemory('stale', 1000)).toBeNull();
  });

  it('treats a missing TTL as "never expires"', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('no-ttl', { aqi: 42 });
    vi.advanceTimersByTime(10_000_000);

    expect(cacheStore.getFromMemory('no-ttl')).not.toBeNull();
  });
});

describe('getFresh - TTL handling', () => {
  it('returns null for a key that was never set', async () => {
    expect(await cacheStore.getFresh('missing', 1000)).toBeNull();
  });

  it('returns the entry while still within the TTL window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('fresh', { aqi: 55 });
    vi.advanceTimersByTime(200);

    const entry = await cacheStore.getFresh('fresh', 1000);
    expect(entry).not.toBeNull();
    expect(entry.data.aqi).toBe(55);
  });

  it('returns null once the entry has expired, forcing a re-fetch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('expiring', { aqi: 55 });
    vi.advanceTimersByTime(2000);

    expect(await cacheStore.getFresh('expiring', 1000)).toBeNull();
  });
});

describe('isStale - boundary and fake-timer behaviour', () => {
  it('is not stale a moment before the TTL elapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('city', { aqi: 1 });
    vi.advanceTimersByTime(999);

    expect(await cacheStore.isStale('city', 1000)).toBe(false);
  });

  it('is stale exactly at the TTL boundary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cacheStore.set('city', { aqi: 1 });
    vi.advanceTimersByTime(1000);

    expect(await cacheStore.isStale('city', 1000)).toBe(true);
  });
});

describe('deduplicate - additional behaviour', () => {
  it('fetches independently for different keys', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 5 });

    await Promise.all([
      cacheStore.deduplicate('key-a', fetcher),
      cacheStore.deduplicate('key-b', fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('allows a fresh fetch once the in-flight promise has resolved', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 5 });

    await cacheStore.deduplicate('key', fetcher);
    await cacheStore.deduplicate('key', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('propagates a fetcher rejection and clears the in-flight entry', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(cacheStore.deduplicate('failing', fetcher)).rejects.toThrow(
      'network down'
    );

    // A second call after the failure should retry rather than replay the rejection.
    const retryFetcher = vi.fn().mockResolvedValue({ aqi: 7 });
    const result = await cacheStore.deduplicate('failing', retryFetcher);

    expect(result).toEqual({ aqi: 7 });
    expect(retryFetcher).toHaveBeenCalledTimes(1);
  });

  it('caches the fetched value under the given key', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 33 });

    await cacheStore.deduplicate('cached-key', fetcher);

    expect(cacheStore.getFromMemory('cached-key').data).toEqual({ aqi: 33 });
  });
});

describe('onPersistenceError / isPersistenceDegraded', () => {
  it('starts in a non-degraded state', () => {
    expect(cacheStore.isPersistenceDegraded()).toBe(false);
  });

  it('returns an unsubscribe function that stops future notifications', () => {
    const listener = vi.fn();
    const unsubscribe = cacheStore.onPersistenceError(listener);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    // Unsubscribing twice, or before any error fires, must not throw.
    expect(() => unsubscribe()).not.toThrow();
  });
});