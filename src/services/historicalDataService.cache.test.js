import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchHistoricalData,
  getCachedData,
  setCachedData,
  pruneCache,
  HISTORY_CACHE_TTL,
} from './historicalDataService';

/**
 * A minimal in-memory stand-in for the slice of IndexedDB this module uses:
 * open -> transaction -> objectStore -> get/put/delete/getAll.
 *
 * Requests resolve on a macrotask so handlers attached after the call still fire,
 * matching how the real API behaves.
 */
function createFakeIndexedDB({ failWrites = false, failOpen = false } = {}) {
  const records = new Map();

  function request(resultFn) {
    const req = { onsuccess: null, onerror: null, result: undefined, error: null };
    setTimeout(() => {
      try {
        req.result = resultFn();
        req.onsuccess?.({ target: req });
      } catch (err) {
        req.error = err;
        req.onerror?.({ target: req });
      }
    }, 0);
    return req;
  }

  const store = {
    get: (id) => request(() => records.get(id)),
    put: (record) =>
      request(() => {
        if (failWrites) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        records.set(record.id, record);
        return record.id;
      }),
    delete: (id) => request(() => records.delete(id)),
    getAll: () => request(() => [...records.values()]),
  };

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction: () => ({ objectStore: () => store }),
  };

  return {
    records,
    api: {
      open: () => {
        const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: db, error: null };
        setTimeout(() => {
          if (failOpen) {
            req.error = new Error('open blocked');
            req.onerror?.({ target: req });
          } else {
            req.onsuccess?.({ target: req });
          }
        }, 0);
        return req;
      },
    },
  };
}

const PAYLOAD = { hourly: { time: ['2024-03-01T00:00'], us_aqi: [55] } };

function mockFetchOk(payload = PAYLOAD) {
  return vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }));
}

let fake;

beforeEach(() => {
  fake = createFakeIndexedDB();
  vi.stubGlobal('indexedDB', fake.api);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getCachedData - freshness (regression for #649)', () => {
  it('returns an entry inside the ttl', async () => {
    await setCachedData('k1', { v: 1 });

    expect(await getCachedData('k1')).toEqual({ v: 1 });
  });

  it('treats an entry past the ttl as absent', async () => {
    fake.records.set('k1', {
      id: 'k1',
      data: { v: 1 },
      timestamp: Date.now() - (HISTORY_CACHE_TTL + 1000),
    });

    // The stored timestamp was written from the start and never read; entries came
    // back at any age.
    expect(await getCachedData('k1')).toBeNull();
  });

  it('honours an explicit ttl', async () => {
    fake.records.set('k1', { id: 'k1', data: { v: 1 }, timestamp: Date.now() - 5000 });

    expect(await getCachedData('k1', 1000)).toBeNull();
    expect(await getCachedData('k1', 10000)).toEqual({ v: 1 });
  });

  it('returns null rather than throwing when the store is unreadable', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ failOpen: true }).api);

    expect(await getCachedData('k1')).toBeNull();
  });

  it('returns null when IndexedDB is unavailable entirely', async () => {
    vi.stubGlobal('indexedDB', undefined);

    expect(await getCachedData('k1')).toBeNull();
  });
});

describe('setCachedData - failures are not fatal', () => {
  it('reports a quota failure instead of throwing', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ failWrites: true }).api);

    await expect(setCachedData('k1', { v: 1 })).resolves.toBe(false);
  });

  it('reports success when the write lands', async () => {
    await expect(setCachedData('k1', { v: 1 })).resolves.toBe(true);
  });

  it('does not throw when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(setCachedData('k1', { v: 1 })).resolves.toBe(false);
  });
});

describe('fetchHistoricalData - a cache failure must not lose a good fetch', () => {
  it('returns the fetched payload when the cache write fails on quota', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ failWrites: true }).api);
    vi.stubGlobal('fetch', mockFetchOk());

    // The bug: setCachedData rejected, the await propagated, and the panel showed
    // "Failed to load historical data" for a request that had actually succeeded.
    await expect(fetchHistoricalData(28.6, 77.2, 3)).resolves.toEqual(PAYLOAD);
  });

  it('returns the fetched payload when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('fetch', mockFetchOk());

    await expect(fetchHistoricalData(28.6, 77.2, 3)).resolves.toEqual(PAYLOAD);
  });

  it('returns the fetched payload when the database will not open', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ failOpen: true }).api);
    vi.stubGlobal('fetch', mockFetchOk());

    await expect(fetchHistoricalData(28.6, 77.2, 3)).resolves.toEqual(PAYLOAD);
  });

  it('still surfaces a genuine network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));

    await expect(fetchHistoricalData(28.6, 77.2, 3)).rejects.toThrow(
      /Failed to fetch historical AQI data/
    );
  });
});

describe('fetchHistoricalData - cache reuse and growth', () => {
  it('serves a second call from cache without refetching', async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await fetchHistoricalData(28.6, 77.2, 3);
    await fetchHistoricalData(28.6, 77.2, 3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps one entry per location and window rather than one per day', async () => {
    vi.stubGlobal('fetch', mockFetchOk());

    await fetchHistoricalData(28.6, 77.2, 3);

    // The old key embedded today's date, so this would have grown by one full
    // multi-megabyte payload at every local midnight, with nothing ever removed.
    expect(fake.records.size).toBe(1);
    expect([...fake.records.keys()][0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('supersedes an older entry for the same location on write', async () => {
    vi.stubGlobal('fetch', mockFetchOk());

    // An entry left behind by the previous key scheme.
    fake.records.set('history_export_28.6000_77.2000_2023-01-01_2024-01-01', {
      id: 'history_export_28.6000_77.2000_2023-01-01_2024-01-01',
      data: { stale: true },
      timestamp: Date.now(),
    });

    await fetchHistoricalData(28.6, 77.2, 3);

    expect(fake.records.size).toBe(1);
    expect([...fake.records.keys()][0]).toBe('history_export_28.6000_77.2000_3y');
  });

  it('keeps entries belonging to other locations', async () => {
    vi.stubGlobal('fetch', mockFetchOk());

    fake.records.set('history_export_19.0000_72.8000_3y', {
      id: 'history_export_19.0000_72.8000_3y',
      data: { other: true },
      timestamp: Date.now(),
    });

    await fetchHistoricalData(28.6, 77.2, 3);

    expect(fake.records.size).toBe(2);
    expect(fake.records.has('history_export_19.0000_72.8000_3y')).toBe(true);
  });

  it('refetches once the cached entry ages past the ttl', async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await fetchHistoricalData(28.6, 77.2, 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const key = 'history_export_28.6000_77.2000_3y';
    fake.records.get(key).timestamp = Date.now() - (HISTORY_CACHE_TTL + 1000);

    await fetchHistoricalData(28.6, 77.2, 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keys different window lengths separately', async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await fetchHistoricalData(28.6, 77.2, 1);
    await fetchHistoricalData(28.6, 77.2, 3);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('pruneCache', () => {
  it('drops entries past the maximum age regardless of location', async () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fake.records.set('a', { id: 'a', data: {}, timestamp: old });
    fake.records.set('b', { id: 'b', data: {}, timestamp: Date.now() });

    const removed = await pruneCache();

    expect(removed).toBe(1);
    expect(fake.records.has('a')).toBe(false);
    expect(fake.records.has('b')).toBe(true);
  });

  it('never removes the entry it was told to keep', async () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fake.records.set('keep', { id: 'keep', data: {}, timestamp: old });

    await pruneCache('', 'keep');

    expect(fake.records.has('keep')).toBe(true);
  });

  it('returns 0 rather than throwing when the store is unusable', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ failOpen: true }).api);

    await expect(pruneCache()).resolves.toBe(0);
  });
});
