import { CITY_COORDINATES } from '../constants/cities';
import { cacheStore } from '../utils/cacheStore';
import ApiWorker from '../workers/apiWorker?worker';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * How long a cached payload may be replayed before this module re-fetches it.
 *
 * These live in the service layer rather than in `cacheStore` because freshness is a
 * property of the data, not of the storage: a forecast is useful for an hour, a live
 * reading for minutes. Without them, `cacheStore` entries survive for a full day and
 * every "refresh" replays the first response of the session.
 *
 * @type {{ CURRENT: number, GRID: number, FORECAST: number }}
 */
export const CACHE_TTL = {
  /** Current conditions + 24h trend — matches the app's 3-minute auto-refresh cadence. */
  CURRENT: 5 * 60 * 1000,
  /** Surrounding hotspot grid — 9 requests per miss, so it is worth holding a little. */
  GRID: 5 * 60 * 1000,
  /** 7-day forecast — upstream only regenerates it a few times a day. */
  FORECAST: 60 * 60 * 1000,
};

/**
 * Calculates the current hour index from an array of timestamps using the location's UTC offset.
 *
 * @param {string[]} times - Array of ISO timestamp strings (e.g. "2026-03-31T14:00").
 * @param {number} [utcOffsetSeconds=0] - The UTC offset in seconds for the queried location.
 * @returns {number} The array index corresponding to the current hour in the local timezone, or 0 if not found.
 */
function getCurrentHourIndex(times, utcOffsetSeconds = 0) {
  // Current time in the queried location's timezone
  const nowInLocation = new Date(Date.now() + utcOffsetSeconds * 1000);
  const currentHour = nowInLocation.getUTCHours();

  let index = -1;
  for (let i = times.length - 1; i >= 0; i--) {
    const hour = parseInt(times[i].slice(11, 13), 10);
    if (hour === currentHour) {
      index = i;
      break;
    }
  }

  return index === -1 ? 0 : index;
}

/**
 * Object defining AQI qualitative bands with labels and hex colors.
 * @typedef {Object} AQIBand
 * @property {string} label - Descriptive classification (e.g., 'Good', 'Moderate', 'Hazardous').
 * @property {string} color - Hexadecimal color code representing the category severity.
 */

/**
 * Maps a numerical US AQI value to its corresponding qualitative category label and hex color code.
 *
 * @param {number} value - The numerical US AQI score (0 to 500+).
 * @returns {AQIBand} An object containing the descriptive category label and matching hex color string.
 *
 * @example
 * const band = getAQIBand(42);
 * // Returns { label: 'Good', color: '#1f9d55' }
 */
export function getAQIBand(value) {
  if (value <= 50) return { label: 'Good', color: '#1f9d55' };
  if (value <= 100) return { label: 'Moderate', color: '#f59e0b' };
  if (value <= 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
  if (value <= 200) return { label: 'Unhealthy', color: '#ef4444' };
  if (value <= 300) return { label: 'Very Unhealthy', color: '#b91c1c' };
  return { label: 'Hazardous', color: '#7f1d1d' };
}

/**
 * Determines a color indicator for a specific pollutant level based on its safety threshold limit ratio.
 *
 * @param {number} value - Current measured pollutant concentration.
 * @param {number} limit - Safe standard limit threshold concentration.
 * @returns {string} Hexadecimal color code representing the ratio severity.
 *
 * @example
 * const color = getPollutantColor(25, 50);
 * // Returns '#1f9d55' (Good)
 */
export function getPollutantColor(value, limit) {
  const ratio = value / limit;
  if (ratio <= 0.5) return '#1f9d55'; // Good (well within)
  if (ratio <= 1.0) return '#f59e0b'; // Moderate (approaching limit)
  if (ratio <= 1.5) return '#f97316'; // Unhealthy (Sensitive)
  if (ratio <= 2.0) return '#ef4444'; // Unhealthy
  if (ratio <= 3.0) return '#b91c1c'; // Very Unhealthy
  return '#7f1d1d'; // Hazardous
}

const GRID_STEP = 0.09; // ~10 km spacing
const DIRECTION_LABELS = {
  '-1,1': 'North-West zone',
  '0,1': 'North zone',
  '1,1': 'North-East zone',
  '-1,0': 'West zone',
  '1,0': 'East zone',
  '-1,-1': 'South-West zone',
  '0,-1': 'South zone',
  '1,-1': 'South-East zone'
};

/**
 * Validates whether latitude and longitude numbers lie within valid geographic ranges.
 *
 * @param {number} lat - Latitude in degrees (-90 to 90).
 * @param {number} lon - Longitude in degrees (-180 to 180).
 * @returns {boolean} True if coordinates are valid numbers within geographical limits.
 */
function isValidCoord(lat, lon) {
  return (
    typeof lat === 'number' && typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

/**
 * Fetches AQI data for a single geographic grid point coordinate.
 *
 * Network errors are caught here rather than allowed to escape. `fetchLocalGrid` runs
 * these through `Promise.all`, and `fetchAirQualityByCoords` awaits that — so a single
 * rejected grid request used to take down the entire air-quality fetch, current reading
 * and all, over an optional side panel.
 *
 * An AbortError is still rethrown: that one means the caller went away on purpose.
 *
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {AbortSignal} [signal] - Optional signal to abort the fetch request.
 * @returns {Promise<number|null>} Calculated AQI rounded to nearest integer, or null when
 *   the point could not be read. Null means "unknown", never "clean".
 */
async function fetchGridPointAqi(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&forecast_days=1`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    const times = data.hourly?.time || [];
    const idx = getCurrentHourIndex(
      times,
      data.utc_offset_seconds ?? 0
    );
    const value = data.hourly?.us_aqi?.[idx];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.round(value);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return null;
  }
}

/**
 * Cache-key precision for the hotspot grid, in decimal places.
 *
 * The grid samples points `GRID_STEP` (0.09°, ~10 km) apart, but the key used to round to
 * one decimal — ~11 km buckets. Two locations further apart than the entire grid spacing
 * therefore shared a cache entry, and since each point carries its own real lat/lon, the
 * neighbouring area's hotspots got plotted on the current map. Two decimals is ~1.1 km,
 * comfortably finer than the data it keys.
 */
const GRID_CACHE_PRECISION = 2;

/**
 * How many of the 8 surrounding points must answer before a grid result is worth caching.
 *
 * Below this the result is served but not stored, so a transient outage cannot pin an
 * empty hotspot panel in place for the full TTL.
 */
const GRID_MIN_MEASURED_POINTS = 3;

/**
 * Representation of a surrounding grid point.
 * @typedef {Object} GridPoint
 * @property {string} id - Unique identifier string for the grid point.
 * @property {number} lat - Latitude coordinate.
 * @property {number} lon - Longitude coordinate.
 * @property {number} aqi - Numerical US AQI level.
 * @property {string} areaName - Cardinal directional zone description relative to origin.
 */

/**
 * Fetches AQI data for surrounding grid coordinates around a central location.
 *
 * Costs 8 requests on a cache miss, so a rate-limit burst can easily take out several of
 * them at once. Points that fail are dropped from the result rather than counted as 0,
 * and a result built from too few readings is returned but deliberately *not* cached —
 * otherwise one bad moment pins an empty hotspot panel for the whole TTL.
 *
 * @param {number} lat - Center latitude.
 * @param {number} lon - Center longitude.
 * @param {number} [topN=6] - Maximum number of top AQI points to return.
 * @param {AbortSignal} [signal] - Optional signal to abort network requests.
 * @returns {Promise<GridPoint[]>} Top surrounding grid points sorted by highest AQI. Empty
 *   when nothing was measurable — the caller cannot tell these apart, which is why the
 *   caching decision is made here.
 *
 * @example
 * const localGrid = await fetchLocalGrid(19.0760, 72.8777, 4);
 */
export async function fetchLocalGrid(lat, lon, topN = 6, signal) {
  const cacheKey = `grid-${lat.toFixed(GRID_CACHE_PRECISION)},${lon.toFixed(GRID_CACHE_PRECISION)}`;
  const cached = await cacheStore.getFresh(cacheKey, CACHE_TTL.GRID);
  if (cached && cached.data) return cached.data;

  const gridOffsets = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1]
      .filter((dx) => !(dx === 0 && dy === 0))
      .map((dx) => ({ dx, dy }))
  );

  const results = await Promise.all(
    gridOffsets.map(async ({ dx, dy }, i) => {
      const gLat = parseFloat((lat + dy * GRID_STEP).toFixed(4));
      const gLon = parseFloat((lon + dx * GRID_STEP).toFixed(4));
      const aqi = await fetchGridPointAqi(gLat, gLon, signal);
      return {
        id: `grid-${i}`,
        lat: gLat,
        lon: gLon,
        // Keep the failure distinguishable from a reading. Collapsing it to 0 here is
        // what made "every request failed" indistinguishable from "nowhere is polluted".
        aqi,
        areaName: DIRECTION_LABELS[`${dx},${dy}`] || `Zone ${i + 1}`
      };
    })
  );

  const measured = results.filter(
    (p) => typeof p.aqi === 'number' && Number.isFinite(p.aqi)
  );

  const points = measured
    .filter((p) => p.aqi > 0)
    .sort((a, b) => b.aqi - a.aqi)
    .slice(0, topN);

  // Only cache a result we actually have evidence for.
  //
  // The empty array produced by a total outage used to be written with a fresh
  // timestamp, and `getFresh` treats a cached [] as a hit — so retrying, switching tabs
  // and hitting refresh all kept returning it for the full 5-minute TTL. An empty result
  // built from too few readings is now returned but not stored, so the next call retries.
  if (measured.length >= GRID_MIN_MEASURED_POINTS) {
    cacheStore.set(cacheKey, points);
  }

  return points;
}

/**
 * Evaluates dataset completeness and quality metrics to yield a confidence rating score.
 *
 * @param {Object} hourly - Object containing array streams for various pollutants.
 * @param {string[]} times - Hourly time sequence strings array.
 * @returns {{ confidenceScore: ('High'|'Medium'|'Low'), dataCompleteness: number }} Confidence classification and completeness percentage.
 */
function computeConfidence(hourly, times) {
  const POLLUTANT_FIELDS = ['pm2_5', 'pm10', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone', 'us_aqi'];

  const validFields = POLLUTANT_FIELDS.filter((f) => {
    const arr = hourly[f];
    return arr && arr.length > 0 && arr.some((v) => v != null && !isNaN(v));
  }).length;

  const dataCompleteness = Math.round((validFields / POLLUTANT_FIELDS.length) * 100);
  const sampleRatio = Math.min(1, times.length / 24);
  const score = dataCompleteness * 0.5 + sampleRatio * 100 * 0.5;

  const confidenceScore = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return { confidenceScore, dataCompleteness };
}

/**
 * Fetches historical air quality data for a custom date range.
 * @param {number} lat
 * @param {number} lon
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @param {AbortSignal} [signal]
 */
export async function fetchHistoricalRange(lat, lon, startDate, endDate, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Failed to fetch historical AQI data for the selected range.');
  }
  return response.json();
}

/**
 * Air Quality metrics record for a single point in time.
 * @typedef {Object} CurrentAQIData
 * @property {string} time - Time corresponding to measurements.
 * @property {number} pm2_5 - Fine particulate concentration (PM2.5).
 * @property {number} pm10 - Coarse particulate concentration (PM10).
 * @property {number} carbon_monoxide - CO level concentration.
 * @property {number} nitrogen_dioxide - NO2 level concentration.
 * @property {number} ozone - O3 level concentration.
 * @property {number} us_aqi - Aggregate US AQI score.
 */

/**
 * Comprehensive air quality result payload.
 * @typedef {Object} AQIFetchResult
 * @property {CurrentAQIData} current - Most recent hour's pollutant readings.
 * @property {Array<{time: string, pm2_5: number, pm10: number, us_aqi: number}>} trend - Past 24 hours historical trend readings.
 * @property {GridPoint[]} nearbyPoints - Surrounding regional spatial grid metrics.
 * @property {'High'|'Medium'|'Low'} confidenceScore - Confidence rating based on available data completeness.
 * @property {number} dataCompleteness - Completeness percentage score (0 to 100).
 */

/**
 * Fetches current and historical air quality data by geographical coordinates.
 *
 * @param {number} lat - Latitude coordinate.
 * @param {number} lon - Longitude coordinate.
 * @param {AbortSignal} [signal] - Optional signal to handle request cancellation.
 * @param {boolean} [skipGrid=false] - When set to true, disables surrounding spatial grid requests.
 * @returns {Promise<AQIFetchResult>} Full air quality details including trend and spatial analysis.
 * @throws {Error} Throws error when offline, coordinates are invalid, or API requests fail.
 *
 * @example
 * const data = await fetchAirQualityByCoords(19.0760, 72.8777);
 * console.log(data.current.us_aqi);
 */
export async function fetchAirQualityByCoords(lat, lon, signal, skipGrid = false) {
  const cacheKey = `coords-${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (!navigator.onLine) {
    throw new Error("You're offline. Please reconnect to view air quality data.");
  }
  if (!isValidCoord(lat, lon)) throw new Error('Invalid coordinates provided.');

  const cached = await cacheStore.getFresh(cacheKey, CACHE_TTL.CURRENT);
  if (cached && cached.data) return cached.data;

  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  /**
   * Internal worker execution helper.
   * @param {string} workerUrl - Endpoint target URL.
   * @param {AbortSignal} [workerSignal] - Cancellation listener signal.
   * @returns {Promise<any>} Raw web worker output payload.
   */
  const fetchWithWorker = (workerUrl, workerSignal) => {
    return new Promise((resolve, reject) => {
      const worker = new ApiWorker();
      let aborted = false;

      const onAbort = () => {
        aborted = true;
        worker.terminate();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      worker.onmessage = (e) => {
        if (workerSignal) {
          workerSignal.removeEventListener('abort', onAbort);
        }
        if (e.data.success) {
          resolve(e.data.data);
        } else {
          reject(new Error(e.data.error || 'Failed to fetch live AQI data.'));
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        if (workerSignal) {
          workerSignal.removeEventListener('abort', onAbort);
        }
        reject(err);
        worker.terminate();
      };

      if (workerSignal) {
        if (workerSignal.aborted) {
          worker.terminate();
          return reject(new DOMException('Aborted', 'AbortError'));
        }
        workerSignal.addEventListener('abort', onAbort);
      }

      worker.postMessage({ url: workerUrl });
    });
  };

  let attempts = 3;
  let delay = 1000;
  let lastError = null;
  let data = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (typeof window !== 'undefined' && window.Worker) {
        data = await fetchWithWorker(url, signal);
      } else {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error('Network response was not ok');
        data = await response.json();
      }
      break;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err;
      }
      lastError = err;
      if (attempt < attempts) {
        try {
          await new Promise((resolveDelay, rejectDelay) => {
            const timeoutId = setTimeout(() => {
              if (signal) signal.removeEventListener('abort', onAbortWait);
              // @ts-ignore
              resolveDelay();
            }, delay);

            const onAbortWait = () => {
              clearTimeout(timeoutId);
              if (signal) signal.removeEventListener('abort', onAbortWait);
              rejectDelay(new DOMException('Aborted', 'AbortError'));
            };

            if (signal) {
              if (signal.aborted) {
                clearTimeout(timeoutId);
                return rejectDelay(new DOMException('Aborted', 'AbortError'));
              }
              signal.addEventListener('abort', onAbortWait);
            }
          });
        } catch (waitErr) {
          if (waitErr.name === 'AbortError') {
            throw waitErr;
          }
        }
        delay *= 2;
      }
    }
  }

  if (!data) {
    throw lastError || new Error('Failed to fetch live AQI data.');
  }
  const hourly = data.hourly || {};
  const times = hourly.time || [];
  const idx = getCurrentHourIndex(
    times,
    data.utc_offset_seconds ?? 0
  );
  const current = {
    time: times[idx],
    pm2_5: Math.round(hourly.pm2_5?.[idx] ?? 0),
    pm10: Math.round(hourly.pm10?.[idx] ?? 0),
    carbon_monoxide: Math.round(hourly.carbon_monoxide?.[idx] ?? 0),
    nitrogen_dioxide: Math.round(hourly.nitrogen_dioxide?.[idx] ?? 0),
    sulfur_dioxide: Math.round(hourly.sulfur_dioxide?.[idx] ?? hourly.sulphur_dioxide?.[idx] ?? 0),
    ozone: Math.round(hourly.ozone?.[idx] ?? 0),
    us_aqi: Math.round(hourly.us_aqi?.[idx] ?? 0)
  };

  const startIndex = Math.max(0, idx - 23);

  const trend = times
    .slice(startIndex, idx + 1)
    .map((time, i) => ({
      time,
      pm2_5: Math.round(hourly.pm2_5?.[startIndex + i] ?? 0),
      pm10: Math.round(hourly.pm10?.[startIndex + i] ?? 0),
      us_aqi: Math.round(hourly.us_aqi?.[startIndex + i] ?? 0)
    }));

  const nearbyPoints = skipGrid ? [] : await fetchLocalGrid(lat, lon, 6, signal);
  const { confidenceScore, dataCompleteness } = computeConfidence(hourly, times);

  const result = {
    current,
    trend,
    nearbyPoints,
    confidenceScore,
    dataCompleteness
  };

  cacheStore.set(cacheKey, result);
  return result;
}

/**
 * Wind data speed and direction details.
 * @typedef {Object} WindData
 * @property {number} speed - Wind speed in km/h.
 * @property {number} direction - Wind direction angle in degrees (0–360).
 */

/**
 * Fetches current wind metrics for given coordinates.
 *
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<WindData|null>} Object containing wind speed and direction, or null if invalid/failed.
 * @throws {DOMException} Throws AbortError if signal is triggered.
 *
 * @example
 * const wind = await fetchWindData(19.0760, 72.8777);
 */
export async function fetchWindData(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      speed: data.current.wind_speed_10m,
      direction: data.current.wind_direction_10m
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return null;
  }
}

export async function fetchSunSafetyData(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,uv_index`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      uvIndex: Math.round(data.current.uv_index),
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return null;
  }
}

/**
 * Individual city metrics comparison summary object.
 * @typedef {Object} CityComparison
 * @property {string} city - City name string.
 * @property {number|null} aqi - US AQI score, or null when the reading could not be fetched.
 * @property {number|null} pm2_5 - Fine PM2.5 particle level, or null when unavailable.
 * @property {number|null} pm10 - Coarse PM10 particle level, or null when unavailable.
 * @property {boolean} unavailable - True when this city's request failed; readings are null.
 */

/**
 * Fetches AQI indices for predefined major global/national cities for comparison.
 *
 * Cities whose request fails are returned with null readings and `unavailable: true`, and
 * are sorted to the end of the list. They are never given substitute values: an invented
 * number that looks like a measurement is worse than a visible gap, because a reader has
 * no way to tell it apart from a real one.
 *
 * @param {AbortSignal} [signal] - Optional request cancellation signal.
 * @returns {Promise<CityComparison[]>} List sorted by descending AQI, unavailable cities last.
 * @throws {DOMException} Throws AbortError if aborted during execution.
 *
 * @example
 * const comparisons = await fetchCityComparisons();
 * const measured = comparisons.filter((c) => !c.unavailable);
 */
export async function fetchCityComparisons(signal) {
  const cityData = await Promise.all(
    CITY_COORDINATES.map(async (city) => {
      try {
        const key = `aqi_lite_${city.lat}_${city.lon}`;
        const result = await cacheStore.deduplicate(key, () => fetchAirQualityByCoords(city.lat, city.lon, signal, true));

        return {
          city: city.name,
          aqi: result.current.us_aqi,
          pm2_5: result.current.pm2_5,
          pm10: result.current.pm10,
          unavailable: false
        };
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.warn(`Air quality unavailable for ${city.name}:`, error);
        return {
          city: city.name,
          aqi: null,
          pm2_5: null,
          pm10: null,
          unavailable: true
        };
      }
    })
  );

  return cityData.sort((a, b) => {
    if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1;
    if (a.unavailable) return a.city.localeCompare(b.city);
    return b.aqi - a.aqi;
  });
}

/**
 * Estimated AQI projection averages over upcoming timeframes.
 * @typedef {Object} EstimatedAverages
 * @property {number} weekly - Estimated 7-day average AQI.
 * @property {number} monthly - Estimated 30-day average AQI.
 * @property {number} prediction - Short-term predicted trend projection AQI.
 */

/**
 * Estimates future weekly/monthly average trends using recent 24-hour historical readings.
 *
 * @param {Array<{us_aqi: number}>} trend - Historical hourly trend array.
 * @returns {EstimatedAverages} Object containing calculated weekly, monthly, and overall predicted AQI estimations.
 *
 * @example
 * const estimates = estimateWeeklyMonthlyAverages([{ us_aqi: 100 }, { us_aqi: 110 }]);
 */
export function estimateWeeklyMonthlyAverages(trend) {
  const dayAverage = trend.reduce((acc, item) => acc + item.us_aqi, 0) / (trend.length || 1);
  const weekly = Math.round(dayAverage * 1.05);
  const monthly = Math.round(dayAverage * 1.12);

  return {
    weekly,
    monthly,
    prediction: Math.round(dayAverage * 1.08)
  };
}

/**
 * Exposure assessment response object.
 * @typedef {Object} ExposureAssessment
 * @property {string} message - Human-readable guidance message.
 * @property {boolean} estimated - Boolean flag confirming value is an estimated calculation.
 */

/**
 * Estimates safe exposure time remaining before air pollution crosses a safety threshold based on recent rate of change.
 *
 * @param {Array<{us_aqi: number}>} trend - Recent trend historical records array.
 * @param {number} currentAQI - Current local US AQI level.
 * @param {number} [threshold=120] - Target unsafe threshold cut-off value.
 * @returns {ExposureAssessment|null} Exposure recommendation message object or null if trend is empty.
 *
 * @example
 * const exposure = estimateExposureTime(trendData, 95, 120);
 */
export function estimateExposureTime(trend, currentAQI, threshold = 120) {

  if (!trend.length) {
    return null;
  }

  if (currentAQI >= threshold) {
    return {
      message: "Already above the recommended exposure threshold.",
      estimated: true
    };
  }

  const firstAQI = trend[0].us_aqi;
  const lastAQI = trend[trend.length - 1].us_aqi;

  // Average AQI change , per hour over the last 24 hrs 
  const slope = (lastAQI - firstAQI) / (trend.length - 1);

  if (slope <= 0) {
    return {
      message: "No immediate risk escalation expected.",
      estimated: true
    };
  }

  const remainingAQI = threshold - currentAQI;
  const estimatedHours = remainingAQI / slope;

  if (estimatedHours < 1) {

    const estimatedMinutes = Math.max(1, Math.round(estimatedHours * 60));

    return {
      message: `Likely safe for ~${estimatedMinutes} minutes.`,
      estimated: true
    };
  }

  if (estimatedHours <= 24) {
    return {
      message: `Likely safe for ~${Math.round(estimatedHours)} hours.`,
      estimated: true
    };
  }

  return {
    message: "Likely Safe for several hours",
    estimated: true
  };

}

/* ─── AQI sub-index breakpoints (US EPA standard) ─────────────────────────── */

/**
 * Breakpoint boundary structure definition for calculating AQI sub-indices.
 * @typedef {Object} Breakpoint
 * @property {number} cLow - Low concentration limit.
 * @property {number} cHigh - High concentration limit.
 * @property {number} iLow - Low AQI score index boundary.
 * @property {number} iHigh - High AQI score index boundary.
 */

/**
 * Number of decimal places a breakpoint table is expressed in.
 *
 * The EPA publishes each pollutant's table at the precision its concentrations are
 * reported at — PM2.5 to one decimal, the gases to whole numbers. Deriving it from the
 * table keeps the two in sync if a table is ever edited.
 *
 * @param {Breakpoint[]} breakpoints
 * @returns {number} Decimal places, e.g. 1 for PM2.5 and 0 for PM10.
 */
function breakpointPrecision(breakpoints) {
  let decimals = 0;
  for (const bp of breakpoints) {
    for (const bound of [bp.cLow, bp.cHigh]) {
      const text = String(bound);
      const dot = text.indexOf('.');
      if (dot !== -1) decimals = Math.max(decimals, text.length - dot - 1);
    }
  }
  return decimals;
}

/**
 * Truncates a concentration to a table's reporting precision.
 *
 * The EPA algorithm truncates rather than rounds (Technical Assistance Document for the
 * Reporting of Daily Air Quality, step 1), so 12.09 µg/m³ is treated as 12.0.
 *
 * @param {number} concentration
 * @param {number} decimals
 * @returns {number}
 */
function truncateToPrecision(concentration, decimals) {
  const factor = 10 ** decimals;
  return Math.floor(concentration * factor) / factor;
}

/**
 * Calculates a specific pollutant sub-index score using standard US EPA breakpoint formulas.
 *
 * The published breakpoint tables are not contiguous — PM2.5 runs to 12.0 and resumes at
 * 12.1, PM10 runs to 54 and resumes at 55, and so on. The EPA closes those gaps by
 * truncating the measurement to the table's precision *before* the lookup, which is what
 * this function does; a raw range test would leave 12.0 < c < 12.1 matching no band and
 * silently reporting the pollutant as 0.
 *
 * @param {number} concentration - Measured pollutant concentration level.
 * @param {Breakpoint[]} breakpoints - Standard EPA concentration-to-index lookup array.
 * @returns {number} Interpolated sub-index score integer value (0 to 500).
 *
 * @example
 * const subAqiScore = subAqi(24.5, BP_PM25);
 * @example
 * subAqi(12.05, BP_PM25); // 50 — truncated to 12.0, not dropped into a gap
 */
export function subAqi(concentration, breakpoints) {
  if (!Array.isArray(breakpoints) || breakpoints.length === 0) return 0;
  if (typeof concentration !== 'number' || !Number.isFinite(concentration)) return 0;

  // Negative readings are sensor noise, not clean air below the scale.
  if (concentration <= 0) return 0;

  const value = truncateToPrecision(concentration, breakpointPrecision(breakpoints));

  const highest = breakpoints[breakpoints.length - 1];
  if (value > highest.cHigh) return 500;

  for (const bp of breakpoints) {
    if (value >= bp.cLow && value <= bp.cHigh) {
      const span = bp.cHigh - bp.cLow;
      // A degenerate single-point band would divide by zero; report its floor instead.
      if (span === 0) return bp.iLow;
      return Math.round(
        ((bp.iHigh - bp.iLow) / span) * (value - bp.cLow) + bp.iLow
      );
    }
  }

  // Below the first band's floor — nothing measurable.
  return 0;
}

/** @type {Breakpoint[]} Standard US EPA PM2.5 breakpoints */
export const BP_PM25 = [
  { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

/** @type {Breakpoint[]} Standard US EPA PM10 breakpoints */
export const BP_PM10 = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
];

/** @type {Breakpoint[]} Standard US EPA NO2 breakpoints */
export const BP_NO2 = [
  { cLow: 0, cHigh: 100, iLow: 0, iHigh: 50 },
  { cLow: 101, cHigh: 188, iLow: 51, iHigh: 100 },
  { cLow: 189, cHigh: 677, iLow: 101, iHigh: 150 },
  { cLow: 678, cHigh: 1220, iLow: 151, iHigh: 200 },
  { cLow: 1221, cHigh: 2348, iLow: 201, iHigh: 300 },
  { cLow: 2349, cHigh: 3852, iLow: 301, iHigh: 500 },
];

/** @type {Breakpoint[]} Standard US EPA Ozone (O3) breakpoints */
export const BP_O3 = [
  { cLow: 0, cHigh: 116, iLow: 0, iHigh: 50 },
  { cLow: 117, cHigh: 147, iLow: 51, iHigh: 100 },
  { cLow: 148, cHigh: 186, iLow: 101, iHigh: 150 },
  { cLow: 187, cHigh: 225, iLow: 151, iHigh: 200 },
  { cLow: 226, cHigh: 733, iLow: 201, iHigh: 300 },
];

/** @type {Breakpoint[]} Standard US EPA Carbon Monoxide (CO) breakpoints */
export const BP_CO = [
  { cLow: 0, cHigh: 4700, iLow: 0, iHigh: 50 },
  { cLow: 4701, cHigh: 9800, iLow: 51, iHigh: 100 },
  { cLow: 9801, cHigh: 14700, iLow: 101, iHigh: 150 },
  { cLow: 14701, cHigh: 19600, iLow: 151, iHigh: 200 },
  { cLow: 19601, cHigh: 34300, iLow: 201, iHigh: 300 },
  { cLow: 34301, cHigh: 51500, iLow: 301, iHigh: 500 },
];

/**
 * Calculates overall US AQI score by finding the maximum sub-index across individual pollutant concentrations.
 *
 * @param {number} pm25 - PM2.5 concentration level.
 * @param {number} pm10 - PM10 concentration level.
 * @param {number} no2 - Nitrogen Dioxide (NO2) concentration level.
 * @param {number} o3 - Ozone (O3) concentration level.
 * @param {number} co - Carbon Monoxide (CO) concentration level.
 * @returns {number} The governing overall US AQI score.
 *
 * @example
 * const overallAQI = estimateAQI(15.2, 45, 12, 30, 400);
 */
export function estimateAQI(pm25, pm10, no2, o3, co) {
  const scores = [
    subAqi(pm25, BP_PM25),
    subAqi(pm10, BP_PM10),
    subAqi(no2, BP_NO2),
    subAqi(o3, BP_O3),
    subAqi(co, BP_CO),
  ];
  return Math.max(...scores);
}

/**
 * Weather details descriptor object.
 * @typedef {Object} WeatherDetails
 * @property {string} label - Readable weather condition string (e.g., 'Clear sky', 'Thunderstorm').
 * @property {string} icon - Emoji icon character representing the weather state.
 */

/**
 * Maps standard WMO Weather Interpretation Codes to readable descriptions and emoji visual icons.
 *
 * @param {number} code - WMO weather interpretation code.
 * @returns {WeatherDetails} Label and icon representation object.
 *
 * @example
 * const weather = getWeatherDetails(0);
 * // Returns { label: 'Clear sky', icon: '☀️' }
 */
export function getWeatherDetails(code) {
  switch (code) {
    case 0:
      return { label: 'Clear sky', icon: '☀️' };
    case 1:
    case 2:
      return { label: 'Partly cloudy', icon: '⛅' };
    case 3:
      return { label: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { label: 'Fog', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { label: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: 'Snow', icon: '❄️' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: '⛈️' };
    default:
      return { label: 'Clear sky', icon: '☀️' };
  }
}

/**
 * Daily forecast item with AQI bounds and weather codes.
 * @typedef {Object} ForecastDay
 * @property {string} date - Date ISO string format (YYYY-MM-DD).
 * @property {number} aqi - Max or average calculated AQI for the day.
 * @property {number} predictedAQI - Target predicted AQI value.
 * @property {number} lowerBound - Estimated lower confidence bound.
 * @property {number} upperBound - Estimated upper confidence bound.
 * @property {[number, number]} confidenceRange - Array containing [lowerBound, upperBound].
 * @property {number} weatherCode - WMO weather code for the day.
 */

/**
 * Fetches 7-day AQI and weather forecast with calculated confidence boundaries.
 *
 * @param {number} lat - Latitude coordinate.
 * @param {number} lon - Longitude coordinate.
 * @param {AbortSignal} [signal] - Optional request cancellation signal.
 * @returns {Promise<ForecastDay[]>} Array of 7 daily forecast objects containing predictive confidence boundaries and weather codes.
 * @throws {Error} Throws error if coordinates are invalid or endpoint requests fail.
 *
 * @example
 * const forecast = await get7DayForecast(19.0760, 72.8777);
 */
export async function get7DayForecast(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) throw new Error('Invalid coordinates.');

  const cacheKey = `forecast-${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = await cacheStore.getFresh(cacheKey, CACHE_TTL.FORECAST);
  if (cached && cached.data) return cached.data;

  const aqiUrl = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&forecast_days=7`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code&timezone=auto&forecast_days=7`;

  const [aqiRes, weatherRes] = await Promise.all([
    fetch(aqiUrl, { signal }),
    fetch(weatherUrl, { signal })
  ]);

  if (!aqiRes.ok || !weatherRes.ok) {
    throw new Error('Failed to fetch 7-day forecast.');
  }

  const aqiData = await aqiRes.json();
  const weatherData = await weatherRes.json();

  const times = aqiData.hourly?.time || [];
  const aqiValues = aqiData.hourly?.us_aqi || [];

  const dailyAqi = new Map();
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (!time) continue;
    const dateStr = time.split('T')[0];
    const val = aqiValues[i];
    if (val == null) continue;

    if (!dailyAqi.has(dateStr)) {
      dailyAqi.set(dateStr, { sum: 0, count: 0, max: -Infinity });
    }
    const stats = dailyAqi.get(dateStr);
    stats.sum += val;
    stats.count += 1;
    if (val > stats.max) stats.max = val;
  }

  const dailyForecast = [];
  const weatherCodes = weatherData.daily?.weather_code || [];
  const weatherTimes = weatherData.daily?.time || [];

  let dayIndex = 0;
  dailyAqi.forEach((stats, dateStr) => {
    const wIdx = weatherTimes.indexOf(dateStr);
    const code = wIdx !== -1 ? weatherCodes[wIdx] : 0;
    const aqi = stats.max !== -Infinity ? Math.round(stats.max) : (stats.count > 0 ? Math.round(stats.sum / stats.count) : 0);

    // Explicit numeric confidence bounds with widening variance per day forward
    const margin = Math.round(Math.max(8, aqi * 0.12 + dayIndex * 2));
    const lowerBound = Math.max(0, aqi - margin);
    const upperBound = Math.round(aqi + margin);

    dailyForecast.push({
      date: dateStr,
      aqi,
      predictedAQI: aqi,
      lowerBound,
      upperBound,
      confidenceRange: [lowerBound, upperBound],
      weatherCode: code
    });

    dayIndex++;
  });

  await cacheStore.set(cacheKey, dailyForecast);
  return dailyForecast;
}

export const fetch7DayForecast = get7DayForecast;

export async function fetchPollenData(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;

  const getDeterministicFallback = (latitude, longitude) => {
    const val = Math.abs(Math.sin(latitude) * Math.cos(longitude));
    const dayOfYear = Math.floor(Date.now() / 8.64e7) % 365;
    const seasonalFactor = 0.5 + 0.5 * Math.sin((dayOfYear / 365) * 2 * Math.PI);

    const treeVal = Math.round((val * 100 + 10) * seasonalFactor);
    const grassVal = Math.round((((val * 77) % 20) + 2) * seasonalFactor);
    const weedVal = Math.round((((val * 133) % 45) + 5) * seasonalFactor);

    return {
      tree: treeVal,
      grass: grassVal,
      weed: weedVal,
      mold: null,
      isFallback: true
    };
  };

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto&forecast_days=1`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return getDeterministicFallback(lat, lon);
    }
    const data = await response.json();
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    if (times.length === 0) {
      return getDeterministicFallback(lat, lon);
    }

    const idx = getCurrentHourIndex(times, data.utc_offset_seconds ?? 0);

    const alder = hourly.alder_pollen?.[idx];
    const birch = hourly.birch_pollen?.[idx];
    const grass = hourly.grass_pollen?.[idx];
    const mugwort = hourly.mugwort_pollen?.[idx];
    const olive = hourly.olive_pollen?.[idx];
    const ragweed = hourly.ragweed_pollen?.[idx];

    if (
      alder === null || birch === null || grass === null ||
      mugwort === null || olive === null || ragweed === null ||
      alder === undefined || birch === undefined || grass === undefined ||
      mugwort === undefined || olive === undefined || ragweed === undefined
    ) {
      return getDeterministicFallback(lat, lon);
    }

    const treeVal = Math.round((alder ?? 0) + (birch ?? 0) + (olive ?? 0));
    const grassVal = Math.round(grass ?? 0);
    const weedVal = Math.round((mugwort ?? 0) + (ragweed ?? 0));

    return {
      tree: treeVal,
      grass: grassVal,
      weed: weedVal,
      mold: null,
      isFallback: false
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return getDeterministicFallback(lat, lon);
  }
}

export function getPollenSeverity(type, value) {
  if (value === null || value === undefined) {
    return { label: 'Unavailable', color: 'var(--muted)' };
  }
  if (type === 'tree') {
    if (value < 15) return { label: 'Low', color: '#1f9d55' };
    if (value < 90) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
  }
  if (type === 'grass') {
    if (value < 5) return { label: 'Low', color: '#1f9d55' };
    if (value < 20) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
  }
  if (type === 'weed') {
    if (value < 10) return { label: 'Low', color: '#1f9d55' };
    if (value < 50) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
  }
  return { label: 'Low', color: '#1f9d55' };
}

