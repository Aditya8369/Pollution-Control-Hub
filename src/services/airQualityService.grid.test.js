import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLocalGrid, CACHE_TTL } from './airQualityService';
import { cacheStore } from '../utils/cacheStore';

/**
 * Regression cover for #547.
 *
 * fetchLocalGrid collapsed every failed point to `aqi: 0`, filtered those out, and then
 * cached the resulting empty array with a fresh timestamp. Because `getFresh` treats a
 * cached [] as a hit, one transient outage blanked the hotspot panel for the full
 * 5-minute TTL and no amount of refreshing cleared it.
 */

vi.mock('../workers/apiWorker?worker', () => ({
  default: class MockWorker {
    postMessage() {}
    terminate() {}
  },
}));

/** Response shape for a single grid point reporting `aqi` for the current hour. */
function gridPayload(aqi) {
  const today = new Date().toISOString().split('T')[0];
  const times = Array.from(
    { length: 24 },
    (_, i) => `${today}T${String(i).padStart(2, '0')}:00`
  );
  return {
    utc_offset_seconds: 0,
    hourly: { time: times, us_aqi: times.map(() => aqi) },
  };
}

describe('fetchLocalGrid - failure caching (regression for #547)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('does not cache an empty result produced by a total outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    );

    const points = await fetchLocalGrid(28.6139, 77.209);
    expect(points).toEqual([]);

    // The empty array must not have been written; the next call has to retry.
    const cacheKey = `grid-${(28.6139).toFixed(2)},${(77.209).toFixed(2)}`;
    const stored = await cacheStore.getFresh(cacheKey, CACHE_TTL.GRID);
    expect(stored).toBeNull();
  });

  it('retries after an outage instead of replaying the blank panel', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchLocalGrid(28.6139, 77.209)).toEqual([]);
    const callsAfterFailure = fetchMock.mock.calls.length;

    // The endpoint comes back.
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => gridPayload(140),
    }));

    const points = await fetchLocalGrid(28.6139, 77.209);

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFailure);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0].aqi).toBe(140);
  });

  it('caches a healthy result so the 8 requests are not repeated', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => gridPayload(90) }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchLocalGrid(28.6139, 77.209);
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBe(8);

    await fetchLocalGrid(28.6139, 77.209);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it('caches a partial result once enough points answered', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      // 4 of the 8 points answer.
      return call % 2 === 0
        ? { ok: true, json: async () => gridPayload(70) }
        : { ok: false, status: 503, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const points = await fetchLocalGrid(28.6139, 77.209);
    expect(points.length).toBe(4);

    const cacheKey = `grid-${(28.6139).toFixed(2)},${(77.209).toFixed(2)}`;
    const stored = await cacheStore.getFresh(cacheKey, CACHE_TTL.GRID);
    expect(stored).not.toBeNull();
    expect(stored.data).toHaveLength(4);
  });

  it('does not cache when only a couple of points answered', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      // Just 2 of 8 — below the threshold worth trusting.
      return call <= 2
        ? { ok: true, json: async () => gridPayload(70) }
        : { ok: false, status: 503, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const points = await fetchLocalGrid(28.6139, 77.209);
    expect(points).toHaveLength(2);

    const cacheKey = `grid-${(28.6139).toFixed(2)},${(77.209).toFixed(2)}`;
    expect(await cacheStore.getFresh(cacheKey, CACHE_TTL.GRID)).toBeNull();
  });
});

describe('fetchLocalGrid - cache key precision (regression for #547)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('does not serve one area\'s grid for another several km away', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => gridPayload(80) }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchLocalGrid(28.6139, 77.209);
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBe(8);

    // ~3.3 km north. Both centres round to "28.6,77.2" at one decimal, so under the old
    // key this was a cache hit and the first area's points were plotted for the second.
    await fetchLocalGrid(28.6439, 77.209);

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst + 8);
  });

  it('keys the two nearby centres separately', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => gridPayload(80) }))
    );

    await fetchLocalGrid(28.6139, 77.209);
    await fetchLocalGrid(28.6439, 77.209);

    const first = await cacheStore.getFresh('grid-28.61,77.21', CACHE_TTL.GRID);
    const second = await cacheStore.getFresh('grid-28.64,77.21', CACHE_TTL.GRID);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // The single bucket both used to share.
    expect(await cacheStore.getFresh('grid-28.6,77.2', CACHE_TTL.GRID)).toBeNull();
  });

  it('still reuses the cache for the same location', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => gridPayload(80) }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchLocalGrid(28.6139, 77.209);
    const calls = fetchMock.mock.calls.length;
    // Sub-metre jitter still rounds into the same 2-decimal bucket.
    await fetchLocalGrid(28.6141, 77.2093);

    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});

describe('fetchLocalGrid - error isolation (regression for #547)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(async () => {
    await cacheStore.invalidate();
  });

  it('survives a thrown network error instead of rejecting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );

    // Previously this rejection escaped Promise.all and took the whole
    // fetchAirQualityByCoords call down with it.
    await expect(fetchLocalGrid(28.6139, 77.209)).resolves.toEqual([]);
  });

  it('keeps the points that succeeded when others throw', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call += 1;
        if (call % 2 === 1) throw new TypeError('Failed to fetch');
        return { ok: true, json: async () => gridPayload(110) };
      })
    );

    const points = await fetchLocalGrid(28.6139, 77.209);
    expect(points).toHaveLength(4);
    expect(points.every((p) => p.aqi === 110)).toBe(true);
  });

  it('still propagates an abort rather than swallowing it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('Aborted', 'AbortError');
      })
    );

    await expect(fetchLocalGrid(28.6139, 77.209)).rejects.toThrow(/abort/i);
  });

  it('treats a null reading as unmeasured rather than as clean air', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => gridPayload(null) }))
    );

    const points = await fetchLocalGrid(28.6139, 77.209);
    expect(points).toEqual([]);

    // ...and a result with no evidence behind it is not cached.
    const cacheKey = `grid-${(28.6139).toFixed(2)},${(77.209).toFixed(2)}`;
    expect(await cacheStore.getFresh(cacheKey, CACHE_TTL.GRID)).toBeNull();
  });
});
