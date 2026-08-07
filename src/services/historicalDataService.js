const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DB_NAME = 'PollutionHubDB';
const STORE_NAME = 'historicalDataCache';

export async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      // @ts-ignore
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @param {any} id */
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

/**
 * @param {any} id
 * @param {any} data
 */
export async function setCachedData(id, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, data, timestamp: Date.now() });
    
      // @ts-ignore
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * @param {any} lat
 * @param {any} lon
 * @param {any} years
 */
export async function fetchHistoricalData(lat, lon, years = 1) {
  // Using 1 year by default for heatmap, but we can do up to 3 years
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  
  const startDateObj = new Date();
  startDateObj.setFullYear(today.getFullYear() - years);
  const startDate = startDateObj.toISOString().split('T')[0];

  const cacheKey = `history_export_${lat.toFixed(4)}_${lon.toFixed(4)}_${startDate}_${endDate}`;
  
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch historical AQI data.');
  }

  const data = await response.json();
  
  // Cache the raw payload
  await setCachedData(cacheKey, data);
  
  return data;
}

/**
 * Formats daily historical AQI/pollution entries into a CSV string with headers, ordered chronologically.
 * @param {Array<object>} dailyData
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {string} CSV string content
 */
export function formatHistoricalCSV(dailyData, startDate, endDate) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return 'Date,AQI,PM2.5,PM10,NO2,Ozone,CO';
  }

  const filtered = dailyData
    .filter((day) => {
      if (!day || !day.date) return false;
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const headers = ['Date', 'AQI', 'PM2.5', 'PM10', 'NO2', 'Ozone', 'CO'];
  const rows = filtered.map((day) => [
    day.date,
    day.maxAqi != null ? day.maxAqi : (day.aqi != null ? day.aqi : ''),
    day.pm25 != null ? day.pm25 : '',
    day.pm10 != null ? day.pm10 : '',
    day.no2 != null ? day.no2 : '',
    day.ozone != null ? day.ozone : '',
    day.co != null ? day.co : ''
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
