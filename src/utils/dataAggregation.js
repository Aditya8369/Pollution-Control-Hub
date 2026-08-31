/**
 * Data Aggregation & Pollutant Health Threshold Utilities for Historical & Real-Time Analytics
 */

export const POLLUTANTS = {
  us_aqi: { key: 'us_aqi', name: 'AQI', unit: 'AQI', color: '#0d9488', defaultVisible: true, limit: 100 },
  pm2_5: { key: 'pm2_5', name: 'PM2.5', unit: 'µg/m³', color: '#ef4444', defaultVisible: true, limit: 15 },
  pm10: { key: 'pm10', name: 'PM10', unit: 'µg/m³', color: '#f59e0b', defaultVisible: false, limit: 45 },
  nitrogen_dioxide: { key: 'nitrogen_dioxide', name: 'NO₂', unit: 'µg/m³', color: '#3b82f6', defaultVisible: false, limit: 25 },
  ozone: { key: 'ozone', name: 'O₃', unit: 'µg/m³', color: '#8b5cf6', defaultVisible: false, limit: 100 },
  carbon_monoxide: { key: 'carbon_monoxide', name: 'CO', unit: 'µg/m³', color: '#64748b', defaultVisible: false, limit: 4000 },
};

/**
 * Returns color scale and risk label for a given pollutant and value.
 *
 * @param {number|null|undefined} value
 * @param {string} pollutantKey
 * @returns {{ label: string, color: string }}
 */
/**
 * Returns color scale and risk label for a given pollutant and value.
 *
 * @param {number|null|undefined} value
 * @param {string} pollutantKey
 * @returns {{ label: string, color: string }}
 */
export function getPollutantBand(value, pollutantKey = 'us_aqi') {
  if (value == null || !Number.isFinite(value)) {
    return { label: 'No Data', color: '#94a3b8' };
  }

  if (pollutantKey === 'us_aqi' || pollutantKey === 'aqi') {
    if (value <= 50) return { label: 'Good', color: '#1f9d55' };
    if (value <= 100) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
    if (value <= 200) return { label: 'Unhealthy', color: '#ef4444' };
    if (value <= 300) return { label: 'Very Unhealthy', color: '#b91c1c' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  if (pollutantKey === 'pm2_5' || pollutantKey === 'pm25') {
    if (value <= 15) return { label: 'Good', color: '#1f9d55' };
    if (value <= 35) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 75) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
    if (value <= 150) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  if (pollutantKey === 'pm10') {
    if (value <= 45) return { label: 'Good', color: '#1f9d55' };
    if (value <= 100) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 180) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  if (pollutantKey === 'nitrogen_dioxide' || pollutantKey === 'no2') {
    if (value <= 25) return { label: 'Good', color: '#1f9d55' };
    if (value <= 50) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 100) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  if (pollutantKey === 'ozone') {
    if (value <= 60) return { label: 'Good', color: '#1f9d55' };
    if (value <= 100) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 140) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  if (pollutantKey === 'carbon_monoxide' || pollutantKey === 'co') {
    if (value <= 2000) return { label: 'Good', color: '#1f9d55' };
    if (value <= 4000) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 9000) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Hazardous', color: '#7f1d1d' };
  }

  return { label: 'Normal', color: '#0d9488' };
}

/**
 * Resolves a pollutant numerical value from an item object using field aliases.
 *
 * @param {Object} item
 * @param {string} key
 * @returns {number|null}
 */
export function getPollutantValue(item, key) {
  if (!item || typeof item !== 'object') return null;
  let val = item[key];
  if (val === undefined) {
    if (key === 'us_aqi') val = item.maxAqi ?? item.aqi ?? item.AQI;
    else if (key === 'pm2_5') val = item.pm25 ?? item['PM2.5'];
    else if (key === 'pm10') val = item.pm10 ?? item.PM10;
    else if (key === 'nitrogen_dioxide') val = item.no2 ?? item.NO2;
    else if (key === 'ozone') val = item.ozone ?? item.Ozone;
    else if (key === 'carbon_monoxide') val = item.co ?? item.CO;
  }
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/**
 * Aggregates a series of trend points by time granularity (hourly, 3h, daily, weekly).
 *
 * @param {Array<Object>} items Array of data objects containing timestamp (`time` or `date`) and pollutant values.
 * @param {string} granularity 'hourly' | '3h' | 'daily' | 'weekly'
 * @param {Array<string>} activePollutants Array of pollutant field keys to aggregate
 * @returns {Array<Object>}
 */
export function aggregateData(items = [], granularity = 'hourly', activePollutants = ['us_aqi']) {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (granularity === 'hourly') {
    return items.map((item) => {
      const timeStr = item.time || item.date || '';
      const dateObj = timeStr ? new Date(timeStr) : null;
      const label = dateObj && !isNaN(dateObj.getTime())
        ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : timeStr;
      
      const point = { ...item, label, rawTime: timeStr };
      activePollutants.forEach((key) => {
        const val = getPollutantValue(item, key);
        point[key] = val !== null ? Math.round(val * 10) / 10 : null;
      });
      return point;
    });
  }

  const buckets = new Map();

  items.forEach((item) => {
    const rawTime = item.time || item.date;
    if (!rawTime) return;
    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return;

    let bucketKey = '';
    let label = '';

    if (granularity === '3h') {
      const block = Math.floor(d.getHours() / 3) * 3;
      const blockDate = new Date(d);
      blockDate.setHours(block, 0, 0, 0);
      bucketKey = blockDate.toISOString();
      label = `${blockDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${String(block).padStart(2, '0')}:00`;
    } else if (granularity === 'daily') {
      bucketKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (granularity === 'weekly') {
      const startOfWeek = new Date(d);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const yyyy = startOfWeek.getFullYear();
      const mm = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const dd = String(startOfWeek.getDate()).padStart(2, '0');
      bucketKey = `${yyyy}-${mm}-${dd}`;
      label = `Week of ${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    }

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { label, rawTime: bucketKey, count: 0, sums: {} });
    }

    const bucket = buckets.get(bucketKey);
    bucket.count += 1;

    activePollutants.forEach((key) => {
      const val = getPollutantValue(item, key);
      if (val !== null) {
        if (!bucket.sums[key]) bucket.sums[key] = { total: 0, count: 0 };
        bucket.sums[key].total += val;
        bucket.sums[key].count += 1;
      }
    });
  });

  const result = [];
  buckets.forEach((bucket) => {
    const point = { label: bucket.label, rawTime: bucket.rawTime };
    activePollutants.forEach((key) => {
      const s = bucket.sums[key];
      point[key] = s && s.count > 0 ? Math.round((s.total / s.count) * 10) / 10 : null;
    });
    result.push(point);
  });

  return result;
}
