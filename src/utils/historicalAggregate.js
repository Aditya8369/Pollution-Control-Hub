/**
 * Rolls an Open-Meteo hourly archive payload up into daily and monthly figures.
 *
 * Extracted from historicalDataWorker.js so the arithmetic can be tested without
 * spinning up a Worker. The worker is now a thin postMessage wrapper around this.
 *
 * The rule this module exists to enforce: a day the archive has no measurement for
 * is reported as `null`, never as `0`. Open-Meteo returns the full hourly time axis
 * and pads absent measurements with null, so a day with no coverage still arrives as
 * 24 timestamps -- it is present in the response but empty. Emitting 0 for it made it
 * indistinguishable from a genuine reading of 0, which getAQIBand() maps to "Good".
 */

/** Pollutant series carried alongside us_aqi, keyed by the field name we emit. */
const POLLUTANT_SERIES = [
  { out: 'pm25', in: 'pm2_5' },
  { out: 'pm10', in: 'pm10' },
  { out: 'co', in: 'carbon_monoxide' },
  { out: 'no2', in: 'nitrogen_dioxide' },
  { out: 'ozone', in: 'ozone' },
];

function emptyDayStats() {
  const stats = { aqiSum: 0, aqiCount: 0, aqiMax: -Infinity };
  for (const series of POLLUTANT_SERIES) {
    stats[series.out] = { sum: 0, count: 0 };
  }
  return stats;
}

/**
 * Mean of a running sum, or null when nothing was measured.
 *
 * @param {number} sum
 * @param {number} count
 * @param {number} [decimals] Rounding precision; omit for whole numbers.
 * @returns {number|null}
 */
function mean(sum, count, decimals = 0) {
  if (count <= 0) return null;
  const factor = 10 ** decimals;
  return Math.round((sum / count) * factor) / factor;
}

/**
 * True when a value is a usable numeric reading.
 *
 * Open-Meteo uses null for "not measured". Guarding on `!= null` alone would let a
 * NaN or a string through into the sums, where it would silently poison the mean.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isReading(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {any} payload An Open-Meteo air-quality response with an `hourly` block.
 * @returns {{
 *   daily: Array<object>,
 *   monthly: Array<object>,
 *   overallAvg: number|null,
 *   daysInRange: number,
 *   daysWithReadings: number,
 * }}
 */
export function aggregateHourlyToDaily(payload) {
  const hourly = payload?.hourly ?? {};
  const times = hourly.time || [];
  const aqiValues = hourly.us_aqi || [];

  /** @type {Map<string, any>} */
  const dailyData = new Map();

  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (!time) continue;

    // "2024-03-01T00:00" -> "2024-03-01"
    const dateStr = String(time).split('T')[0];

    if (!dailyData.has(dateStr)) {
      dailyData.set(dateStr, emptyDayStats());
    }
    const stats = dailyData.get(dateStr);

    const aqi = aqiValues[i];
    if (isReading(aqi)) {
      stats.aqiSum += aqi;
      stats.aqiCount += 1;
      if (aqi > stats.aqiMax) stats.aqiMax = aqi;
    }

    for (const series of POLLUTANT_SERIES) {
      const value = (hourly[series.in] || [])[i];
      if (isReading(value)) {
        stats[series.out].sum += value;
        stats[series.out].count += 1;
      }
    }
  }

  /** @type {any[]} */
  const daily = [];

  for (const [dateStr, stats] of dailyData) {
    const hasReading = stats.aqiCount > 0;

    const day = {
      date: dateStr,
      // null, not 0. A day with no hourly AQI values was not measured -- it was not
      // measured as clean. Consumers filter on this rather than averaging it in.
      avgAqi: mean(stats.aqiSum, stats.aqiCount),
      maxAqi: hasReading ? Math.round(stats.aqiMax) : null,
      hasReading,
      // How much of the day was actually covered, so a single-hour day can be told
      // apart from a fully-sampled one.
      hoursMeasured: stats.aqiCount,
    };

    for (const series of POLLUTANT_SERIES) {
      const { sum, count } = stats[series.out];
      day[series.out] = mean(sum, count, 1);
    }

    daily.push(day);
  }

  // The Map preserves insertion order, which follows the response's time axis. Sorting
  // makes the contract explicit rather than inherited, since callers index daily[0] and
  // daily[length - 1] as the range bounds.
  daily.sort((a, b) => a.date.localeCompare(b.date));

  const measuredDays = daily.filter((day) => day.hasReading);

  /** @type {Record<string, {sum: number, count: number, max: number}>} */
  const monthlyBuckets = {};
  for (const day of measuredDays) {
    const month = day.date.substring(0, 7); // YYYY-MM
    if (!monthlyBuckets[month]) {
      monthlyBuckets[month] = { sum: 0, count: 0, max: -Infinity };
    }
    monthlyBuckets[month].sum += day.avgAqi;
    monthlyBuckets[month].count += 1;
    if (day.maxAqi > monthlyBuckets[month].max) {
      monthlyBuckets[month].max = day.maxAqi;
    }
  }

  const monthly = Object.keys(monthlyBuckets)
    .sort()
    .map((month) => ({
      month,
      avgAqi: mean(monthlyBuckets[month].sum, monthlyBuckets[month].count),
      maxAqi: Math.round(monthlyBuckets[month].max),
      daysMeasured: monthlyBuckets[month].count,
    }));

  // Divided by the days that carry a reading, not by every day in the window. The old
  // code counted empty days in the denominator with 0 in the numerator, biasing the
  // headline average toward clean in exact proportion to how patchy coverage was.
  const overallAvg = mean(
    measuredDays.reduce((sum, day) => sum + day.avgAqi, 0),
    measuredDays.length
  );

  return {
    daily,
    monthly,
    overallAvg,
    daysInRange: daily.length,
    daysWithReadings: measuredDays.length,
  };
}

/**
 * The AQI a day should be judged on, or null when the day holds no reading.
 *
 * Consumers were spelling `d.maxAqi != null ? d.maxAqi : d.aqi` inline and then
 * comparing the result numerically, which silently accepts null (`null <= 50` is
 * true, so an unmeasured day was counted as "Good").
 *
 * @param {any} day
 * @returns {number|null}
 */
export function dayAqi(day) {
  if (!day) return null;
  if (isReading(day.maxAqi)) return day.maxAqi;
  if (isReading(day.aqi)) return day.aqi;
  return null;
}
