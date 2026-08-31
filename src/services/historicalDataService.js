import { getTenantScopedDbName, getTenantScopedStoreName } from './tenantService';
import { logger } from '../utils/logger';
import { formatRow, formatTable } from '../utils/csv';
import { localDayKey } from '../utils/localDay';

const log = logger.child({ module: 'historicalDataService' });

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DB_NAME = 'PollutionHubDB';
const STORE_NAME = 'historicalDataCache';

// Issue #759: Scope the DB and store by tenant_id so multiple
// organisations on the same platform get isolated data caches.
const SCOPED_DB_NAME = getTenantScopedDbName(DB_NAME);
const SCOPED_STORE_NAME = getTenantScopedStoreName(STORE_NAME);

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
    const request = indexedDB.open(SCOPED_DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      // @ts-ignore
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SCOPED_STORE_NAME)) {
        db.createObjectStore(SCOPED_STORE_NAME, { keyPath: 'id' });
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
      const transaction = db.transaction(SCOPED_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SCOPED_STORE_NAME);
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
    log.warn('Historical cache read failed', { error: err });
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
      const transaction = db.transaction(SCOPED_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SCOPED_STORE_NAME);
      const request = store.put({ id, data, timestamp: Date.now() });

      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (err) {
    // Includes QuotaExceededError. Caching is a write-behind optimisation; failing to
    // do it must not cost the caller a payload it already holds.
    log.warn('Historical cache write failed', { error: err });
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
      const transaction = db.transaction(SCOPED_STORE_NAME, 'readonly');
      const request = transaction.objectStore(SCOPED_STORE_NAME).getAll();
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
    const store = db.transaction(SCOPED_STORE_NAME, 'readwrite').objectStore(SCOPED_STORE_NAME);
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
    log.warn('Historical cache prune failed', { error: err });
    return 0;
  }
}

/**
 * @param {any} lat
 * @param {any} lon
 * @param {any} years
 */
export async function fetchHistoricalData(lat, lon, years = 1) {
  // Using 1 year by default for heatmap, but we can do up to 3 years.
  //
  // The window has to be expressed in the *location's* calendar, because the
  // request below carries `timezone=auto` and Open-Meteo reads start_date and
  // end_date in that timezone. These dates used to come off `toISOString()`, which
  // converts to UTC first: for a location ahead of UTC the request asked for a
  // window ending yesterday for the first several hours of every local day, so the
  // export and the heatmap quietly lost their most recent day. For a location
  // behind UTC it asked for a window ending tomorrow.
  const today = new Date();
  // Use local wall-clock date rather than toISOString() (always UTC). East of
  // UTC the local date is ahead of UTC during the night, so UTC-derived dates
  // produce a window that excludes the user's current local day — the same
  // class of bug fixed in airQualityService.ts for issue #545.
  const endDate = localDayKey(today);

  const startDateObj = new Date(today);
  startDateObj.setFullYear(today.getFullYear() - years);
  const startDate = localDayKey(startDateObj);

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

/** The daily export's columns, in order. */
const CSV_HEADERS = ['Date', 'AQI', 'PM2.5', 'PM10', 'NO2', 'Ozone', 'CO'];

/**
 * Determines the CSV delimiter based on a given locale or the detected user locale.
 * If the locale formats numbers with a comma decimal separator (e.g., French, German),
 * a semicolon is used. Otherwise, a comma is used.
 *
 * @param {string} [locale] - Optional locale to override detection.
 * @returns {string} The delimiter character (',' or ';').
 */
export function getDelimiterForLocale(locale) {
  const targetLocale =
    locale ||
    (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) ||
    'en-US';
  try {
    const parts = new Intl.NumberFormat(targetLocale).formatToParts(1.1);
    const decimalPart = parts.find((part) => part.type === 'decimal');
    return decimalPart && decimalPart.value === ',' ? ';' : ',';
  } catch {
    // An unrecognised locale tag. The comma is the safe default and the caller
    // can always pass a delimiter explicitly.
    return ',';
  }
}

/**
 * Formats daily historical AQI/pollution entries into a CSV string with headers, ordered chronologically.
 * @param {Array<object>} dailyData
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {string} [delimiter] - Optional CSV delimiter. If not specified, detected based on user locale.
 * @returns {string} CSV string content
 */
export function formatHistoricalCSV(dailyData, startDate, endDate, delimiter) {
  const actualDelimiter = delimiter !== undefined ? delimiter : getDelimiterForLocale();

  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return formatRow(CSV_HEADERS, actualDelimiter);
  }

  const filtered = dailyData
    .filter((day) => {
      if (!day || !day.date) return false;
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows = filtered.map((day) => [
    day.date,
    day.maxAqi != null ? day.maxAqi : (day.aqi != null ? day.aqi : ''),
    day.pm25 != null ? day.pm25 : '',
    day.pm10 != null ? day.pm10 : '',
    day.no2 != null ? day.no2 : '',
    day.ozone != null ? day.ozone : '',
    day.co != null ? day.co : ''
  ]);

  // Through the shared writer rather than `join(delimiter)`. Choosing `;` for a
  // comma-decimal locale (#736) fixes one value that can contain the delimiter;
  // it does nothing for a `;` inside a value, or for a quote, or a newline.
  return formatTable(CSV_HEADERS, rows, actualDelimiter);
}
