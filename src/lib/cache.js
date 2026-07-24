/**
 * MultiLevelCache
 *
 * L1: In-Memory Map (fastest, cleared on page refresh)
 * L2: LocalStorage (persists across reloads, limited capacity)
 */
export class MultiLevelCache {
  constructor(
    namespace = 'pc-hub-cache',
    defaultTTL = 5 * 60 * 1000,
    maxEntries = Infinity
  ) {
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
    this.maxEntries = maxEntries;
    this.memoryCache = new Map();
  }

  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  _getFallbackKey(key) {
    return `${this.namespace}:fallback:${key}`;
  }

  _readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to read from localStorage cache:', e);
      return null;
    }
  }

  _writeStorage(
    key,
    value,
    errorMessage = 'Failed to write to localStorage cache.'
  ) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(errorMessage, e);
    }
  }

  _removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove from localStorage cache:', e);
    }
  }

  _evictIfNeeded() {
    if (this.memoryCache.size >= this.maxEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
  }

  get(key) {
    const fullKey = this._getKey(key);
    const now = Date.now();

    // 1. Check L1 Cache
    const l1Entry = this.memoryCache.get(fullKey);

    if (l1Entry) {
      if (now < l1Entry.expiresAt) {
        return l1Entry.data;
      }

      this.memoryCache.delete(fullKey);
    }

    // 2. Check L2 Cache
    const l2Entry = this._readStorage(fullKey);

    if (l2Entry) {
      if (now < l2Entry.expiresAt) {
        // Backfill L1 Cache
        this.memoryCache.set(fullKey, l2Entry);
        return l2Entry.data;
      }

      this._removeStorage(fullKey);
    }

    return null;
  }

  getFallback(key) {
    return this._readStorage(this._getFallbackKey(key));
  }

  set(key, data, ttlMs = this.defaultTTL) {
    const fullKey = this._getKey(key);
    const expiresAt = Date.now() + ttlMs;

    const entry = {
      data,
      expiresAt,
    };

    // Evict oldest entry if cache limit is reached
    this._evictIfNeeded();

    // Store in L1 cache
    this.memoryCache.set(fullKey, entry);

    // 2. Set L2
    this._writeStorage(
      fullKey,
      entry,
      'Failed to write to localStorage cache. Storage might be full:'
    );

    this._writeStorage(
      this._getFallbackKey(key),
      data,
      'Failed to write to localStorage cache. Storage might be full:'
    );
  }

  clear() {
    this.memoryCache.clear();

    try {
      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(this.namespace)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => this._removeStorage(key));
    } catch (e) {
      console.warn('Failed to clear localStorage cache:', e);
    }
  }
}

export const aqiCache = new MultiLevelCache(
  'aqi-cache',
  5 * 60 * 1000
);