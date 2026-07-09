const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DB_NAME = 'PollutionHubDB';
const STORE_NAME = 'historicalDataCache';

export async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedData(id, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, data, timestamp: Date.now() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function fetchHistoricalData(lat, lon, years = 1) {
  // Using 1 year by default for heatmap, but we can do up to 3 years
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  
  const startDateObj = new Date();
  startDateObj.setFullYear(today.getFullYear() - years);
  const startDate = startDateObj.toISOString().split('T')[0];

  const cacheKey = `history_${lat.toFixed(4)}_${lon.toFixed(4)}_${startDate}_${endDate}`;
  
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch historical AQI data.');
  }

  const data = await response.json();
  
  // Cache the raw payload
  await setCachedData(cacheKey, data);
  
  return data;
}
