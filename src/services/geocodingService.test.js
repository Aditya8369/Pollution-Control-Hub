import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLocations } from '../services/geocodingService';
import { cacheStore } from '../utils/cacheStore';

describe('geocodingService - searchLocations caching & deduplication', () => {
  beforeEach(async () => {
    // @ts-ignore
    if (cacheStore.memoryStore) cacheStore.memoryStore.clear();
    vi.restoreAllMocks();
  });

  it('caches location search results for repeated queries', async () => {
    const mockResults = {
      results: [
        { id: 1, name: 'Mumbai', admin1: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777 }
      ]
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResults
    });
    vi.stubGlobal('fetch', fetchSpy);

    const firstCall = await searchLocations('Mumbai');
    expect(firstCall).toHaveLength(1);
    expect(firstCall[0].name).toBe('Mumbai');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call with same query should hit cache and not call fetch again
    const secondCall = await searchLocations('Mumbai');
    expect(secondCall).toHaveLength(1);
    expect(secondCall[0].name).toBe('Mumbai');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent search requests for the same query', async () => {
    const mockResults = {
      results: [
        { id: 2, name: 'Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 }
      ]
    };

    const fetchSpy = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        json: async () => mockResults
      };
    });
    vi.stubGlobal('fetch', fetchSpy);

    const [res1, res2] = await Promise.all([
      searchLocations('Delhi'),
      searchLocations('Delhi')
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(res2);
  });
});
