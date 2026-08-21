// src/services/historicalExplorerService.js
// -----------------------------------------------------------------------------
// Issue #892 — Historical Pollution Explorer
//
// Thin wrapper around `historicalDataService.fetchHistoricalData` and
// `historicalAggregate.aggregateHourlyToDaily` that adds:
//
//   - fetchHistoricalDaily(lat, lon, years) — one-shot fetch + aggregate
//   - fetchHistoricalForLocations(locations, years) — parallel fetch +
//     aggregate for multiple cities, used by the comparison view.
// -----------------------------------------------------------------------------

import { fetchHistoricalData } from './historicalDataService';
import { aggregateHourlyToDaily } from '../utils/historicalAggregate';

export async function fetchHistoricalDaily(lat, lon, years = 1) {
  const raw = await fetchHistoricalData(lat, lon, years);
  return aggregateHourlyToDaily(raw);
}

export async function fetchHistoricalForLocations(locations, years = 1) {
  if (!Array.isArray(locations) || locations.length === 0) return [];

  const settled = await Promise.allSettled(
    locations.map((loc) => fetchHistoricalDaily(loc.lat, loc.lon, years)),
  );

  return settled.map((res, i) => {
    const location = locations[i];
    if (res.status === 'fulfilled') {
      return { location, data: res.value, error: null };
    }
    const msg =
      res.reason instanceof Error
        ? res.reason.message
        : 'Failed to fetch historical data';
    return { location, data: null, error: msg };
  });
}
