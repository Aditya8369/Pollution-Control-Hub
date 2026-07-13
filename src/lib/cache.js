/**
 * MultiLevelCache
 * 
 * L1: In-Memory Map (fastest, cleared on page refresh)
 * L2: LocalStorage (persists across reloads, limited capacity)
 */
export class MultiLevelCache {
  constructor(namespace = 'pc-hub-cache', defaultTTL = 5 * 60 * 1000, capacity = 50) {
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
    this.capacity = capacity;
    this.memoryCache = new Map();
  }

  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  get(key) {
    const fullKey = this._getKey(key);
    const now = Date.now();

    // 1. Check L1 Cache
    const l1Entry = this.memoryCache.get(fullKey);
    if (l1Entry) {
      if (now < l1Entry.expiresAt) {
        // Refresh LRU position by deleting and re-inserting
        this.memoryCache.delete(fullKey);
        this.memoryCache.set(fullKey, l1Entry);
        return l1Entry.data;
      }
      this.memoryCache.delete(fullKey); // Expired
    }

    // 2. Check L2 Cache
    try {
      const l2Raw = localStorage.getItem(fullKey);
      if (l2Raw) {
        const l2Entry = JSON.parse(l2Raw);
        if (now < l2Entry.expiresAt) {
          // Backfill L1 Cache, enforcing capacity constraint
          this._setMemoryCache(fullKey, l2Entry);
          return l2Entry.data;
        }
        localStorage.removeItem(fullKey); // Expired
      }
    } catch (e) {
      console.warn('Failed to read from localStorage cache:', e);
    }

    return null; // Cache miss
  }

  _setMemoryCache(fullKey, entry) {
    if (this.memoryCache.has(fullKey)) {
      this.memoryCache.delete(fullKey);
    } else if (this.memoryCache.size >= this.capacity) {
      // Evict oldest (least recently used)
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
      try {
        localStorage.removeItem(oldestKey);
      } catch (e) {}
    }
    this.memoryCache.set(fullKey, entry);
  }

  set(key, data, ttlMs = this.defaultTTL) {
    const fullKey = this._getKey(key);
    const expiresAt = Date.now() + ttlMs;
    const entry = { data, expiresAt };

    // 1. Set L1
    this._setMemoryCache(fullKey, entry);

    // 2. Set L2
    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to write to localStorage cache. Storage might be full:', e);
    }
  }

  invalidate(key) {
    const fullKey = this._getKey(key);
    this.memoryCache.delete(fullKey);
    try {
      localStorage.removeItem(fullKey);
    } catch (e) {}
  }

  clear() {
    this.memoryCache.clear();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.namespace)) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {
      console.warn('Failed to clear localStorage cache:', e);
    }
  }
}

export const aqiCache = new MultiLevelCache('aqi-cache', 5 * 60 * 1000, 50); // 5 minutes TTL, 50 max items
