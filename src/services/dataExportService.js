/**
 * Data Export Service
 *
 * Provides utilities for exporting air-quality trend data in multiple formats
 * (CSV, JSON, formatted text reports), generating shareable data URLs, and
 * copying structured reports to the clipboard.
 *
 * All functions are pure / side-effect-only — no network requests.
 */

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Converts an array of AQI trend data points into a CSV string.
 *
 * Each row includes: timestamp, US AQI, PM2.5, PM10, NO₂, O₃, CO.
 * Null/missing values are written as empty fields.
 *
 * @param {Array<Object>} trendData - Hourly AQI trend points
 * @param {string} [cityName='Unknown'] - City label for the header comment
 * @returns {string} Complete CSV content with header row
 */
export function trendToCSV(trendData, cityName = 'Unknown') {
  const headers = [
    'Timestamp',
    'US AQI',
    'PM2.5 (µg/m³)',
    'PM10 (µg/m³)',
    'NO₂ (µg/m³)',
    'O₃ (µg/m³)',
    'CO (mg/m³)',
  ];

  const rows = (Array.isArray(trendData) ? trendData : []).map((point) => [
    point.time ?? '',
    formatNumber(point.us_aqi),
    formatNumber(point.pm2_5),
    formatNumber(point.pm10),
    formatNumber(point.nitrogen_dioxide),
    formatNumber(point.ozone),
    formatNumber(point.carbon_monoxide),
  ]);

  const headerComment = `# Air Quality Data Export — ${cityName} — Generated ${new Date().toISOString()}`;
  const csvHeader = headers.join(',');
  const csvRows = rows.map((r) => r.join(',')).join('\n');

  return `${headerComment}\n${csvHeader}\n${csvRows}`;
}

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------

/**
 * Serialises trend data into a structured JSON export object.
 *
 * @param {Array<Object>} trendData
 * @param {string} cityName
 * @param {{ lat: number, lon: number }} position
 * @returns {string} Pretty-printed JSON string
 */
export function trendToJSON(trendData, cityName, position) {
  const payload = {
    exportVersion: '1.0',
    generatedAt: new Date().toISOString(),
    city: cityName,
    coordinates: {
      latitude: position?.lat ?? null,
      longitude: position?.lon ?? null,
    },
    dataPoints: (Array.isArray(trendData) ? trendData : []).map((point) => ({
      timestamp: point.time ?? null,
      aqi: {
        us_aqi: point.us_aqi ?? null,
      },
      pollutants: {
        pm2_5: point.pm2_5 ?? null,
        pm10: point.pm10 ?? null,
        nitrogen_dioxide: point.nitrogen_dioxide ?? null,
        ozone: point.ozone ?? null,
        carbon_monoxide: point.carbon_monoxide ?? null,
      },
    })),
    metadata: {
      totalDataPoints: (trendData || []).length,
      exportFormat: 'json',
    },
  };

  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// Formatted text report
// ---------------------------------------------------------------------------

/**
 * Generates a human-readable text report of current AQI conditions.
 *
 * @param {Object} current - Current AQI readings { us_aqi, pm2_5, pm10, nitrogen_dioxide, ozone, carbon_monoxide }
 * @param {string} cityName
 * @param {Object} [position]
 * @returns {string}
 */
export function generateTextReport(current, cityName, position) {
  if (!current) return 'No data available.';

  const now = new Date().toLocaleString();
  const aqiBand = getAQIBandLabel(current.us_aqi);

  const lines = [
    '═══════════════════════════════════════════════════',
    `  AIR QUALITY REPORT — ${cityName.toUpperCase()}`,
    `  Generated: ${now}`,
    '═══════════════════════════════════════════════════',
    '',
    `  US AQI:  ${current.us_aqi ?? '—'}  (${aqiBand})`,
    '',
    '  Pollutant Readings:',
    `    PM2.5:            ${current.pm2_5 ?? '—'} µg/m³`,
    `    PM10:             ${current.pm10 ?? '—'} µg/m³`,
    `    Nitrogen Dioxide: ${current.nitrogen_dioxide ?? '—'} µg/m³`,
    `    Ozone:            ${current.ozone ?? '—'} µg/m³`,
    `    Carbon Monoxide:  ${current.carbon_monoxide ?? '—'} mg/m³`,
    '',
  ];

  if (position?.lat && position?.lon) {
    lines.push(`  Location: ${position.lat.toFixed(4)}°N, ${position.lon.toFixed(4)}°E`);
    if (cityName) lines.push(`  City:     ${cityName}`);
    lines.push('');
  }

  // Health guidance
  lines.push('  ─── Health Guidance ───');
  if (current.us_aqi <= 50) {
    lines.push('  ✅ Air quality is satisfactory. No health risk for the general public.');
  } else if (current.us_aqi <= 100) {
    lines.push('  🟡 Air quality is acceptable. Unusually sensitive individuals should');
    lines.push('     consider reducing prolonged outdoor exertion.');
  } else if (current.us_aqi <= 150) {
    lines.push('  🟠 Members of sensitive groups may experience health effects.');
    lines.push('     The general public is less likely to be affected.');
  } else if (current.us_aqi <= 200) {
    lines.push('  🔴 Everyone may begin to experience health effects;');
    lines.push('     sensitive groups may experience more serious effects.');
  } else if (current.us_aqi <= 300) {
    lines.push('  🟣 Health alert: everyone may experience more serious health effects.');
  } else {
    lines.push('  🟤 Health warning of emergency conditions.');
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('  Source: Pollution Control Hub — https://pollution-control-hub');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Shareable link
// ---------------------------------------------------------------------------

/**
 * Generates a shareable URL that encodes the current city & position in the
 * URL hash so the recipient's browser loads the same city.
 *
 * @param {string} cityName
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
export function generateShareableLink(cityName, lat, lon) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://pollution-control-hub.netlify.app/';
  const params = new URLSearchParams();
  params.set('city', cityName);
  params.set('lat', String(lat));
  params.set('lon', String(lon));
  return `${base}#${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file download with the given content.
 *
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function triggerDownload(content, filename, mimeType = 'text/plain') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to the clipboard and returns success status.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Batch export (multiple trend datasets)
// ---------------------------------------------------------------------------

/**
 * Merges multiple city trend datasets into a single CSV with a "City" column.
 *
 * @param {Array<{ cityName: string, trend: Array<Object> }>} datasets
 * @returns {string}
 */
export function batchTrendToCSV(datasets) {
  const headers = [
    'City',
    'Timestamp',
    'US AQI',
    'PM2.5 (µg/m³)',
    'PM10 (µg/m³)',
    'NO₂ (µg/m³)',
    'O₃ (µg/m³)',
    'CO (mg/m³)',
  ];

  const rows = [];
  for (const { cityName, trend } of datasets) {
    for (const point of trend || []) {
      rows.push([
        `"${(cityName || '').replace(/"/g, '""')}"`,
        point.time ?? '',
        formatNumber(point.us_aqi),
        formatNumber(point.pm2_5),
        formatNumber(point.pm10),
        formatNumber(point.nitrogen_dioxide),
        formatNumber(point.ozone),
        formatNumber(point.carbon_monoxide),
      ]);
    }
  }

  const headerComment = `# Multi-City Air Quality Data Export — Generated ${new Date().toISOString()}`;
  return `${headerComment}\n${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
}

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

/**
 * Computes summary statistics for a trend dataset.
 *
 * @param {Array<Object>} trendData
 * @returns {{ count: number, avgAqi: number, maxAqi: number, minAqi: number, avgPm25: number, avgPm10: number, avgNo2: number }}
 */
export function computeSummaryStats(trendData) {
  const data = Array.isArray(trendData) ? trendData : [];
  if (data.length === 0) {
    return { count: 0, avgAqi: 0, maxAqi: 0, minAqi: 0, avgPm25: 0, avgPm10: 0, avgNo2: 0 };
  }

  const aqiValues = data.map((d) => d.us_aqi).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const pm25Values = data.map((d) => d.pm2_5).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const pm10Values = data.map((d) => d.pm10).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const no2Values = data.map((d) => d.nitrogen_dioxide).filter((v) => typeof v === 'number' && Number.isFinite(v));

  return {
    count: data.length,
    avgAqi: avg(aqiValues),
    maxAqi: aqiValues.length > 0 ? Math.max(...aqiValues) : 0,
    minAqi: aqiValues.length > 0 ? Math.min(...aqiValues) : 0,
    avgPm25: avg(pm25Values),
    avgPm10: avg(pm10Values),
    avgNo2: avg(no2Values),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function getAQIBandLabel(aqi) {
  if (aqi == null) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}
