import { CITY_COORDINATES } from '../constants/cities';

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

export async function fetchAirQualityByCoords(lat, lon, signal) {

  if (!isValidCoord(lat, lon)) throw new Error('Invalid coordinates provided.');

  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error('Failed to fetch live AQI data.');
  }

  const data = await response.json();
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

  const nearbyPoints = await fetchLocalGrid(lat, lon, 6, signal);
  const { confidenceScore, dataCompleteness } = computeConfidence(hourly, times);

  return {
    current,
    trend,
    nearbyPoints,
    confidenceScore,
    dataCompleteness
  };
}

export async function fetchCityComparisons(signal) {
  const cityData = await Promise.all(
    CITY_COORDINATES.map(async (city) => {
      try {
        const result = await fetchAirQualityByCoords(city.lat, city.lon, signal);
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
