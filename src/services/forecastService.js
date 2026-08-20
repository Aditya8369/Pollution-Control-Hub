import { getAQIBand, resolveCurrentIndex } from './airQualityService';

/**
 * The 24-72 hour AQI forecast.
 *
 * The previous version of this file fetched `/api/forecast?location=...` and, on any
 * failure, returned this:
 *
 *     { predictions: [
 *         { time: "Now",           aqi: 120, lower: 115, upper: 125, hazardous: false },
 *         { time: "Tomorrow 5 PM", aqi: 178, lower: 162, upper: 194, hazardous: true  },
 *     ] }
 *
 * Three problems, in ascending order of seriousness. The fallback was shaped
 * identically to a real response, so nothing downstream could tell them apart.
 * `/api/forecast` does not exist — this is a static Vite build with no server — so the
 * `try` branch could never succeed and the fabricated branch was not a fallback, it was
 * the implementation. And the invented numbers were not neutral: 178 is "Unhealthy" on
 * the US EPA scale, and `hazardous: true` drove a red band across the chart. The question
 * this app exists to answer is whether it is safe to go outside; a hardcoded "Unhealthy
 * tomorrow" is worse than no forecast at all.
 *
 * This version asks Open-Meteo, the same source `airQualityService` already uses, and
 * throws when it cannot answer. Nothing here invents a reading. See #544, #546, #499 for
 * the same defect in the route planner, the completeness score and the city comparisons.
 */

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Open-Meteo's air-quality forecast horizon. Asking for more returns fewer days, silently. */
export const MAX_FORECAST_DAYS = 3;

/** Above this the hour is called out as hazardous. The EPA "Unhealthy for Sensitive Groups" floor. */
export const HAZARDOUS_AQI = 100;

/**
 * Open-Meteo publishes a single deterministic value per hour, with no interval. Inventing
 * a tight one around it — as the old fallback did, ±5 at "Now" — states a confidence
 * nobody measured. This widens with the forecast horizon instead, which is the one thing
 * that is genuinely known about forecast error, and is labelled as an illustration of
 * uncertainty rather than a published range.
 *
 * @param {number} aqi - The forecast index value.
 * @param {number} hoursAhead - How far ahead this hour is.
 * @returns {{lower: number, upper: number}}
 */
export function uncertaintyBand(aqi, hoursAhead) {
  // Roughly 8% at 24h, 16% at 48h, 24% at 72h, floored so a low-AQI hour still shows a
  // visible band rather than a hairline.
  const fraction = 0.08 * Math.max(1, Math.ceil(hoursAhead / 24));
  const spread = Math.max(5, Math.round(aqi * fraction));

  return { lower: Math.max(0, aqi - spread), upper: aqi + spread };
}

/**
 * Formats an hour for the chart's x-axis, relative to the first forecast hour.
 *
 * Built from the offset rather than from `Date` formatting so it stays in the location's
 * local time — the timestamps come back with `timezone=auto`, and re-parsing them into
 * the *viewer's* zone is how "current" ended up a day out in #545.
 *
 * @param {string} timestamp - "YYYY-MM-DDTHH:mm" as Open-Meteo returns it.
 * @param {number} hoursAhead - Hours from now.
 * @returns {string}
 */
export function formatForecastHour(timestamp, hoursAhead) {
  if (hoursAhead <= 0) return 'Now';

  // `Number('')` is 0, not NaN, so a timestamp too short to carry an hour would read as
  // midnight rather than as unparseable. Match the two digits explicitly.
  const digits = /^\d{4}-\d{2}-\d{2}T(\d{2})/.exec(String(timestamp));
  const hour = digits ? Number(digits[1]) : NaN;
  if (!Number.isFinite(hour) || hour > 23) return `+${hoursAhead}h`;

  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;

  // Which calendar day this hour lands on, counted from the first forecast hour. Derived
  // from the hour-of-day rather than by differencing dates, so it does not depend on
  // parsing the timestamp in the right zone — the responses come back with
  // `timezone=auto`, and re-parsing them into the *viewer's* zone is how "current" ended
  // up a day out in #545.
  const startHour = (((hour - hoursAhead) % 24) + 24) % 24;
  const dayOffset = Math.floor((startHour + hoursAhead) / 24);

  if (dayOffset === 0) return `${twelve}${suffix}`;
  if (dayOffset === 1) return `Tomorrow ${twelve}${suffix}`;
  return `In ${dayOffset} days, ${twelve}${suffix}`;
}

/**
 * Turns an Open-Meteo hourly block into chart-ready predictions.
 *
 * Exported so the mapping can be tested without a network round trip, and so a caller
 * holding an already-fetched response does not have to fetch it twice.
 *
 * @param {{time?: string[], us_aqi?: (number|null)[]}} hourly
 * @param {number} [utcOffsetSeconds=0]
 * @returns {Array<{time: string, timestamp: string, aqi: number, lower: number, upper: number, hazardous: boolean, band: string}>}
 */
export function buildPredictions(hourly, utcOffsetSeconds = 0) {
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const values = Array.isArray(hourly?.us_aqi) ? hourly.us_aqi : [];
  if (times.length === 0) return [];

  const { index: startIndex } = resolveCurrentIndex(times, utcOffsetSeconds);
  const from = startIndex === -1 ? 0 : startIndex;

  const predictions = [];
  for (let i = from; i < times.length; i += 1) {
    const aqi = values[i];
    // An hour Open-Meteo could not model comes back as null. Skipping it leaves a gap in
    // the line, which is honest; plotting it as 0 would draw a dip into "Good" (#546).
    if (typeof aqi !== 'number' || !Number.isFinite(aqi)) continue;

    const hoursAhead = i - from;
    const rounded = Math.round(aqi);

    predictions.push({
      time: formatForecastHour(times[i], hoursAhead),
      timestamp: times[i],
      aqi: rounded,
      ...uncertaintyBand(rounded, hoursAhead),
      hazardous: rounded > HAZARDOUS_AQI,
      band: getAQIBand(rounded).label,
    });
  }

  return predictions;
}

/**
 * Fetches the hourly AQI forecast for a location.
 *
 * Throws rather than returning a placeholder. A forecast the service could not produce
 * has to reach the UI as an absence, so the UI can say so — see `AQIForecastChart`.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {{days?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<{predictions: Array<object>, source: string, horizonHours: number, fetchedAt: number}>}
 * @throws {Error} On a non-200 response, a malformed payload, or no usable hours.
 */
export async function fetchAQIForecast(lat, lon, options = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('A forecast needs a latitude and a longitude.');
  }

  const days = Math.min(Math.max(1, options.days ?? MAX_FORECAST_DAYS), MAX_FORECAST_DAYS);
  const url =
    `${BASE_URL}?latitude=${lat}&longitude=${lon}` +
    `&hourly=us_aqi&timezone=auto&forecast_days=${days}`;

  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Forecast request failed: ${response.status}`);
  }

  const data = await response.json();
  const predictions = buildPredictions(data?.hourly, data?.utc_offset_seconds ?? 0);

  if (predictions.length === 0) {
    // A 200 carrying nothing usable is a failure, not an empty forecast. Returning
    // `{ predictions: [] }` here would render as a blank chart with no explanation.
    throw new Error('The forecast response contained no usable hours.');
  }

  return {
    predictions,
    source: 'open-meteo',
    horizonHours: predictions.length - 1,
    fetchedAt: Date.now(),
  };
}
