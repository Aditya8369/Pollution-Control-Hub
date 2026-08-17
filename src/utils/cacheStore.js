import { logger } from './logger';

/**
 * Scoped so every entry from the persistence tier is identifiable as such. These
 * warnings mean the app has fallen back to memory-only storage, which is worth telling
 * apart from ordinary console noise.
 */
const log = logger.child({ module: 'cacheStore' });

const DB_NAME = 'pollution-hub-cache';
const STORE_NAME = 'aqi-cache';
const DB_VERSION = 1;

/** @type {any} */
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      // @ts-ignore
      const database = event.target.result;
      let currentVersion = event.oldVersion;

      while (currentVersion < DB_VERSION) {
        switch (currentVersion) {
          case 0:
            if (!database.objectStoreNames.contains(STORE_NAME)) {
              const store = database.createObjectStore(STORE_NAME, {
                keyPath: 'key',
              });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
            break;
          // Add cases for future version migrations here
        }
        currentVersion++;
      }
    };

    request.onsuccess = (event) => {
      // @ts-ignore
      db = event.target.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

/** @param {any} mode */
async function getObjectStore(mode = 'readonly') {
  const database = await openDB();
  const transaction = database.transaction(STORE_NAME, mode);
  return transaction.objectStore(STORE_NAME);
}

/**
 * @param {any} mode
 * @param {any} operation
 */
async function executeStoreOperation(mode, operation) {
  const store = await getObjectStore(mode);
  return operation(store);
}

const inFlight = new Map();
let persistenceDegraded = false;
const errorListeners = new Set();

function notifyPersistenceError(err) {
  persistenceDegraded = true;
  for (const listener of errorListeners) {
    try {
      listener(err);
    } catch (_) {
      // Never let a listener crash the cache layer.
    }
  }
}

const memoryCache = new Map();

/**
 * Whether a cache entry has outlived the caller's freshness window.
 *
 * A missing or non-finite `ttl` means "no expiry" so existing callers that never
 * cared about age keep their current behaviour.
 *
 * @param {any} entry - Cache entry with a `timestamp` field.
 * @param {number} [ttl] - Maximum acceptable age in milliseconds.
 * @returns {boolean}
 */
function isExpired(entry, ttl) {
  if (!entry) return true;
  if (typeof ttl !== 'number' || !Number.isFinite(ttl)) return false;
  if (typeof entry.timestamp !== 'number') return true;
  return Date.now() - entry.timestamp >= ttl;
}

async function cleanupExpiredEntries() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const expired = Date.now() - ONE_DAY;

  for (const [key, value] of memoryCache.entries()) {
    if (value.timestamp && value.timestamp < expired) {
      memoryCache.delete(key);
    }
  }

  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const store = await getObjectStore('readwrite');
    const index = store.index('timestamp');
    const request = index.openCursor(IDBKeyRange.upperBound(expired));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (_err) {
    // Ignore cleanup errors
  }
}

export const cacheStore = {
  isPersistenceDegraded() {
    return persistenceDegraded;
  },

  onPersistenceError(callback) {
    errorListeners.add(callback);
    return () => errorListeners.delete(callback);
  },

  /**
   * Read an entry from the in-memory tier only.
   *
   * @param {any} key
   * @param {number} [ttl] - When provided, entries older than `ttl` ms are treated as absent.
   */
  getFromMemory(key, ttl) {
    const entry = memoryCache.get(key) || null;
    if (!entry) return null;
    if (isExpired(entry, ttl)) return null;
    return entry;
  },

  /**
   * Read an entry but only return it while it is still fresh.
   *
   * `get()` deliberately has no notion of age — it is the raw accessor. Callers that
   * serve live data (air quality, wind, forecasts) must not use it directly, because
   * entries survive in IndexedDB for a full day and would be replayed as if current.
   * Use this instead so a stale entry reads as a miss and the caller re-fetches.
   *
   * @param {any} key
   * @param {number} ttl - Maximum acceptable age in milliseconds.
   * @returns {Promise<any|null>} The cache entry, or null when missing or stale.
   */
  async getFresh(key, ttl) {
    const entry = await this.get(key);
    if (!entry) return null;
    if (isExpired(entry, ttl)) return null;
    return entry;
  },

  get: async function (key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    if (typeof indexedDB === 'undefined') {
      return null;
    }

    try {
      const request = await executeStoreOperation(
        'readonly',
        (store) => store.get(key)
      );

      return await new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;

          if (result) {
            memoryCache.set(key, result);
          }

          resolve(result || null);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      log.warn('IndexedDB read failed', { error });
      notifyPersistenceError(error);
      return null;
    }
  },

  set: async function (key, data) {
    // Run cleanup in the background without blocking writes.
    cleanupExpiredEntries().catch(() => { });
    const entry = {
      key,
      data,
      timestamp: Date.now(),
    };

    memoryCache.set(key, entry);

    if (typeof indexedDB === 'undefined') {
      return;
    }

    try {
      await executeStoreOperation(
        'readwrite',
        (store) => store.put(entry)
      );
    } catch (err) {
      log.warn('IndexedDB write failed', { error: err });
      notifyPersistenceError(err);
    }
  },

  async invalidate(key) {
    if (key) {
      memoryCache.delete(key);

      if (typeof indexedDB === 'undefined') {
        return;
      }

      try {
        await executeStoreOperation(
          'readwrite',
          (store) => store.delete(key)
        );
      } catch (err) {
        log.warn('IndexedDB delete failed', { error: err });
        notifyPersistenceError(err);
      }
    } else {
      memoryCache.clear();

      if (typeof indexedDB === 'undefined') {
        return;
      }

      try {
        await executeStoreOperation(
          'readwrite',
          (store) => store.clear()
        );
      } catch (err) {
        log.warn('IndexedDB clear failed', { error: err });
        notifyPersistenceError(err);
      }
    }
  },

  /**
   * Check if a cache entry has exceeded its freshness TTL.
   *
   * @param {any} key
   * @param {number} ttlMs - Maximum acceptable age in milliseconds.
   * @returns {Promise<boolean>}
   */
  async isStale(key, ttlMs) {
    const cached = memoryCache.get(key) || (await this.get(key));

    if (!cached) return true;

    return isExpired(cached, ttlMs);
  },

  /**
   * Runs `fetcher` once per key while a request for that key is in flight.
   *
   * This joins a request that is already happening. It is not, by itself, a cache read:
   * `getFromMemory(key)` with no ttl treats an entry as fresh forever, so serving from it
   * unconditionally meant a key fetched once was never fetched again for the lifetime of
   * the tab. Callers ran their own freshness check, concluded the entry was stale, and
   * were then overruled here — which is how the City Comparison panel ended up frozen on
   * whatever the first load returned.
   *
   * A caller that does want a cached value says how old a value it will accept, the same
   * way `getFresh(key, ttl)` and `isStale(key, ttl)` do. Omitting `ttl` always fetches.
   *
   * The result is still written to the cache either way — writing it is what makes the
   * entry available to `getFresh`/`isStale`; replaying it unasked is the part that was
   * wrong.
   *
   * @param {any} key
   * @param {any} fetcher
   * @param {{ttl?: number}} [options] - `ttl`: maximum acceptable age in ms.
   * @returns {Promise<any>}
   */
  async deduplicate(key, fetcher, { ttl } = {}) {
    if (!key) return null;

    // Joining an in-flight request comes first. Whatever the ttl says, the fetch is
    // already happening, and a second one would only race it.
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    if (typeof ttl === 'number' && Number.isFinite(ttl)) {
      const cached = this.getFromMemory(key, ttl);
      if (cached) return cached.data;
    }

    // `fetcher()` is called before anything is registered, so a fetcher that throws
    // synchronously cannot leave a rejected promise parked under this key — which every
    // later call for it would then have replayed.
    let pending;
    try {
      pending = Promise.resolve(fetcher());
    } catch (err) {
      return Promise.reject(err);
    }

    const promise = pending
      .then(async (data) => {
        await this.set(key, data);
        return data;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, promise);

    return promise;
  },
};