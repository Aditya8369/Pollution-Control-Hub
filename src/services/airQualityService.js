import { CITY_COORDINATES } from '../constants/cities';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

function getCurrentHourIndex(times) {
  const now = new Date();
  const currentHour = now.getHours();
  const index = times.findIndex((isoTime) => new Date(isoTime).getHours() === currentHour);
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

export function buildNearbyPoints(lat, lon, usAqi) {
  const offsets = [
    { dx: 0.08, dy: 0.04 },
    { dx: -0.06, dy: 0.03 },
    { dx: 0.05, dy: -0.07 },
    { dx: -0.04, dy: -0.05 }
  ];

  return offsets.map((offset, index) => ({
    id: `${index + 1}`,
    lat: lat + offset.dy,
    lon: lon + offset.dx,
    aqi: Math.max(30, Math.round(usAqi + (index - 1.5) * 12)),
    areaName: `Zone ${index + 1}`
  }));
}

export async function fetchAirQualityByCoords(lat, lon) {
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto&forecast_days=3`;
  const response = await fetch(url);

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

  const trend = times.slice(0, 24).map((time, i) => ({
    time,
    pm2_5: Math.round(hourly.pm2_5?.[i] ?? 0),
    pm10: Math.round(hourly.pm10?.[i] ?? 0),
    us_aqi: Math.round(hourly.us_aqi?.[i] ?? 0)
  }));

  return {
    current,
    trend,
    nearbyPoints: buildNearbyPoints(lat, lon, current.us_aqi)
  };
}

export async function fetchCityComparisons() {
  const cityData = await Promise.all(
    CITY_COORDINATES.map(async (city) => {
      try {
        const result = await fetchAirQualityByCoords(city.lat, city.lon);
        return {
          city: city.name,
          aqi: result.current.us_aqi,
          pm2_5: result.current.pm2_5,
          pm10: result.current.pm10
        };
      } catch (error) {
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
