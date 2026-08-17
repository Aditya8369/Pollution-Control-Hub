import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cacheStore } from '../utils/cacheStore';

/**
 * The deduplicate() contract, after #690.
 *
 * deduplicate() joins a request that is already in flight. It is not a cache read
 * unless the caller asks for one by naming the age it will accept, which is the same
 * shape getFresh(key, ttl) and isStale(key, ttl) already use.
 *
 * Before this, it served getFromMemory(key) with no ttl — and a missing ttl means
 * "never expires" — so the first payload fetched for a key was replayed for the
 * lifetime of the tab and no caller could get past it.
 */

/** Seeds the memory tier with an entry written `ageMs` ago. */
function seedAged(key, data, ageMs) {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - ageMs);
  cacheStore.set(key, data);
  spy.mockRestore();
}

/** A promise plus the handles to settle it, so a fetch can be held open. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

describe('deduplicate - in-flight joining', () => {
  it('runs the fetcher once for concurrent callers and gives them all the same value', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 70 });

    const results = await Promise.all([
      cacheStore.deduplicate('join', fetcher),
      cacheStore.deduplicate('join', fetcher),
      cacheStore.deduplicate('join', fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ aqi: 70 }, { aqi: 70 }, { aqi: 70 }]);
  });

  it('joins an in-flight request even when the caller named a ttl', async () => {
    const gate = deferred();
    const fetcher = vi.fn(() => gate.promise);

    const first = cacheStore.deduplicate('join-ttl', fetcher, { ttl: 60_000 });
    const second = cacheStore.deduplicate('join-ttl', fetcher, { ttl: 60_000 });

    gate.resolve({ aqi: 12 });

    expect(await first).toEqual({ aqi: 12 });
    expect(await second).toEqual({ aqi: 12 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not join requests for different keys', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 5 });

    await Promise.all([
      cacheStore.deduplicate('key-a', fetcher),
      cacheStore.deduplicate('key-b', fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns null for an empty key without calling the fetcher', async () => {
    const fetcher = vi.fn();

    expect(await cacheStore.deduplicate('', fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('deduplicate - no ttl means fetch', () => {
  it('fetches again once the previous request has settled', async () => {
    const first = vi.fn().mockResolvedValue({ aqi: 40 });
    const second = vi.fn().mockResolvedValue({ aqi: 180 });

    expect(await cacheStore.deduplicate('sequential', first)).toEqual({ aqi: 40 });
    expect(await cacheStore.deduplicate('sequential', second)).toEqual({ aqi: 180 });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('ignores an entry of any age when no ttl is given', async () => {
    seedAged('ancient', { aqi: 42 }, 3 * 60 * 60 * 1000);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 99 });

    expect(await cacheStore.deduplicate('ancient', fetcher)).toEqual({ aqi: 99 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('still writes the fetched value to the cache', async () => {
    const fetcher = vi.fn().mockResolvedValue({ aqi: 33 });

    await cacheStore.deduplicate('written', fetcher);

    const entry = cacheStore.getFromMemory('written');
    expect(entry).not.toBeNull();
    expect(entry.data).toEqual({ aqi: 33 });
  });
});

describe('deduplicate - ttl decides whether a cached value is served', () => {
  it('serves an entry inside the window without fetching', async () => {
    seedAged('fresh', { aqi: 42 }, 1000);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 99 });

    expect(await cacheStore.deduplicate('fresh', fetcher, { ttl: 60_000 })).toEqual({ aqi: 42 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches when the entry has aged past the window', async () => {
    seedAged('aged', { aqi: 42 }, 10 * 60 * 1000);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 99 });

    expect(await cacheStore.deduplicate('aged', fetcher, { ttl: 5 * 60 * 1000 })).toEqual({ aqi: 99 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('treats the boundary as expired, matching isStale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    await cacheStore.set('boundary', { aqi: 1 });
    vi.advanceTimersByTime(1000);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 2 });
    const result = await cacheStore.deduplicate('boundary', fetcher, { ttl: 1000 });

    expect(await cacheStore.isStale('boundary', 1000)).toBe(false); // rewritten by the fetch
    expect(result).toEqual({ aqi: 2 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('fetches when ttl is not a usable number', async () => {
    seedAged('nan-ttl', { aqi: 42 }, 1000);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 99 });

    expect(await cacheStore.deduplicate('nan-ttl', fetcher, { ttl: Number.NaN })).toEqual({ aqi: 99 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves a legitimately falsy cached payload rather than refetching it', async () => {
    seedAged('empty-results', [], 1000);

    const fetcher = vi.fn().mockResolvedValue(['something']);

    expect(await cacheStore.deduplicate('empty-results', fetcher, { ttl: 60_000 })).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('deduplicate - failures', () => {
  it('propagates a rejection and lets the next call retry', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(cacheStore.deduplicate('flaky', failing)).rejects.toThrow('network down');

    const recovering = vi.fn().mockResolvedValue({ aqi: 7 });
    expect(await cacheStore.deduplicate('flaky', recovering)).toEqual({ aqi: 7 });
    expect(recovering).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected result', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('nope'));

    await expect(cacheStore.deduplicate('nothing-stored', failing)).rejects.toThrow('nope');

    expect(cacheStore.getFromMemory('nothing-stored')).toBeNull();
  });

  it('recovers from a fetcher that throws synchronously', async () => {
    // A synchronous throw used to leave a rejected promise parked under the key: the
    // finally that clears it ran before the promise was registered, so every later
    // call for that key replayed the same rejection.
    const throwing = vi.fn(() => {
      throw new Error('bad argument');
    });

    await expect(cacheStore.deduplicate('sync-throw', throwing)).rejects.toThrow('bad argument');

    const recovering = vi.fn().mockResolvedValue({ aqi: 21 });
    expect(await cacheStore.deduplicate('sync-throw', recovering)).toEqual({ aqi: 21 });
  });
});

describe('deduplicate - the reported symptoms', () => {
  it('a per-city key refreshes on the next cycle instead of replaying the first load', async () => {
    // fetchCityComparisons de-duplicates each city on `aqi_lite_<lat>_<lon>`. Auto
    // refresh invalidates the list key, not these, so before #690 the readings under
    // them were the ones fetched when the tab was opened, for as long as it stayed open.
    const key = 'aqi_lite_28.6139_77.209';
    const ttl = 5 * 60 * 1000;

    const firstLoad = vi.fn().mockResolvedValue({ current: { us_aqi: 212 } });
    expect(await cacheStore.deduplicate(key, firstLoad, { ttl })).toEqual({ current: { us_aqi: 212 } });

    // Six minutes later, past the 5-minute window the caller asked for.
    const entry = cacheStore.getFromMemory(key);
    entry.timestamp -= 6 * 60 * 1000;

    const nextCycle = vi.fn().mockResolvedValue({ current: { us_aqi: 96 } });
    expect(await cacheStore.deduplicate(key, nextCycle, { ttl })).toEqual({ current: { us_aqi: 96 } });
    expect(nextCycle).toHaveBeenCalledTimes(1);
  });

  it('a stale-triggered revalidation gets new data, not the entry it just rejected', async () => {
    // useSWR.revalidate() asks isStale() first and only reaches deduplicate() when the
    // answer is yes. It then used to be handed the very entry isStale() had rejected.
    const key = 'aqi-key';
    const ttl = 5 * 60 * 1000;
    seedAged(key, { aqi: 42 }, 3 * 60 * 60 * 1000);

    expect(await cacheStore.isStale(key, ttl)).toBe(true);

    const fetcher = vi.fn().mockResolvedValue({ aqi: 99 });
    expect(await cacheStore.deduplicate(key, fetcher)).toEqual({ aqi: 99 });
  });
});
