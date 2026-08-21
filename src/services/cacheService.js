class LRUCacheStore {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    this.hits++;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, fullDataObject) {
    // Store only required fields to minimize memory footprint
    const minimalData = {
      sensor_id: fullDataObject.sensor_id ?? fullDataObject.id,
      value: fullDataObject.value,
      ts: fullDataObject.ts ?? Date.now()
    };

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, minimalData);
  }

  getMetrics() {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests === 0 ? 0 : (this.hits / totalRequests).toFixed(4);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: Number(hitRatio)
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

module.exports = new LRUCacheStore(5000);
