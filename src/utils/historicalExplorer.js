// src/utils/historicalExplorer.js
// -----------------------------------------------------------------------------
// Issue #892 — Historical Pollution Explorer
//
// Pure helpers that turn daily aggregated pollution data into the
// shapes the Explorer UI needs:
//   - resampleToView()       — daily → weekly / monthly / yearly rolls
//   - computeMovingAverage() — N-day sliding window over a series
//   - computePercentageChange() — period-over-period delta %
//   - identifyHighestPeriods() — top-N worst intervals
//   - buildExplorerCsv()      — CSV export with the user's selected
//                               pollutant + view granularity
//
// All functions are pure (no React, no fetch, no DOM) so they can be
// unit-tested in isolation, mirroring the pattern in
// `src/utils/historicalAggregate.js`.
// -----------------------------------------------------------------------------

export const POLLUTANTS = [
  { key: 'aqi',    label: 'AQI',    unit: '',        in: 'us_aqi',           out: 'avgAqi', safeLimit: null },
  { key: 'pm25',   label: 'PM2.5',  unit: 'µg/m³',  in: 'pm2_5',            out: 'pm25',   safeLimit: 15 },
  { key: 'pm10',   label: 'PM10',   unit: 'µg/m³',  in: 'pm10',             out: 'pm10',   safeLimit: 45 },
  { key: 'no2',    label: 'NO₂',    unit: 'µg/m³',  in: 'nitrogen_dioxide', out: 'no2',    safeLimit: 25 },
  { key: 'ozone',  label: 'Ozone',  unit: 'µg/m³',  in: 'ozone',            out: 'ozone',  safeLimit: 100 },
  { key: 'co',     label: 'CO',     unit: 'µg/m³',  in: 'carbon_monoxide',  out: 'co',     safeLimit: 4000 },
];

export function getPollutantByKey(key) {
  return POLLUTANTS.find((p) => p.key === key) ?? POLLUTANTS[0];
}

export const VIEWS = ['daily', 'weekly', 'monthly', 'yearly'];

function isReading(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function mean(sum, count, decimals = 1) {
  if (count <= 0) return null;
  const factor = 10 ** decimals;
  return Math.round((sum / count) * factor) / factor;
}

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function resampleToView(dailyRows, view = 'daily') {
  if (!Array.isArray(dailyRows) || dailyRows.length === 0) return [];
  if (!VIEWS.includes(view)) {
    throw new Error(`Unknown view: ${view}. Must be one of ${VIEWS.join(', ')}`);
  }

  if (view === 'daily') {
    return dailyRows.map((row) => ({ ...row, label: row.date, start: row.date }));
  }

  const buckets = new Map();

  for (const row of dailyRows) {
    if (!row || !row.date) continue;
    let key, label, start;
    if (view === 'weekly') {
      key = isoWeekKey(row.date);
      if (!key) continue;
      label = key;
      const [yStr, wStr] = key.split('-W');
      const year = Number(yStr);
      const week = Number(wStr);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const jan4Day = jan4.getUTCDay() || 7;
      const week1Monday = new Date(jan4);
      week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
      const monday = new Date(week1Monday);
      monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
      start = monday.toISOString().split('T')[0];
    } else if (view === 'monthly') {
      key = row.date.substring(0, 7);
      label = key;
      start = `${key}-01`;
    } else {
      key = row.date.substring(0, 4);
      label = key;
      start = `${key}-01-01`;
    }

    if (!buckets.has(key)) {
      const stats = { label, start, days: 0 };
      for (const p of POLLUTANTS) {
        stats[p.out] = { sum: 0, count: 0, max: -Infinity };
      }
      buckets.set(key, stats);
    }
    const bucket = buckets.get(key);
    bucket.days += 1;
    for (const p of POLLUTANTS) {
      const v = row[p.out];
      if (isReading(v)) {
        bucket[p.out].sum += v;
        bucket[p.out].count += 1;
        if (v > bucket[p.out].max) bucket[p.out].max = v;
      }
    }
  }

  const out = [];
  for (const stats of buckets.values()) {
    const row = { label: stats.label, start: stats.start, days: stats.days };
    for (const p of POLLUTANTS) {
      const { sum, count, max } = stats[p.out];
      row[p.out] = mean(sum, count, 1);
      row[`${p.out}_max`] = count > 0 ? Math.round(max) : null;
    }
    out.push(row);
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export function computeMovingAverage(rows, field, window = 7) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (typeof window !== 'number' || window < 1) {
    throw new Error('window must be a positive integer');
  }
  const out = new Array(rows.length).fill(null);
  if (window > rows.length) return out;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const incoming = rows[i]?.[field];
    if (isReading(incoming)) {
      sum += incoming;
      count += 1;
    }
    if (i >= window) {
      const outgoing = rows[i - window]?.[field];
      if (isReading(outgoing)) {
        sum -= outgoing;
        count -= 1;
      }
    }
    if (i >= window - 1 && count > 0) {
      out[i] = Math.round((sum / count) * 10) / 10;
    }
  }
  return out;
}

export function computePercentageChange(oldValue, newValue) {
  if (!isReading(oldValue) || !isReading(newValue)) return null;
  if (oldValue === 0) return null;
  const pct = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  return Math.round(pct * 10) / 10;
}

export function computeHalfRangeChange(rows, field) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const mid = Math.floor(rows.length / 2);
  const firstHalf = rows.slice(0, mid).map((r) => r?.[field]).filter(isReading);
  const secondHalf = rows.slice(mid).map((r) => r?.[field]).filter(isReading);
  if (firstHalf.length === 0 || secondHalf.length === 0) return null;
  const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  return computePercentageChange(firstMean, secondMean);
}

export function identifyHighestPeriods(rows, field, topN = 5) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const withValue = rows
    .filter((r) => isReading(r?.[field]))
    .map((r) => ({
      label: r.label,
      start: r.start,
      days: r.days ?? 1,
      value: r[field],
    }));
  withValue.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return b.days - a.days;
  });
  return withValue.slice(0, topN);
}

export function buildExplorerCsv(rows, pollutantKey, view) {
  const p = getPollutantByKey(pollutantKey);
  const header = ['Period', 'Start', 'Days', `${p.label} Mean`, `${p.label} Max`];
  if (!Array.isArray(rows) || rows.length === 0) return header.join(',');
  const lines = rows.map((r) => {
    const meanVal = r[p.out] ?? '';
    const maxVal = r[`${p.out}_max`] ?? '';
    return [r.label, r.start, r.days ?? '', meanVal, maxVal].join(',');
  });
  return [header.join(','), ...lines].join('\n');
}
