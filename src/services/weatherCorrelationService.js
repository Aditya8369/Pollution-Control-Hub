/**
 * Weather–Health Correlation Service
 *
 * Computes statistical correlations between weather variables (temperature,
 * humidity, wind speed) and air-quality metrics (AQI, PM2.5, PM10, NO₂, O₃, CO).
 *
 * All computations are pure — they accept arrays of data points and return
 * derived structures. No network requests are made here.
 */

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

/**
 * Arithmetic mean of a numeric array. Returns 0 for empty arrays.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0);
  return sum / values.length;
}

/**
 * Sample standard deviation. Returns 0 when fewer than 2 values exist.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function stddev(values) {
  const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length < 2) return 0;
  const avg = mean(valid);
  const variance = valid.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (valid.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pearson product-moment correlation coefficient between two arrays.
 * Returns 0 when data is insufficient or degenerate.
 *
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number} r in [-1, 1]
 */
export function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const pairs = [];
  for (let i = 0; i < n; i++) {
    if (typeof x[i] === 'number' && Number.isFinite(x[i]) && typeof y[i] === 'number' && Number.isFinite(y[i])) {
      pairs.push([x[i], y[i]]);
    }
  }
  if (pairs.length < 3) return 0;

  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const sx = stddev(xs);
  const sy = stddev(ys);

  if (sx === 0 || sy === 0) return 0;

  const covariance = pairs.reduce((acc, [xv, yv]) => acc + (xv - mx) * (yv - my), 0) / (pairs.length - 1);
  return covariance / (sx * sy);
}

/**
 * Classifies a correlation coefficient into a human-readable strength label.
 *
 * @param {number} r - Correlation coefficient in [-1, 1]
 * @returns {{ label: string, color: string, emoji: string }}
 */
export function classifyCorrelation(r) {
  const abs = Math.abs(r);
  if (abs >= 0.7) return { label: 'Strong', color: '#ef4444', emoji: '🔴' };
  if (abs >= 0.4) return { label: 'Moderate', color: '#f59e0b', emoji: '🟡' };
  if (abs >= 0.2) return { label: 'Weak', color: '#3b82f6', emoji: '🔵' };
  return { label: 'Negligible', color: '#94a3b8', emoji: '⚪' };
}

/**
 * Returns the sign description for a correlation.
 *
 * @param {number} r
 * @returns {string}
 */
export function correlationDirection(r) {
  if (r > 0.05) return 'positive';
  if (r < -0.05) return 'negative';
  return 'no';
}

// ---------------------------------------------------------------------------
// Weather variable definitions
// ---------------------------------------------------------------------------

export const WEATHER_VARIABLES = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️' },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: '💧' },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'm/s', icon: '🌬️' },
];

export const AQI_VARIABLES = [
  { key: 'us_aqi', label: 'US AQI', unit: '', icon: '📊' },
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', icon: '🔬' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: '🌫️' },
  { key: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³', icon: '⚗️' },
  { key: 'ozone', label: 'O₃', unit: 'µg/m³', icon: '☀️' },
  { key: 'carbon_monoxide', label: 'CO', unit: 'mg/m³', icon: '💨' },
];

// ---------------------------------------------------------------------------
// Core correlation computation
// ---------------------------------------------------------------------------

/**
 * Aligns weather data points with AQI trend data by hour and returns a
 * merged dataset suitable for correlation analysis.
 *
 * Weather data has 3-hour intervals from OpenWeather; AQI trend is hourly.
 * We match on the nearest hour slot.
 *
 * @param {Array<{time: string, temperature: number|null, humidity: number|null, windSpeed: number|null}>} weatherData
 * @param {Array<{time: string, us_aqi?: number|null, pm2_5?: number|null, pm10?: number|null, nitrogen_dioxide?: number|null, ozone?: number|null, carbon_monoxide?: number|null}>} trendData
 * @returns {Array<Object>} Merged data points with weather + AQI fields
 */
export function alignDatasets(weatherData, trendData) {
  if (!Array.isArray(weatherData) || !Array.isArray(trendData) || trendData.length === 0) {
    return [];
  }

  // Build a lookup from trend data keyed by hour
  const trendByHour = new Map();
  for (const point of trendData) {
    if (!point?.time) continue;
    const hour = extractHourKey(point.time);
    if (hour) trendByHour.set(hour, point);
  }

  const merged = [];
  for (const wp of weatherData) {
    if (!wp?.time) continue;
    const hour = extractHourKey(wp.time);
    if (!hour) continue;

    const aqi = trendByHour.get(hour);
    if (!aqi) continue;

    merged.push({
      time: wp.time,
      temperature: wp.temperature,
      humidity: wp.humidity,
      windSpeed: wp.windSpeed,
      us_aqi: aqi.us_aqi ?? aqi.current?.us_aqi ?? null,
      pm2_5: aqi.pm2_5 ?? aqi.current?.pm2_5 ?? null,
      pm10: aqi.pm10 ?? aqi.current?.pm10 ?? null,
      nitrogen_dioxide: aqi.nitrogen_dioxide ?? aqi.current?.nitrogen_dioxide ?? null,
      ozone: aqi.ozone ?? aqi.current?.ozone ?? null,
      carbon_monoxide: aqi.carbon_monoxide ?? aqi.current?.carbon_monoxide ?? null,
    });
  }

  return merged;
}

/**
 * Extracts a date-hour key from an ISO timestamp for alignment.
 * e.g. "2026-08-28T14:00:00Z" → "2026-08-28T14"
 *
 * @param {string} isoString
 * @returns {string|null}
 */
function extractHourKey(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Correlation matrix computation
// ---------------------------------------------------------------------------

/**
 * Builds a full correlation matrix between all weather variables and all AQI
 * variables using the merged dataset.
 *
 * @param {Array<Object>} alignedData - Output of alignDatasets()
 * @returns {{ matrix: Array<Array<{r: number, label: string, color: string, emoji: string}>>, weatherKeys: string[], aqiKeys: string[] }}
 */
export function computeCorrelationMatrix(alignedData) {
  const weatherKeys = WEATHER_VARIABLES.map((v) => v.key);
  const aqiKeys = AQI_VARIABLES.map((v) => v.key);

  const matrix = weatherKeys.map((wk) =>
    aqiKeys.map((ak) => {
      const xVals = alignedData.map((d) => d[wk]);
      const yVals = alignedData.map((d) => d[ak]);
      const r = pearsonCorrelation(xVals, yVals);
      return { r, ...classifyCorrelation(r) };
    }),
  );

  return { matrix, weatherKeys, aqiKeys };
}

// ---------------------------------------------------------------------------
// Scatter data preparation
// ---------------------------------------------------------------------------

/**
 * Prepares scatter-plot data for a specific weather-AQI pair.
 *
 * @param {Array<Object>} alignedData
 * @param {string} weatherKey
 * @param {string} aqiKey
 * @returns {Array<{x: number, y: number, time: string}>}
 */
export function prepareScatterData(alignedData, weatherKey, aqiKey) {
  return alignedData
    .filter((d) => typeof d[weatherKey] === 'number' && Number.isFinite(d[weatherKey]) && typeof d[aqiKey] === 'number' && Number.isFinite(d[aqiKey]))
    .map((d) => ({
      x: d[weatherKey],
      y: d[aqiKey],
      time: d.time,
    }));
}

// ---------------------------------------------------------------------------
// Dual-axis trend data
// ---------------------------------------------------------------------------

/**
 * Prepares dual-axis line chart data showing weather variable and AQI side-by-side.
 *
 * @param {Array<Object>} alignedData
 * @param {string} weatherKey
 * @param {string} aqiKey
 * @returns {Array<{time: string, timeLabel: string, weather: number|null, aqi: number|null}>}
 */
export function prepareDualAxisData(alignedData, weatherKey, aqiKey) {
  return alignedData
    .filter((d) => typeof d[weatherKey] === 'number' || typeof d[aqiKey] === 'number')
    .map((d) => ({
      time: d.time,
      timeLabel: formatTimeLabel(d.time),
      weather: typeof d[weatherKey] === 'number' ? d[weatherKey] : null,
      aqi: typeof d[aqiKey] === 'number' ? d[aqiKey] : null,
    }));
}

/**
 * Formats an ISO timestamp into a short time label.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatTimeLabel(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

/**
 * Generates natural-language insights from the correlation matrix.
 *
 * @param {Array<Array<{r: number}>>} matrix - The correlation matrix
 * @returns {Array<{title: string, description: string, severity: string, icon: string}>}
 */
export function generateInsights(matrix) {
  const insights = [];
  const weatherKeys = WEATHER_VARIABLES.map((v) => v.key);
  const aqiKeys = AQI_VARIABLES.map((v) => v.key);
  const weatherLabels = WEATHER_VARIABLES.reduce((acc, v) => ({ ...acc, [v.key]: v.label }), {});
  const aqiLabels = AQI_VARIABLES.reduce((acc, v) => ({ ...acc, [v.key]: v.label }), {});

  for (let wi = 0; wi < matrix.length; wi++) {
    for (let ai = 0; ai < matrix[wi].length; ai++) {
      const { r } = matrix[wi][ai];
      const wKey = weatherKeys[wi];
      const aKey = aqiKeys[ai];
      const wLabel = weatherLabels[wKey];
      const aLabel = aqiLabels[aKey];
      const dir = correlationDirection(r);
      const abs = Math.abs(r);

      if (abs >= 0.6) {
        const higher = r > 0 ? 'higher' : 'lower';
        insights.push({
          title: `${wLabel} ↔ ${aLabel}: Strong ${dir} correlation`,
          description: `${wLabel} shows a strong ${dir} relationship with ${aLabel} (r=${r.toFixed(2)}). When ${wLabel} increases, ${aLabel} tends to be ${higher}.`,
          severity: 'high',
          icon: r > 0 ? '📈' : '📉',
        });
      } else if (abs >= 0.35) {
        insights.push({
          title: `${wLabel} ↔ ${aLabel}: Moderate ${dir} link`,
          description: `A moderate ${dir} pattern exists between ${wLabel} and ${aLabel} (r=${r.toFixed(2)}). This may influence local air quality trends.`,
          severity: 'medium',
          icon: '🔍',
        });
      }
    }
  }

  // Add a summary insight about the strongest overall correlation
  let maxAbs = 0;
  let strongestPair = null;
  for (let wi = 0; wi < matrix.length; wi++) {
    for (let ai = 0; ai < matrix[wi].length; ai++) {
      if (Math.abs(matrix[wi][ai].r) > maxAbs) {
        maxAbs = Math.abs(matrix[wi][ai].r);
        strongestPair = { wKey: weatherKeys[wi], aKey: aqiKeys[ai], r: matrix[wi][ai].r };
      }
    }
  }

  if (strongestPair && maxAbs >= 0.2) {
    const { wKey, aKey, r } = strongestPair;
    const wLabel = weatherLabels[wKey];
    const aLabel = aqiLabels[aKey];
    const dir = correlationDirection(r);
    insights.unshift({
      title: `Strongest link: ${wLabel} → ${aLabel}`,
      description: `The strongest weather–pollution correlation is between ${wLabel} and ${aLabel} (${dir}, r=${r.toFixed(2)}). This is the most significant weather factor affecting air quality in this dataset.`,
      severity: 'insight',
      icon: '💡',
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// AQI band classification for color coding
// ---------------------------------------------------------------------------

/**
 * Returns a health-risk color for a given US AQI value.
 *
 * @param {number} aqi
 * @returns {string} Hex color
 */
export function aqiColor(aqi) {
  if (aqi == null || !Number.isFinite(aqi)) return '#94a3b8';
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#9333ea';
  return '#7f1d1d';
}

/**
 * Returns the AQI band label for a given US AQI value.
 *
 * @param {number} aqi
 * @returns {string}
 */
export function aqiBandLabel(aqi) {
  if (aqi == null || !Number.isFinite(aqi)) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}
