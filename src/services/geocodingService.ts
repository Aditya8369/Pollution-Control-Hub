import { cacheStore } from '../utils/cacheStore';
import { logger } from '../utils/logger';
import type { LocationResult } from '../types/airQuality';

const log = logger.child({ module: 'geocodingService' });

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const GEOCODING_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function searchLocations(
  query: string,
  count = 5,
  signal?: AbortSignal
): Promise<LocationResult[]> {
  if (!query || query.trim() === '') return [];

  const trimmedQuery = query.trim().toLowerCase();
  const cacheKey = `geo_search_${trimmedQuery}_${count}`;

  // The freshness window is passed to deduplicate() rather than checked separately
  // beforehand. The manual pre-check that used to sit here was overruled by
  // deduplicate(), which served the entry from memory whatever its age — so a result
  // older than the 24-hour TTL was returned by the very call that had just decided it
  // was too old to use.
  return cacheStore.deduplicate(cacheKey, async (): Promise<LocationResult[]> => {
    const url = `${GEOCODING_BASE_URL}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;

    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error('Geocoding search failed');
      }

      const data = await response.json();
      if (!data.results) return [];

      const formattedResults: LocationResult[] = data.results.map((result: any) => ({
        id: result.id,
        name: result.name,
        admin1: result.admin1,
        country: result.country,
        lat: result.latitude,
        lon: result.longitude,
        displayName: [result.name, result.admin1, result.country]
          .filter(Boolean)
          .join(', ')
      }));

      // deduplicate() writes the resolved value under `cacheKey`, so writing it here as
      // well only stored the same payload twice with two different timestamps.
      return formattedResults;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        // The query is deliberately not logged: it is what someone typed into a
        // search box, and a place name is a location.
        log.error('Location search failed', { error });
      }
      throw error;
    }
  }, { ttl: GEOCODING_CACHE_TTL });
}