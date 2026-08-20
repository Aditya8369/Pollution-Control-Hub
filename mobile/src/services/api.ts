// mobile/src/services/api.ts
//
// Shared API service for the mobile app (Issue #755).
// Reuses the same Open-Meteo API as the web app, but caches
// responses in SQLite for offline-first access.

import { getCachedData, setCachedData } from '../db/database';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

interface AirQualityParams {
  latitude: number;
  longitude: number;
  hourly?: string[];
}

interface AirQualityResponse {
  current?: {
    pm2_5: number;
    pm10: number;
    no2: number;
    so2: number;
    o3: number;
    co: number;
  };
}

interface ApiResult<T> {
  data: T | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Fetches air quality data from the API with offline-first caching.
 * 
 * 1. Checks SQLite cache for a valid (non-expired) entry.
 * 2. If found, returns it immediately (fromCache = true).
 * 3. If not found or stale, fetches from the API.
 * 4. On success, saves to cache and returns (fromCache = false).
 * 5. On network failure, returns stale cache if available (fromCache = true).
 */
export async function getAirQuality(
  params: AirQualityParams
): Promise<ApiResult<AirQualityResponse>> {
  const cacheKey = `aq_${params.latitude}_${params.longitude}`;
  const ttlSeconds = 5 * 60; // 5 minutes

  // 1. Check cache
  const cached = await getCachedData(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.response_json) as AirQualityResponse;
      return { data: parsed, fromCache: true };
    } catch {
      // Corrupted cache — fall through to API
    }
  }

  // 2. Fetch from API
  const hourlyParams = params.hourly?.join(',') || '';
  const url = `${BASE_URL}?latitude=${params.latitude}&longitude=${params.longitude}&current=pm2_5,pm10,no2,so2,o3,co&hourly=${hourlyParams}&timezone=auto`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: AirQualityResponse = await response.json();

    // 3. Save to cache
    await setCachedData(cacheKey, JSON.stringify(data), ttlSeconds);

    return { data, fromCache: false };
  } catch (err) {
    // 4. Network failed — return stale cache if we have it
    if (cached) {
      try {
        const parsed = JSON.parse(cached.response_json) as AirQualityResponse;
        return { data: parsed, fromCache: true };
      } catch {
        // Corrupted cache
      }
    }

    return {
      data: null,
      fromCache: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
