import { cacheStore } from '../utils/cacheStore';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * Formats a Date object as YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates averages of a series of numbers.
 * @param {number[]} values
 * @returns {number|null}
 */
export function mean(values) {
  const filtered = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

/**
 * Aggregates hourly AQI readings into daily averages, then weekly/monthly.
 * @param {any} rawData - Response from Open-Meteo API.
 * @returns {{ weekly: number|null, monthly: number|null, prediction: number|null }}
 */
export function aggregateHistoricalAQI(rawData) {
  const hourly = rawData?.hourly || {};
  const times = hourly.time || [];
  const usAqi = hourly.us_aqi || [];

  if (times.length === 0) {
    return { weekly: null, monthly: null, prediction: null };
  }

  // 1. Group hourly AQI values by day (YYYY-MM-DD)
  const dailyBuckets = {};
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (!time) continue;
    const dateStr = time.split('T')[0];
    const val = usAqi[i];
    if (typeof val === 'number' && Number.isFinite(val)) {
      if (!dailyBuckets[dateStr]) {
        dailyBuckets[dateStr] = [];
      }
      dailyBuckets[dateStr].push(val);
    }
  }

  // 2. Calculate daily averages
  const dailyAverages = [];
  const sortedDates = Object.keys(dailyBuckets).sort();
  for (const dateStr of sortedDates) {
    const avg = mean(dailyBuckets[dateStr]);
    if (avg !== null) {
      dailyAverages.push({ date: dateStr, avg });
    }
  }

  if (dailyAverages.length === 0) {
    return { weekly: null, monthly: null, prediction: null };
  }

  // 3. Weekly Average (last 7 days of daily averages)
  const weeklySlice = dailyAverages.slice(-7);
  const weeklyAvg = mean(weeklySlice.map(d => d.avg));

  // 4. Monthly Average (last 30 days of daily averages)
  const monthlyAvg = mean(dailyAverages.map(d => d.avg));

  // 5. Prediction (same as baseline estimation: recent average * 1.08)
  const recentDay = dailyAverages[dailyAverages.length - 1];
  const prediction = recentDay ? Math.round(recentDay.avg * 1.08) : null;

  return {
    weekly: weeklyAvg !== null ? Math.round(weeklyAvg) : null,
    monthly: monthlyAvg !== null ? Math.round(monthlyAvg) : null,
    prediction
  };
}

/**
 * Fetches 30 days of historical data and precomputes daily/weekly averages.
 * Serves from cacheStore when fresh (24 hours TTL).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ weekly: number|null, monthly: number|null, prediction: number|null }>}
 */
export async function getPrecomputedAverages(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return { weekly: null, monthly: null, prediction: null };
  }

  const cacheKey = `precomputed_aqi_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const TTL_24H = 24 * 60 * 60 * 1000;

  // Check if cache holds a fresh precomputed copy (nightly refresh equivalent)
  const cached = await cacheStore.getFresh(cacheKey, TTL_24H);
  if (cached && cached.data) {
    return cached.data;
  }

  try {
    const endDateObj = new Date();
    const startDateObj = new Date();
    startDateObj.setDate(endDateObj.getDate() - 30);

    const startDate = formatDate(startDateObj);
    const endDate = formatDate(endDateObj);

    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data for precomputation. Status: ${response.status}`);
    }

    const rawData = await response.json();
    const precomputed = aggregateHistoricalAQI(rawData);

    // Cache the precomputed aggregates
    await cacheStore.set(cacheKey, precomputed);

    return precomputed;
  } catch (error) {
    console.error('[aqiPrecomputationService] precomputation failed:', error);
    // Return empty results on failure
    return { weekly: null, monthly: null, prediction: null };
  }
}
