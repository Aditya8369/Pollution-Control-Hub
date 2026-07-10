const cache = new Map();
const inFlight = new Map();

export const cacheStore = {
  get(key) {
    return cache.get(key);
  },

  set(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  },

  invalidate(key) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  },

  isStale(key, ttl) {
    const cached = cache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp >= ttl;
  },

  async deduplicate(key, fetcher) {
    if (!key) return null;

    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        // Only populate cache if the fetch was successful
        cache.set(key, { data, timestamp: Date.now() });
        return data;
      } finally {
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  }
};
