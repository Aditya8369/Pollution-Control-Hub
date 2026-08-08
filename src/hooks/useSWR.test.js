import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSWR } from './useSWR';
import { cacheStore } from '../utils/cacheStore';

const TTL = 5 * 60 * 1000;

/** Seeds the in-memory tier with an entry written `ageMs` ago. */
function seedMemory(key, data, ageMs) {
  // Reaches through cacheStore.set()'s Date.now() stamp by rewriting the timestamp,
  // which is the only way to produce an aged entry without faking the clock globally.
  const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - ageMs);
  cacheStore.set(key, data);
  spy.mockRestore();
}

/**
 * Lets the revalidate promise chain settle inside act().
 *
 * The assertions here are about the *synchronous* seed, so several tests finish
 * before the async revalidate resolves. Without this the settle lands outside act()
 * and React warns.
 */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await cacheStore.invalidate();
  vi.stubGlobal('indexedDB', undefined);
});

afterEach(async () => {
  await cacheStore.invalidate();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useSWR - initial cache read honours ttl (regression for #648)', () => {
  it('treats an entry older than ttl as a miss', async () => {
    seedMemory('aq_stale', { aqi: 42 }, 3 * 60 * 60 * 1000); // 3 hours old

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 99 }));
    const { result } = renderHook(() => useSWR('aq_stale', fetcher, { ttl: TTL }));

    // The bug: the 3-hour-old payload was handed back as `data` with isValidating
    // false, so the consumer rendered it as current with no loading state.
    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(true);

    await waitFor(() => expect(result.current.data).toEqual({ aqi: 99 }));
  });

  it('still serves an entry inside ttl without refetching', async () => {
    seedMemory('aq_fresh', { aqi: 42 }, 1000); // 1 second old

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 99 }));
    const { result } = renderHook(() => useSWR('aq_fresh', fetcher, { ttl: TTL }));

    expect(result.current.data).toEqual({ aqi: 42 });
    expect(result.current.isValidating).toBe(false);

    await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
  });

  it('respects a short ttl', async () => {
    seedMemory('aq_short', { aqi: 42 }, 2000);

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 99 }));
    const { result } = renderHook(() => useSWR('aq_short', fetcher, { ttl: 1000 }));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(true);

    await settle();
  });

  it('respects a long ttl', async () => {
    seedMemory('aq_long', { aqi: 42 }, 30 * 60 * 1000); // 30 minutes

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 99 }));
    const { result } = renderHook(() =>
      useSWR('aq_long', fetcher, { ttl: 60 * 60 * 1000 })
    );

    expect(result.current.data).toEqual({ aqi: 42 });
    expect(result.current.isValidating).toBe(false);

    await settle();
  });

  it('reports a loading state on a cold cache', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ aqi: 7 }));
    const { result } = renderHook(() => useSWR('aq_cold', fetcher, { ttl: TTL }));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(true);

    await waitFor(() => expect(result.current.data).toEqual({ aqi: 7 }));
    expect(result.current.isValidating).toBe(false);
  });
});

describe('useSWR - key changes', () => {
  it('does not serve a stale entry when switching back to a previous key', async () => {
    // Switch city, switch back. The revisited key's entry has aged past ttl and must
    // not be presented as current.
    seedMemory('city_delhi', { aqi: 300 }, 2 * 60 * 60 * 1000);

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 111 }));
    const { result, rerender } = renderHook(
      ({ k }) => useSWR(k, fetcher, { ttl: TTL }),
      { initialProps: { k: 'city_mumbai' } }
    );

    await waitFor(() => expect(result.current.data).toEqual({ aqi: 111 }));

    rerender({ k: 'city_delhi' });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(true);

    await settle();
  });

  it('serves a fresh entry immediately when switching to it', async () => {
    seedMemory('city_pune', { aqi: 55 }, 1000);

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 111 }));
    const { result, rerender } = renderHook(
      ({ k }) => useSWR(k, fetcher, { ttl: TTL }),
      { initialProps: { k: 'city_other' } }
    );

    await waitFor(() => expect(result.current.data).toEqual({ aqi: 111 }));

    rerender({ k: 'city_pune' });

    expect(result.current.data).toEqual({ aqi: 55 });
    expect(result.current.isValidating).toBe(false);

    await settle();
  });

  it('clears a previous key error when the key changes', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ aqi: 1 });

    const { result, rerender } = renderHook(
      ({ k }) => useSWR(k, fetcher, { ttl: TTL }),
      { initialProps: { k: 'key_a' } }
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());

    rerender({ k: 'key_b' });

    expect(result.current.error).toBeNull();

    await settle();
  });
});

describe('useSWR - falsy payloads', () => {
  it('treats a cached falsy payload as a hit, not a miss', async () => {
    // `!getInitialData()` counted 0 / '' / null as "nothing cached", so a legitimately
    // falsy payload triggered a refetch on every mount and reported isValidating true.
    seedMemory('count_key', 0, 1000);

    const fetcher = vi.fn(() => Promise.resolve(99));
    const { result } = renderHook(() => useSWR('count_key', fetcher, { ttl: TTL }));

    expect(result.current.data).toBe(0);
    expect(result.current.isValidating).toBe(false);

    await settle();
  });
});

describe('useSWR - null key', () => {
  it('stays idle and never fetches without a key', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ aqi: 1 }));
    const { result } = renderHook(() => useSWR(null, fetcher, { ttl: TTL }));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();

    await settle();
  });

  it('begins fetching once a key arrives', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ aqi: 5 }));
    const { result, rerender } = renderHook(
      ({ k }) => useSWR(k, fetcher, { ttl: TTL }),
      { initialProps: { k: null } }
    );

    expect(fetcher).not.toHaveBeenCalled();

    rerender({ k: 'now_present' });

    await waitFor(() => expect(result.current.data).toEqual({ aqi: 5 }));
  });
});

describe('useSWR - mutate', () => {
  it('refetches past a fresh cache entry', async () => {
    seedMemory('mut_key', { aqi: 10 }, 1000);

    const fetcher = vi.fn(() => Promise.resolve({ aqi: 20 }));
    const { result } = renderHook(() => useSWR('mut_key', fetcher, { ttl: TTL }));

    expect(result.current.data).toEqual({ aqi: 10 });

    await act(async () => {
      await result.current.mutate();
    });

    expect(fetcher).toHaveBeenCalled();
    await waitFor(() => expect(result.current.data).toEqual({ aqi: 20 }));
  });
});
