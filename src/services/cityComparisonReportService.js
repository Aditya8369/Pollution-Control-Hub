/**
 * City Comparison Report Service
 *
 * Provides utilities for comparing AQI data across multiple cities:
 * ranking, differential analysis, health-risk categorisation, and
 * structured report generation.
 */

// ---------------------------------------------------------------------------
// AQI band classification
// ---------------------------------------------------------------------------

const AQI_BANDS = [
  { min: 0, max: 50, label: 'Good', color: '#22c55e', risk: 'low' },
  { min: 51, max: 100, label: 'Moderate', color: '#eab308', risk: 'low' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive Groups', color: '#f97316', risk: 'moderate' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#ef4444', risk: 'high' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#9333ea', risk: 'very-high' },
  { min: 301, max: 500, label: 'Hazardous', color: '#7f1d1d', risk: 'extreme' },
];

/**
 * @param {number} aqi
 * @returns {{ label: string, color: string, risk: string }}
 */
export function getAQIBand(aqi) {
  if (aqi == null || !Number.isFinite(aqi)) return { label: 'Unknown', color: '#94a3b8', risk: 'unknown' };
  return AQI_BANDS.find((b) => aqi >= b.min && aqi <= b.max) || { label: 'Hazardous', color: '#7f1d1d', risk: 'extreme' };
}

// ---------------------------------------------------------------------------
// City ranking
// ---------------------------------------------------------------------------

/**
 * Ranks cities by their current AQI (best = lowest AQI first).
 *
 * @param {Array<{ name: string, aqi: number|null, pm2_5?: number|null, pm10?: number|null, no2?: number|null }>} cities
 * @returns {Array<Object>} Sorted copy with rank, band info, and relativeDiff
 */
export function rankCities(cities) {
  if (!Array.isArray(cities) || cities.length === 0) return [];

  const valid = cities.filter((c) => c && typeof c.aqi === 'number' && Number.isFinite(c.aqi));
  const sorted = [...valid].sort((a, b) => a.aqi - b.aqi);

  const bestAqi = sorted[0]?.aqi ?? 0;

  return sorted.map((city, idx) => {
    const band = getAQIBand(city.aqi);
    return {
      ...city,
      rank: idx + 1,
      band,
      relativeDiff: bestAqi > 0 ? ((city.aqi - bestAqi) / bestAqi * 100).toFixed(1) : '0.0',
    };
  });
}

// ---------------------------------------------------------------------------
// Pairwise differential
// ---------------------------------------------------------------------------

/**
 * Computes the differential between two cities' AQI readings.
 *
 * @param {{ name: string, aqi: number|null }} cityA
 * @param {{ name: string, aqi: number|null }} cityB
 * @returns {{ diff: number, percentDiff: string, worseCity: string|null, summary: string }}
 */
export function computeDifferential(cityA, cityB) {
  const aqiA = cityA?.aqi ?? null;
  const aqiB = cityB?.aqi ?? null;

  if (aqiA == null && aqiB == null) {
    return { diff: 0, percentDiff: '0.0', worseCity: null, summary: 'Both cities have no data.' };
  }
  if (aqiA == null) {
    return { diff: 0, percentDiff: '0.0', worseCity: cityB.name, summary: `${cityA.name} has no data; ${cityB.name} AQI is ${aqiB}.` };
  }
  if (aqiB == null) {
    return { diff: 0, percentDiff: '0.0', worseCity: cityA.name, summary: `${cityB.name} has no data; ${cityA.name} AQI is ${aqiA}.` };
  }

  const diff = aqiA - aqiB;
  const pct = aqiB !== 0 ? Math.abs(diff / aqiB * 100).toFixed(1) : '0.0';
  const worseCity = diff > 0 ? cityA.name : diff < 0 ? cityB.name : null;

  let summary;
  if (diff === 0) {
    summary = `${cityA.name} and ${cityB.name} have identical AQI (${aqiA}).`;
  } else {
    const cleaner = diff < 0 ? cityA.name : cityB.name;
    const dirtier = diff > 0 ? cityA.name : cityB.name;
    summary = `${dirtier} has ${Math.abs(diff)} higher AQI (${pct}% worse) than ${cleaner}.`;
  }

  return { diff, percentDiff: pct, worseCity, summary };
}

// ---------------------------------------------------------------------------
// Health risk categorisation
// ---------------------------------------------------------------------------

/**
 * Categorises a list of cities into risk groups based on AQI.
 *
 * @param {Array<{ name: string, aqi: number|null }>} cities
 * @returns {{ safe: string[], moderate: string[], unhealthy: string[], critical: string[] }}
 */
export function categoriseByRisk(cities) {
  const result = { safe: [], moderate: [], unhealthy: [], critical: [] };

  for (const city of cities || []) {
    const aqi = city?.aqi;
    if (aqi == null || !Number.isFinite(aqi)) continue;

    if (aqi <= 100) result.safe.push(city.name);
    else if (aqi <= 150) result.moderate.push(city.name);
    else if (aqi <= 200) result.unhealthy.push(city.name);
    else result.critical.push(city.name);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pollutant breakdown comparison
// ---------------------------------------------------------------------------

/**
 * Compares pollutant levels across cities and returns a structured breakdown.
 *
 * @param {Array<{ name: string, pm2_5?: number|null, pm10?: number|null, no2?: number|null, o3?: number|null, co?: number|null }>} cities
 * @returns {Array<Object>} Array of pollutant comparison objects
 */
export function comparePollutants(cities) {
  const pollutants = [
    { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', whoLimit: 15 },
    { key: 'pm10', label: 'PM10', unit: 'µg/m³', whoLimit: 45 },
    { key: 'no2', label: 'NO₂', unit: 'µg/m³', whoLimit: 25 },
    { key: 'o3', label: 'O₃', unit: 'µg/m³', whoLimit: 100 },
    { key: 'co', label: 'CO', unit: 'mg/m³', whoLimit: 4 },
  ];

  return pollutants.map((p) => {
    const readings = (cities || []).map((c) => ({
      city: c.name,
      value: c[p.key] ?? null,
      exceedsLimit: typeof c[p.key] === 'number' && c[p.key] > p.whoLimit,
    }));

    const validValues = readings.filter((r) => typeof r.value === 'number').map((r) => r.value);
    const avg = validValues.length > 0 ? validValues.reduce((s, v) => s + v, 0) / validValues.length : 0;

    return {
      pollutant: p.label,
      key: p.key,
      unit: p.unit,
      whoLimit: p.whoLimit,
      readings,
      average: avg,
      citiesExceedingLimit: readings.filter((r) => r.exceedsLimit).map((r) => r.city),
    };
  });
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Generates a CSV string comparing multiple cities.
 *
 * @param {Array<Object>} rankedCities - Output of rankCities()
 * @returns {string}
 */
export function comparisonToCSV(rankedCities) {
  const headers = ['Rank', 'City', 'US AQI', 'AQI Band', 'Risk Level', 'PM2.5', 'PM10', 'NO₂', 'O₃', 'CO', 'Diff from Best (%)'];
  const rows = rankedCities.map((c) => [
    c.rank,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    c.aqi ?? '',
    `"${c.band?.label ?? ''}"`,
    c.band?.risk ?? '',
    c.pm2_5 ?? '',
    c.pm10 ?? '',
    c.no2 ?? '',
    c.o3 ?? '',
    c.co ?? '',
    c.relativeDiff,
  ]);

  const header = `# Multi-City AQI Comparison — Generated ${new Date().toISOString()}`;
  return `${header}\n${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

/**
 * Generates a human-readable comparison summary.
 *
 * @param {Array<Object>} rankedCities
 * @returns {string}
 */
export function generateComparisonSummary(rankedCities) {
  if (!rankedCities || rankedCities.length === 0) return 'No cities to compare.';
  if (rankedCities.length === 1) return `Only one city (${rankedCities[0].name}) available for comparison.`;

  const best = rankedCities[0];
  const worst = rankedCities[rankedCities.length - 1];
  const riskGroups = categoriseByRisk(rankedCities);

  const lines = [
    '═══════════════════════════════════════════════════',
    '  MULTI-CITY AIR QUALITY COMPARISON',
    `  Generated: ${new Date().toLocaleString()}`,
    '═══════════════════════════════════════════════════',
    '',
    `  Cities compared: ${rankedCities.length}`,
    '',
    '  ─── Rankings (Best to Worst) ───',
    '',
  ];

  for (const city of rankedCities) {
    const medal = city.rank === 1 ? '🥇' : city.rank === 2 ? '🥈' : city.rank === 3 ? '🥉' : `#${city.rank}`;
    lines.push(`  ${medal}  ${city.name.padEnd(20)} AQI ${String(city.aqi).padStart(4)}  (${city.band.label})`);
  }

  lines.push('');
  lines.push('  ─── Risk Summary ───');
  if (riskGroups.safe.length) lines.push(`  ✅ Safe (AQI ≤ 100):       ${riskGroups.safe.join(', ')}`);
  if (riskGroups.moderate.length) lines.push(`  🟡 Moderate (101–150):     ${riskGroups.moderate.join(', ')}`);
  if (riskGroups.unhealthy.length) lines.push(`  🟠 Unhealthy (151–200):    ${riskGroups.unhealthy.join(', ')}`);
  if (riskGroups.critical.length) lines.push(`  🔴 Critical (201+):        ${riskGroups.critical.join(', ')}`);

  lines.push('');
  lines.push(`  Cleanest city: ${best.name} (AQI ${best.aqi})`);
  lines.push(`  Most polluted: ${worst.name} (AQI ${worst.aqi})`);

  const diff = computeDifferential(best, worst);
  lines.push(`  Gap: ${Math.abs(diff.diff)} AQI points (${diff.percentDiff}%)`);

  lines.push('');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('  Source: Pollution Control Hub');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}
