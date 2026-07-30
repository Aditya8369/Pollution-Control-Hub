const DB_NAME = 'pollution-hub-cache';
const STORE_NAME = 'aqi-cache';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

const inFlight = new Map();
const memoryCache = new Map();

export const cacheStore = {
  async get(key) {
    if (memoryCache.has(key)) return memoryCache.get(key);
    try {
      const database = await openDB();
      return new Promise((resolve) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => {
          const result = request.result;
          if (result) memoryCache.set(key, result);
          resolve(result || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async set(key, data) {
    const entry = { key, data, timestamp: Date.now() };
    memoryCache.set(key, entry);
    try {
      const database = await openDB();
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
    } catch (err) {
      console.warn('IndexedDB write failed:', err);
    }
  },

  async invalidate(key) {
    if (key) {
      memoryCache.delete(key);
      try {
        const database = await openDB();
        const tx = database.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
      } catch (err) {
        console.warn('IndexedDB delete failed:', err);
      }
    } else {
      memoryCache.clear();
      try {
        const database = await openDB();
        const tx = database.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      } catch (err) {
        console.warn('IndexedDB clear failed:', err);
      }
    }
  },

  async isStale(key, ttl) {
    const cached = memoryCache.get(key) || await this.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp >= ttl;
  },

  async deduplicate(key, fetcher) {
    if (!key) return null;
    if (inFlight.has(key)) return inFlight.get(key);

    const promise = (async () => {
      try {
        const data = await fetcher();
        await this.set(key, data);
        return data;
      } finally {
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  }
};