import { cacheStore } from '../utils/cacheStore';
import type { LocationResult } from '../types/airQuality';

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

  const cached = await cacheStore.get(cacheKey);
  if (cached && cached.data && !(await cacheStore.isStale(cacheKey, GEOCODING_CACHE_TTL))) {
    return cached.data;
  }

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

      await cacheStore.set(cacheKey, formattedResults);
      return formattedResults;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching location data:', error);
      }
      throw error;
    }
  });
}