/**
 * Pollution trend anomaly detection (issue #927).
 *
 * "Normal" is relative to the hour of day — PM2.5 at 8am rush hour and at
 * 3am are not the same baseline. So instead of one flat average, this builds
 * 24 separate baselines (one per hour of day) from recent history, then
 * compares the live reading against whichever hour it's currently in.
 */

export const POLLUTANT_FIELDS = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone', 'carbon_monoxide', 'us_aqi'];

export const FIELD_LABELS = {
    pm2_5: 'PM2.5',
    pm10: 'PM10',
    nitrogen_dioxide: 'NO2',
    ozone: 'O3',
    carbon_monoxide: 'CO',
    us_aqi: 'AQI',
};

/**
 * @typedef {{ mean: number, stdDev: number, sampleSize: number }} HourStat
 */

/**
 * Builds a per-hour-of-day baseline (mean + standard deviation) for each
 * pollutant from raw Open-Meteo hourly history (as returned by
 * fetchHistoricalData), so "normal for this hour" can be compared against
 * the live reading at the same hour.
 *
 * @param {{ hourly?: { time?: string[], [pollutant: string]: any } }} historicalPayload
 * @returns {Record<number, Record<string, HourStat|null>>} Keyed by hour-of-day (0-23), then pollutant field.
 */
export function buildHourlyBaseline(historicalPayload) {
    const times = historicalPayload?.hourly?.time || [];
    /** @type {Record<number, Record<string, HourStat|null>>} */
    const baseline = {};
    for (let hour = 0; hour < 24; hour++) baseline[hour] = {};

    POLLUTANT_FIELDS.forEach((field) => {
        const series = historicalPayload?.hourly?.[field] || [];
        const byHour = Array.from({ length: 24 }, () => []);

        times.forEach((t, i) => {
            const value = series[i];
            if (typeof value !== 'number' || !Number.isFinite(value)) return;
            const hour = new Date(t).getHours();
            byHour[hour].push(value);
        });

        byHour.forEach((values, hour) => {
            if (values.length === 0) {
                baseline[hour][field] = null;
                return;
            }
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
            baseline[hour][field] = {
                mean: Math.round(mean * 10) / 10,
                stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
                sampleSize: values.length,
            };
        });
    });

    return baseline;
}

/**
 * @typedef {Object} Anomaly
 * @property {string} field - Pollutant key, e.g. 'pm2_5'.
 * @property {string} label - Display label, e.g. 'PM2.5'.
 * @property {number} current - The live reading.
 * @property {number} baselineMean - The hour-of-day historical mean.
 * @property {number} percentAbove - How far above the mean, as a whole-number percent.
 * @property {number} zScore - Standard deviations above the mean.
 */

/**
 * Compares live readings against their hour-of-day baseline and flags an
 * anomaly only when the reading is BOTH a large relative jump (percent) AND
 * statistically unusual (z-score) — so ordinary day-to-day variance on a
 * small sample doesn't trip a warning.
 *
 * @param {Record<string, number|null|undefined>} current - e.g. { pm2_5, pm10, us_aqi, ... }
 * @param {Record<number, Record<string, HourStat|null>>} baseline
 * @param {number} [hour] - Hour of day to compare against; defaults to now.
 * @param {number} [zThreshold] - Minimum z-score to flag. Default 2 (~top 2.5% of a normal distribution).
 * @param {number} [percentThreshold] - Minimum % above the mean to flag. Default 40.
 * @returns {Anomaly[]} Sorted by severity (largest percent jump first).
 */
export function detectAnomalies(current, baseline, hour = new Date().getHours(), zThreshold = 2, percentThreshold = 40) {
    const hourBaseline = baseline?.[hour] || {};
    /** @type {Anomaly[]} */
    const anomalies = [];

    POLLUTANT_FIELDS.forEach((field) => {
        const value = current?.[field];
        const stats = hourBaseline[field];
        // A handful of historical samples isn't enough to call anything "normal" yet.
        if (typeof value !== 'number' || !stats || stats.mean <= 0 || stats.sampleSize < 5) return;

        const percentAbove = ((value - stats.mean) / stats.mean) * 100;
        const zScore = stats.stdDev > 0 ? (value - stats.mean) / stats.stdDev : 0;

        if (percentAbove >= percentThreshold && zScore >= zThreshold) {
            anomalies.push({
                field,
                label: FIELD_LABELS[field] || field,
                current: value,
                baselineMean: stats.mean,
                percentAbove: Math.round(percentAbove),
                zScore: Math.round(zScore * 10) / 10,
            });
        }
    });

    return anomalies.sort((a, b) => b.percentAbove - a.percentAbove);
}