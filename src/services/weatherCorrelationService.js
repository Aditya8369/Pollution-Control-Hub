/**
 * Weather–Health Correlation Service
 *
 * Computes statistical correlations between weather variables (temperature,
 * humidity, wind speed) and air-quality metrics (PM2.5, PM10, NO₂, O₃, CO, US AQI).
 *
 * All computations are pure — they accept arrays of data points and return
 * derived structures. No network requests are made here.
 */

import { getAQIBand } from './airQualityService';

/** Minimum number of valid paired observations required to compute correlation. */
export const MIN_CORRELATION_OBSERVATIONS = 3;

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

/**
 * Arithmetic mean of a numeric array. Ignores non-finite values (NaN, Infinity).
 * Returns 0 for empty or invalid arrays.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function mean(values) {
  if (!Array.isArray(values)) return 0;
  const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return sum / valid.length;
}

/**
 * Population standard deviation. Returns 0 when fewer than 2 valid values exist.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function stddev(values) {
  if (!Array.isArray(values)) return 0;
  const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length < 2) return 0;
  const avg = mean(valid);
  const variance = valid.reduce((acc, v) => acc + (v - avg) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

/**
 * Pearson product-moment correlation coefficient between two numeric arrays.
 * Returns null when inputs are invalid, datasets are empty, observations are
 * fewer than MIN_CORRELATION_OBSERVATIONS (3), or standard deviation is 0.
 *
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number|null} r in [-1, 1], or null if unavailable
 */
export function pearsonCorrelation(x, y) {
  if (!Array.isArray(x) || !Array.isArray(y)) return null;
  const n = Math.min(x.length, y.length);
  if (n < MIN_CORRELATION_OBSERVATIONS) return null;

  const pairs = [];
  for (let i = 0; i < n; i++) {
    if (typeof x[i] === 'number' && Number.isFinite(x[i]) && typeof y[i] === 'number' && Number.isFinite(y[i])) {
      pairs.push([x[i], y[i]]);
    }
  }
  if (pairs.length < MIN_CORRELATION_OBSERVATIONS) return null;

  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const sx = stddev(xs);
  const sy = stddev(ys);

  if (sx === 0 || sy === 0) return 0; // Degenerate / constant input has no linear variance

  const covariance = pairs.reduce((acc, [xv, yv]) => acc + (xv - mx) * (yv - my), 0) / pairs.length;
  const r = covariance / (sx * sy);

  if (!Number.isFinite(r)) return null;
  return Math.max(-1, Math.min(1, r));
}

/**
 * Classifies a correlation coefficient into a human-readable strength label.
 *
 * Thresholds:
 * - |r| >= 0.7: Strong
 * - 0.4 <= |r| < 0.7: Moderate
 * - 0.2 <= |r| < 0.4: Weak
 * - |r| < 0.2: Negligible
 *
 * @param {number|null} r - Correlation coefficient in [-1, 1]
 * @returns {{ label: string, color: string, emoji: string, unavailable: boolean }}
 */
export function classifyCorrelation(r) {
  if (r === null || r === undefined || !Number.isFinite(r)) {
    return { label: 'Unavailable', color: '#94a3b8', emoji: '⚪', unavailable: true };
  }
  const abs = Math.abs(r);
  if (abs >= 0.7) return { label: 'Strong', color: '#ef4444', emoji: '🔴', unavailable: false };
  if (abs >= 0.4) return { label: 'Moderate', color: '#f59e0b', emoji: '🟡', unavailable: false };
  if (abs >= 0.2) return { label: 'Weak', color: '#3b82f6', emoji: '🔵', unavailable: false };
  return { label: 'Negligible', color: '#94a3b8', emoji: '⚪', unavailable: false };
}

/**
 * Returns the direction description for a correlation.
 *
 * @param {number|null} r
 * @returns {string}
 */
export function correlationDirection(r) {
  if (r === null || r === undefined || !Number.isFinite(r)) return 'none';
  if (r > 0.05) return 'positive';
  if (r < -0.05) return 'negative';
  return 'no';
}

// ---------------------------------------------------------------------------
// Variable definitions
// ---------------------------------------------------------------------------

export const WEATHER_VARIABLES = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️' },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: '💧' },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'm/s', icon: '🌬️' },
];

export const POLLUTANT_VARIABLES = [
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', icon: '🔬' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: '🌫️' },
  { key: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³', icon: '⚗️' },
  { key: 'ozone', label: 'O₃', unit: 'µg/m³', icon: '☀️' },
  { key: 'carbon_monoxide', label: 'CO', unit: 'mg/m³', icon: '💨' },
];

export const AQI_VARIABLES = [
  { key: 'us_aqi', label: 'US AQI', unit: '', icon: '📊' },
  ...POLLUTANT_VARIABLES,
];

// ---------------------------------------------------------------------------
// Core dataset alignment
// ---------------------------------------------------------------------------

/**
 * Aligns weather data points with pollutant/AQI trend data by ISO hour stamp.
 * Returns a merged dataset suitable for correlation analysis.
 *
 * @param {Array<Object>} weatherData
 * @param {Array<Object>} trendData
 * @returns {Array<Object>} Merged data points
 */
export function alignDatasets(weatherData, trendData) {
  if (!Array.isArray(weatherData) || !Array.isArray(trendData) || trendData.length === 0) {
    return [];
  }

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
 * Builds a full correlation matrix between all weather variables and pollutant/AQI variables.
 *
 * @param {Array<Object>} alignedData
 * @returns {{ matrix: Array<Array<{r: number|null, count: number, label: string, color: string, emoji: string, unavailable: boolean}>>, weatherKeys: string[], pollutantKeys: string[] }}
 */
export function computeCorrelationMatrix(alignedData) {
  const weatherKeys = WEATHER_VARIABLES.map((v) => v.key);
  const pollutantKeys = POLLUTANT_VARIABLES.map((v) => v.key);

  const matrix = weatherKeys.map((wk) =>
    pollutantKeys.map((pk) => {
      const validPairs = alignedData.filter(
        (d) => typeof d[wk] === 'number' && Number.isFinite(d[wk]) && typeof d[pk] === 'number' && Number.isFinite(d[pk])
      );
      const xVals = validPairs.map((d) => d[wk]);
      const yVals = validPairs.map((d) => d[pk]);
      const r = pearsonCorrelation(xVals, yVals);
      return {
        r,
        count: validPairs.length,
        ...classifyCorrelation(r),
      };
    })
  );

  return { matrix, weatherKeys, pollutantKeys };
}

// ---------------------------------------------------------------------------
// Scatter & Dual Axis Data Preparation
// ---------------------------------------------------------------------------

/**
 * Prepares scatter-plot data for a specific weather-pollutant pair.
 *
 * @param {Array<Object>} alignedData
 * @param {string} weatherKey
 * @param {string} pollutantKey
 * @returns {Array<{x: number, y: number, time: string}>}
 */
export function prepareScatterData(alignedData, weatherKey, pollutantKey) {
  if (!Array.isArray(alignedData)) return [];
  return alignedData
    .filter(
      (d) =>
        typeof d[weatherKey] === 'number' &&
        Number.isFinite(d[weatherKey]) &&
        typeof d[pollutantKey] === 'number' &&
        Number.isFinite(d[pollutantKey])
    )
    .map((d) => ({
      x: d[weatherKey],
      y: d[pollutantKey],
      time: d.time,
    }));
}

/**
 * Prepares dual-axis line chart data for a weather variable and pollutant variable.
 *
 * @param {Array<Object>} alignedData
 * @param {string} weatherKey
 * @param {string} pollutantKey
 * @returns {Array<{time: string, timeLabel: string, weather: number|null, pollutant: number|null}>}
 */
export function prepareDualAxisData(alignedData, weatherKey, pollutantKey) {
  if (!Array.isArray(alignedData)) return [];
  return alignedData
    .filter((d) => typeof d[weatherKey] === 'number' || typeof d[pollutantKey] === 'number')
    .map((d) => ({
      time: d.time,
      timeLabel: formatTimeLabel(d.time),
      weather: typeof d[weatherKey] === 'number' && Number.isFinite(d[weatherKey]) ? d[weatherKey] : null,
      pollutant: typeof d[pollutantKey] === 'number' && Number.isFinite(d[pollutantKey]) ? d[pollutantKey] : null,
    }));
}

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
// AQI Band Breakdown Calculation
// ---------------------------------------------------------------------------

/**
 * Groups valid observations by AQI category and calculates summary metrics.
 *
 * @param {Array<Object>} alignedData
 * @param {string} weatherKey
 * @returns {Array<{ name: string, value: number, count: number, color: string }>}
 */
export function computeAqiBandBreakdown(alignedData, weatherKey) {
  if (!Array.isArray(alignedData) || alignedData.length === 0) return [];

  const bands = [
    { label: 'Good (0–50)', min: 0, max: 50, color: '#1f9d55', values: [] },
    { label: 'Moderate (51–100)', min: 51, max: 100, color: '#f59e0b', values: [] },
    { label: 'Unhealthy (Sensitive) (101–150)', min: 101, max: 150, color: '#f97316', values: [] },
    { label: 'Unhealthy (151–200)', min: 151, max: 200, color: '#ef4444', values: [] },
    { label: 'Very Unhealthy (201–300)', min: 201, max: 300, color: '#b91c1c', values: [] },
    { label: 'Hazardous (301+)', min: 301, max: 5000, color: '#7f1d1d', values: [] },
  ];

  for (const d of alignedData) {
    const aqi = d.us_aqi;
    const wVal = d[weatherKey];
    if (typeof aqi !== 'number' || !Number.isFinite(aqi) || typeof wVal !== 'number' || !Number.isFinite(wVal)) {
      continue;
    }
    const band = bands.find((b) => aqi >= b.min && aqi <= b.max);
    if (band) band.values.push(wVal);
  }

  return bands
    .filter((b) => b.values.length > 0)
    .map((b) => ({
      name: b.label,
      value: mean(b.values),
      count: b.values.length,
      color: b.color,
    }));
}

// ---------------------------------------------------------------------------
// Insight generation with Severity Ratings
// ---------------------------------------------------------------------------

/**
 * Generates severity-rated insights derived from calculated matrix data.
 *
 * Severity rules:
 * - "high": Strong correlation (|r| >= 0.7) with high-risk pollutant (PM2.5, NO2, O3) or significant trend.
 * - "medium": Moderate correlation (0.4 <= |r| < 0.7).
 * - "insight": Weak/negligible correlation (0.2 <= |r| < 0.4) or general finding.
 * - "insufficient": When observation count is below minimum required sample size (n < MIN_CORRELATION_OBSERVATIONS).
 *
 * @param {Array<Array<{r: number|null, count: number}>>} matrix
 * @param {number} totalObservations
 * @returns {Array<{title: string, description: string, severity: string, icon: string}>}
 */
export function generateInsights(matrix, totalObservations = 0) {
  const insights = [];
  const weatherKeys = WEATHER_VARIABLES.map((v) => v.key);
  const pollutantKeys = POLLUTANT_VARIABLES.map((v) => v.key);
  const weatherLabels = WEATHER_VARIABLES.reduce((acc, v) => ({ ...acc, [v.key]: v.label }), {});
  const pollutantLabels = POLLUTANT_VARIABLES.reduce((acc, v) => ({ ...acc, [v.key]: v.label }), {});

  if (!matrix || matrix.length === 0 || totalObservations < MIN_CORRELATION_OBSERVATIONS) {
    return [
      {
        title: 'Insufficient Data for Correlation Analytics',
        description: `Only ${totalObservations} aligned observation(s) available. A minimum of ${MIN_CORRELATION_OBSERVATIONS} overlapping weather and pollutant measurements is required for statistical reliability.`,
        severity: 'insufficient',
        icon: '⚠️',
      },
    ];
  }

  let totalValidPairs = 0;

  for (let wi = 0; wi < matrix.length; wi++) {
    for (let pi = 0; pi < matrix[wi].length; pi++) {
      const cell = matrix[wi][pi];
      if (!cell || cell.r === null) continue;
      totalValidPairs++;
      const { r, count } = cell;
      const wKey = weatherKeys[wi];
      const pKey = pollutantKeys[pi];
      const wLabel = weatherLabels[wKey];
      const pLabel = pollutantLabels[pKey];
      const dir = correlationDirection(r);
      const abs = Math.abs(r);

      if (abs >= 0.7) {
        const higher = r > 0 ? 'elevated' : 'reduced';
        const severity = ['pm2_5', 'nitrogen_dioxide', 'ozone'].includes(pKey) ? 'high' : 'medium';
        insights.push({
          title: `${wLabel} ↔ ${pLabel}: Strong ${dir} correlation`,
          description: `${wLabel} exhibits a strong ${dir} observational pattern with ${pLabel} (r=${r.toFixed(2)}, n=${count}). Higher ${wLabel} is associated with ${higher} ${pLabel} levels.`,
          severity,
          icon: r > 0 ? '🔴' : '🔵',
        });
      } else if (abs >= 0.4) {
        insights.push({
          title: `${wLabel} ↔ ${pLabel}: Moderate ${dir} correlation`,
          description: `A moderate ${dir} association exists between ${wLabel} and ${pLabel} (r=${r.toFixed(2)}, n=${count}).`,
          severity: 'medium',
          icon: '🟡',
        });
      }
    }
  }

  if (totalValidPairs === 0) {
    return [
      {
        title: 'Insufficient Observations',
        description: `No valid overlapping pairs were found for the selected weather and pollutant metrics. Further monitoring data is being gathered.`,
        severity: 'insufficient',
        icon: '⚠️',
      },
    ];
  }

  // Summary insight: Highlight strongest pair
  let maxAbs = 0;
  let strongestPair = null;
  for (let wi = 0; wi < matrix.length; wi++) {
    for (let pi = 0; pi < matrix[wi].length; pi++) {
      const cell = matrix[wi]?.[pi];
      if (cell && cell.r !== null && Math.abs(cell.r) > maxAbs) {
        maxAbs = Math.abs(cell.r);
        strongestPair = { wKey: weatherKeys[wi], pKey: pollutantKeys[pi], r: cell.r, count: cell.count };
      }
    }
  }

  if (strongestPair && maxAbs >= 0.2) {
    const { wKey, pKey, r, count } = strongestPair;
    const wLabel = weatherLabels[wKey];
    const pLabel = pollutantLabels[pKey];
    const dir = correlationDirection(r);
    insights.unshift({
      title: `Strongest Weather Factor: ${wLabel} ↔ ${pLabel}`,
      description: `The strongest observed weather correlation is between ${wLabel} and ${pLabel} (${dir}, r=${r.toFixed(2)}, n=${count}). Note: Correlation indicates observational patterns and does not establish direct causation.`,
      severity: maxAbs >= 0.7 ? 'high' : 'insight',
      icon: '💡',
    });
  }

  return insights;
}

// Re-export AQI color and band helpers from airQualityService for consistency
export { getAQIBand };
export function aqiColor(aqi) {
  return getAQIBand(aqi).color;
}
export function aqiBandLabel(aqi) {
  return getAQIBand(aqi).label;
}
