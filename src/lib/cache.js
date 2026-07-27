/**
 * MultiLevelCache
 *
 * In-Memory LRU Cache
 */
export let cacheWarningShown = false;

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

  /** @param {any} key */
  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  _evictIfNeeded() {
    if (this.memoryCache.size >= this.maxEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
  }

  /** @param {any} key */
  get(key) {
    const fullKey = this._getKey(key);
    const now = Date.now();

    const entry = this.memoryCache.get(fullKey);

    if (entry) {
      if (now < entry.expiresAt) {
        // Refresh insertion order for LRU
        this.memoryCache.delete(fullKey);
        this.memoryCache.set(fullKey, entry);
        return entry.data;
      }

      this.memoryCache.delete(fullKey);
    }

    return null;
  }

  /**
   * @param {any} key
   * @param {any} data
   * @param {any} ttlMs
   */
  set(key, data, ttlMs = this.defaultTTL) {
    const fullKey = this._getKey(key);
    const expiresAt = Date.now() + ttlMs;

    const entry = {
      data,
      expiresAt,
    };

    // If updating existing key, remove it first to refresh LRU order
    // and avoid unnecessary eviction
    if (this.memoryCache.has(fullKey)) {
      this.memoryCache.delete(fullKey);
    } else {
      this._evictIfNeeded();
    }

    this.memoryCache.set(fullKey, entry);
  }

  clear() {
    this.memoryCache.clear();
  }
}

export const aqiCache = new MultiLevelCache(
  'aqi-cache',
  5 * 60 * 1000,
  500
);