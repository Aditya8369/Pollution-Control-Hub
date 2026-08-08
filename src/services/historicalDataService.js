const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DB_NAME = 'PollutionHubDB';
const STORE_NAME = 'historicalDataCache';

/**
 * How long a cached archive payload stays usable.
 *
 * The window ends today, so the only thing that goes out of date is the tail. A day
 * is well inside the resolution anyone reads a 3-year trend at, and it means the
 * entry is reused across a session instead of being orphaned at every local midnight.
 */
export const HISTORY_CACHE_TTL = 24 * 60 * 60 * 1000;

/** Nothing older than this is kept, whatever location it belongs to. */
const MAX_ENTRY_AGE = 7 * 24 * 60 * 60 * 1000;

function indexedDBAvailable() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

export async function openDB() {
  if (!indexedDBAvailable()) {
    // Firefox private windows fail indexedDB.open outright. cacheStore already guards
    // this; this module did not, and a rejection here took out the whole fetch rather
    // than degrading to network-only.
    throw new Error('IndexedDB unavailable');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      // @ts-ignore
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Reads a cached payload, or null when it is missing, stale, or unreadable.
 *
 * The stored `timestamp` was written from the start and never read -- entries were
 * returned at any age. It decides freshness now.
 *
 * @param {any} id
 * @param {number} [ttl] Maximum acceptable age in ms. Omit for no age limit.
 */
export async function getCachedData(id, ttl = HISTORY_CACHE_TTL) {
  if (!indexedDBAvailable()) return null;

  try {
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!record) return null;

    if (typeof ttl === 'number' && Number.isFinite(ttl)) {
      const age = Date.now() - (record.timestamp ?? 0);
      if (age >= ttl) return null;
    }

    return record.data ?? null;
  } catch (err) {
    // A cache read failure is not a data failure. Report it and let the caller fetch.
    console.warn('Historical cache read failed:', err);
    return null;
  }
}

/**
 * @param {any} id
 * @param {any} data
 * @returns {Promise<boolean>} Whether the write landed.
 */
export async function setCachedData(id, data) {
  if (!indexedDBAvailable()) return false;

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, data, timestamp: Date.now() });

      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (err) {
    // Includes QuotaExceededError. Caching is a write-behind optimisation; failing to
    // do it must not cost the caller a payload it already holds.
    console.warn('Historical cache write failed:', err);
    return false;
  }
}

/**
 * Drops entries that are past MAX_ENTRY_AGE, plus any older entry for the same
 * location that a new write supersedes.
 *
 * Nothing evicted before this. The old key embedded today's date, so a new
 * multi-megabyte payload was written at every local midnight and the previous one was
 * never read or removed again -- unbounded growth until the origin quota ran out, at
 * which point the panel started failing on a fetch that had actually succeeded.
 *
 * @param {string} [keepPrefix] Entries with this prefix are superseded except `keepId`.
 * @param {string} [keepId]
 */
export async function pruneCache(keepPrefix, keepId) {
  if (!indexedDBAvailable()) return 0;

  try {
    const db = await openDB();

    const records = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const now = Date.now();
    const doomed = records.filter((record) => {
      if (!record || record.id === keepId) return false;

      const tooOld = now - (record.timestamp ?? 0) >= MAX_ENTRY_AGE;
      const superseded =
        typeof keepPrefix === 'string' &&
        keepPrefix.length > 0 &&
        typeof record.id === 'string' &&
        record.id.startsWith(keepPrefix);

      return tooOld || superseded;
    });

    // Awaited rather than fired and forgotten, so a caller that prunes before
    // measuring the store sees the result of the prune.
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
    await Promise.all(
      doomed.map(
        (record) =>
          new Promise((resolve) => {
            const request = store.delete(record.id);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => resolve(undefined); // one stuck key must not abort the sweep
          })
      )
    );

    return doomed.length;
  } catch (err) {
    console.warn('Historical cache prune failed:', err);
    return 0;
  }
}

/**
 * @param {any} lat
 * @param {any} lon
 * @param {any} years
 */
export async function fetchHistoricalData(lat, lon, years = 1) {
  // Using 1 year by default for heatmap, but we can do up to 3 years
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  const startDateObj = new Date();
  startDateObj.setFullYear(today.getFullYear() - years);
  const startDate = startDateObj.toISOString().split('T')[0];

  // Keyed on location and window length only. The old key carried startDate/endDate,
  // both of which move daily, so every entry was orphaned the moment the clock rolled
  // over. Freshness is the timestamp's job, not the key's.
  const cachePrefix = `history_export_${lat.toFixed(4)}_${lon.toFixed(4)}_`;
  const cacheKey = `${cachePrefix}${years}y`;

  const cached = await getCachedData(cacheKey, HISTORY_CACHE_TTL);
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch historical AQI data.');
  }

  const data = await response.json();

  // Both swallow their own failures and resolve, so neither can stop `data` being
  // returned. Previously setCachedData rejected on error and the await propagated it,
  // so a QuotaExceededError surfaced to the user as "Failed to load historical data"
  // -- a caching failure reported as a data failure, with the payload in hand.
  await setCachedData(cacheKey, data);
  await pruneCache(cachePrefix, cacheKey);

  return data;
}

/**
 * Formats daily historical AQI/pollution entries into a CSV string with headers, ordered chronologically.
 * @param {Array<object>} dailyData
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {string} CSV string content
 */
export function formatHistoricalCSV(dailyData, startDate, endDate) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return 'Date,AQI,PM2.5,PM10,NO2,Ozone,CO';
  }

  const filtered = dailyData
    .filter((day) => {
      if (!day || !day.date) return false;
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const headers = ['Date', 'AQI', 'PM2.5', 'PM10', 'NO2', 'Ozone', 'CO'];
  const rows = filtered.map((day) => [
    day.date,
    day.maxAqi != null ? day.maxAqi : (day.aqi != null ? day.aqi : ''),
    day.pm25 != null ? day.pm25 : '',
    day.pm10 != null ? day.pm10 : '',
    day.no2 != null ? day.no2 : '',
    day.ozone != null ? day.ozone : '',
    day.co != null ? day.co : ''
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
