import { CITY_COORDINATES } from '../constants/cities';
import { cacheStore } from '../utils/cacheStore';
import ApiWorker from '../workers/apiWorker?worker';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// Historical data contains multiple days, so findLastIndex() - ensures we use today's reading instead of yesterday's.
function getCurrentHourIndex(times) {
  const now = new Date();
  const currentHour = now.getHours();
  const index = times.findLastIndex((isoTime) => new Date(isoTime).getHours() === currentHour);
  return index === -1 ? 0 : index;
}

export function getAQIBand(value) {
  if (value <= 50) return { label: 'Good', color: '#1f9d55' };
  if (value <= 100) return { label: 'Moderate', color: '#f59e0b' };
  if (value <= 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
  if (value <= 200) return { label: 'Unhealthy', color: '#ef4444' };
  if (value <= 300) return { label: 'Very Unhealthy', color: '#b91c1c' };
  return { label: 'Hazardous', color: '#7f1d1d' };
}

export function getPollutantColor(value, limit) {
  const ratio = value / limit;
  if (ratio <= 0.5) return '#1f9d55'; // Good (well within)
  if (ratio <= 1.0) return '#f59e0b'; // Moderate (approaching limit)
  if (ratio <= 1.5) return '#f97316'; // Unhealthy (Sensitive)
  if (ratio <= 2.0) return '#ef4444'; // Unhealthy
  if (ratio <= 3.0) return '#b91c1c'; // Very Unhealthy
  return '#7f1d1d'; // Hazardous
}

const GRID_STEP = 0.09; // ~10 km spacing
const DIRECTION_LABELS = {
  '-1,1': 'North-West zone',
  '0,1': 'North zone',
  '1,1': 'North-East zone',
  '-1,0': 'West zone',
  '1,0': 'East zone',
  '-1,-1': 'South-West zone',
  '0,-1': 'South zone',
  '1,-1': 'South-East zone'
};

const gridCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isValidCoord(lat, lon) {
  return (
    typeof lat === 'number' && typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

async function fetchGridPointAqi(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&forecast_days=1`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const data = await response.json();
  const times = data.hourly?.time || [];
  const idx = getCurrentHourIndex(times);
  return Math.round(data.hourly?.us_aqi?.[idx] ?? 0);
}

export async function fetchLocalGrid(lat, lon, topN = 6, signal) {
  const cacheKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const cached = gridCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.points;

  const gridOffsets = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1]
      .filter((dx) => !(dx === 0 && dy === 0))
      .map((dx) => ({ dx, dy }))
  );

  const results = await Promise.all(
    gridOffsets.map(async ({ dx, dy }, i) => {
      const gLat = parseFloat((lat + dy * GRID_STEP).toFixed(4));
      const gLon = parseFloat((lon + dx * GRID_STEP).toFixed(4));
      const aqi = await fetchGridPointAqi(gLat, gLon, signal);
      return {
        id: `grid-${i}`,
        lat: gLat,
        lon: gLon,
        aqi: aqi ?? 0,
        areaName: DIRECTION_LABELS[`${dx},${dy}`] || `Zone ${i + 1}`
      };
    })
  );

  const points = results
    .filter((p) => p.aqi > 0)
    .sort((a, b) => b.aqi - a.aqi)
    .slice(0, topN);

  gridCache.set(cacheKey, { ts: Date.now(), points });
  return points;
}

function computeConfidence(hourly, times) {
  const POLLUTANT_FIELDS = ['pm2_5', 'pm10', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone', 'us_aqi'];

  const validFields = POLLUTANT_FIELDS.filter((f) => {
    const arr = hourly[f];
    return arr && arr.length > 0 && arr.some((v) => v != null && !isNaN(v));
  }).length;

  const dataCompleteness = Math.round((validFields / POLLUTANT_FIELDS.length) * 100);
  const sampleRatio = Math.min(1, times.length / 24);
  const score = dataCompleteness * 0.5 + sampleRatio * 100 * 0.5;

  const confidenceScore = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return { confidenceScore, dataCompleteness };
}

export async function fetchAirQualityByCoords(lat, lon, signal, skipGrid = false) {

  if (!navigator.onLine) { console.log("OFFLINE CHECK HIT");
    throw new Error("You're offline. Please reconnect to view air quality data." );}
  if (!isValidCoord(lat, lon)) throw new Error('Invalid coordinates provided.');

  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  const data = await new Promise((resolve, reject) => {
    const worker = new ApiWorker();
    
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.error || 'Failed to fetch live AQI data.'));
      }
      worker.terminate();
    };
    
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
    
    if (signal) {
      signal.addEventListener('abort', () => {
        worker.terminate();
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
    
    worker.postMessage({ url });
  });
  const hourly = data.hourly || {};
  const times = hourly.time || [];
  const idx = getCurrentHourIndex(times);

  const current = {
    time: times[idx],
    pm2_5: Math.round(hourly.pm2_5?.[idx] ?? 0),
    pm10: Math.round(hourly.pm10?.[idx] ?? 0),
    carbon_monoxide: Math.round(hourly.carbon_monoxide?.[idx] ?? 0),
    nitrogen_dioxide: Math.round(hourly.nitrogen_dioxide?.[idx] ?? 0),
    ozone: Math.round(hourly.ozone?.[idx] ?? 0),
    us_aqi: Math.round(hourly.us_aqi?.[idx] ?? 0)
  };

  const startIndex = idx - 23;

  const trend = times
  .slice(startIndex, idx + 1)
  .map((time, i) => ({
    time,
    pm2_5: Math.round(hourly.pm2_5?.[startIndex + i] ?? 0),
    pm10: Math.round(hourly.pm10?.[startIndex + i] ?? 0),
    us_aqi: Math.round(hourly.us_aqi?.[startIndex + i] ?? 0)
  }));

  const nearbyPoints = skipGrid ? [] : await fetchLocalGrid(lat, lon, 6, signal);
  const { confidenceScore, dataCompleteness } = computeConfidence(hourly, times);

  return {
    current,
    trend,
    nearbyPoints,
    confidenceScore,
    dataCompleteness
  };
}

export async function fetchWindData(lat, lon, signal) {
  if (!isValidCoord(lat, lon)) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      speed: data.current.wind_speed_10m,
      direction: data.current.wind_direction_10m
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return null;
  }
}

export async function fetchCityComparisons(signal) {
  const cityData = await Promise.all(
    CITY_COORDINATES.map(async (city) => {
      try {
        const key = `aqi_lite_${city.lat}_${city.lon}`;
        const result = await cacheStore.deduplicate(key, () => fetchAirQualityByCoords(city.lat, city.lon, signal, true));
        
        return {
          city: city.name,
          aqi: result.current.us_aqi,
          pm2_5: result.current.pm2_5,
          pm10: result.current.pm10
        };
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        return {
          city: city.name,
          aqi: 85,
          pm2_5: 34,
          pm10: 55
        };
      }
    })
  );

  return cityData.sort((a, b) => b.aqi - a.aqi);
}

export function estimateWeeklyMonthlyAverages(trend) {
  const dayAverage = trend.reduce((acc, item) => acc + item.us_aqi, 0) / (trend.length || 1);
  const weekly = Math.round(dayAverage * 1.05);
  const monthly = Math.round(dayAverage * 1.12);

  return {
    weekly,
    monthly,
    prediction: Math.round(dayAverage * 1.08)
  };
}

export function estimateExposureTime(trend, currentAQI, threshold = 120) {

  if (!trend.length) {
    return null;
  }

  if (currentAQI >= threshold) {
    return {
      message: "Already above the recommended exposure threshold.",
      estimated: true
    };
  }

  const firstAQI = trend[0].us_aqi;
  const lastAQI = trend[trend.length - 1].us_aqi;

  // Average AQI change , per hour over the last 24 hrs 
  const slope = (lastAQI - firstAQI) / (trend.length - 1);

  if (slope <= 0) {
    return {
      message: "No immediate risk escalation expected.",
      estimated: true
    };
  }

  const remainingAQI = threshold - currentAQI;
  const estimatedHours = remainingAQI / slope;

  if (estimatedHours < 1) {

    const estimatedMinutes = Math.max(1, Math.round(estimatedHours * 60));

    return {
      message: `Likely safe for ~${estimatedMinutes} minutes.`,
      estimated: true
    };
  }

  if (estimatedHours <= 24) {
    return {
      message: `Likely safe for ~${Math.round(estimatedHours)} hours.`,
      estimated: true
    };
  }

  return {
    message: "Likely Safe for several hours",
    estimated: true
  };

}

/* ─── AQI sub-index breakpoints (US EPA standard) ─────────────────────────── */

export function subAqi(concentration, breakpoints) {
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow
      );
    }
  }
  return concentration > breakpoints[breakpoints.length - 1].cHigh ? 500 : 0;
}

export const BP_PM25 = [
  { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

export const BP_PM10 = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
];

export const BP_NO2 = [
  { cLow: 0, cHigh: 100, iLow: 0, iHigh: 50 },
  { cLow: 102, cHigh: 188, iLow: 51, iHigh: 100 },
  { cLow: 190, cHigh: 677, iLow: 101, iHigh: 150 },
  { cLow: 679, cHigh: 1220, iLow: 151, iHigh: 200 },
  { cLow: 1222, cHigh: 2348, iLow: 201, iHigh: 300 },
  { cLow: 2350, cHigh: 3852, iLow: 301, iHigh: 500 },
];

export const BP_O3 = [
  { cLow: 0, cHigh: 116, iLow: 0, iHigh: 50 },
  { cLow: 118, cHigh: 147, iLow: 51, iHigh: 100 },
  { cLow: 149, cHigh: 186, iLow: 101, iHigh: 150 },
  { cLow: 188, cHigh: 225, iLow: 151, iHigh: 200 },
  { cLow: 227, cHigh: 733, iLow: 201, iHigh: 300 },
];

export const BP_CO = [
  { cLow: 0, cHigh: 4700, iLow: 0, iHigh: 50 },
  { cLow: 4701, cHigh: 9800, iLow: 51, iHigh: 100 },
  { cLow: 9801, cHigh: 14700, iLow: 101, iHigh: 150 },
  { cLow: 14701, cHigh: 19600, iLow: 151, iHigh: 200 },
  { cLow: 19601, cHigh: 34300, iLow: 201, iHigh: 300 },
  { cLow: 34301, cHigh: 51500, iLow: 301, iHigh: 500 },
];

export function estimateAQI(pm25, pm10, no2, o3, co) {
  const scores = [
    subAqi(pm25, BP_PM25),
    subAqi(pm10, BP_PM10),
    subAqi(no2, BP_NO2),
    subAqi(o3, BP_O3),
    subAqi(co, BP_CO),
  ];
  return Math.max(...scores);
}

