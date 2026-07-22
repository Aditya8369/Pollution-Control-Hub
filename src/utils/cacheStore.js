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
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        });

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

async function getObjectStore(mode = 'readonly') {
  const database = await openDB();
  const transaction = database.transaction(STORE_NAME, mode);
  return transaction.objectStore(STORE_NAME);
}

async function executeStoreOperation(mode, operation) {
  const store = await getObjectStore(mode);
  return operation(store);
}

const inFlight = new Map();
const memoryCache = new Map();

async function cleanupExpiredEntries() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const expired = Date.now() - ONE_DAY;
  
  for (const [key, value] of memoryCache.entries()) {
    if (value.timestamp && value.timestamp < expired) {
      memoryCache.delete(key);
    }
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
  } catch (err) {
    // Ignore cleanup errors
  }
}

export const cacheStore = {
  getFromMemory(key) {
    return memoryCache.get(key) || null;
  },

  get: async function(key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
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
      console.warn('IndexedDB read failed:', error);
      return null;
    }
  },

  set: async function(key, data) {
    // Run cleanup in the background without blocking writes.
    cleanupExpiredEntries().catch(() => {});
    const entry = {
      key,
      data,
      timestamp: Date.now(),
    };

    memoryCache.set(key, entry);

    try {
      await executeStoreOperation(
        'readwrite',
        (store) => store.put(entry)
      );
    } catch (err) {
      console.warn('IndexedDB write failed:', err);
    }
  },

  async invalidate(key) {
    if (key) {
      memoryCache.delete(key);

      try {
        await executeStoreOperation(
          'readwrite',
          (store) => store.delete(key)
        );
      } catch (err) {
        console.warn('IndexedDB delete failed:', err);
      }
    } else {
      memoryCache.clear();

      try {
        await executeStoreOperation(
          'readwrite',
          (store) => store.clear()
        );
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

    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

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
  },
};