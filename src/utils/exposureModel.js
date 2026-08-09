/**
 * Personal exposure model.
 *
 * The calculator's job is to answer "how much pollution did I actually take in today,
 * compared with what is considered safe". That only works if both sides of the comparison
 * are in the same units. Previously the score was `hours × multiplier × AQI` while the
 * benchmark was the constant 360 — so the ratio scaled with AQI and an ordinary indoor
 * day at AQI 50 reported 214% of the safe limit.
 *
 * Everything here is expressed in **µg/m³·h** (concentration-hours): a concentration
 * breathed for a duration. The WHO 24-hour PM2.5 guideline of 15 µg/m³ sustained for a
 * full day is 15 × 24 = 360 µg/m³·h, which is where that number came from in the first
 * place — it was always a concentration-hours figure being compared against something else.
 */

/** WHO 2021 air quality guideline for PM2.5, 24-hour mean, in µg/m³. */
export const WHO_PM25_24H_GUIDELINE = 15;

/** The guideline sustained for a full day, in µg/m³·h. */
export const SAFE_DAILY_EXPOSURE = WHO_PM25_24H_GUIDELINE * 24;

/** Hours in the day a routine is expected to add up to. */
export const HOURS_IN_DAY = 24;

/**
 * US EPA PM2.5 breakpoints, as (concentration, index) pairs at each band boundary.
 *
 * Used in reverse here: the app knows the AQI and needs the concentration behind it.
 *
 * @type {{ cLow: number, cHigh: number, iLow: number, iHigh: number }[]}
 */
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

/**
 * Converts a US AQI value back to the PM2.5 concentration that produced it.
 *
 * The AQI is a piecewise-linear transform of concentration, so it inverts exactly by
 * interpolating within the band the index falls in. This is what lets the exposure score
 * be expressed in µg/m³ rather than in index points, which are not additive and have no
 * physical meaning when multiplied by hours.
 *
 * @param {number} aqi - US AQI (0–500).
 * @returns {number} PM2.5 concentration in µg/m³, rounded to one decimal.
 *
 * @example
 * aqiToPm25(50);  // 12   — top of the "Good" band
 * aqiToPm25(100); // 35.4 — top of "Moderate"
 */
export function aqiToPm25(aqi) {
  if (typeof aqi !== 'number' || !Number.isFinite(aqi) || aqi <= 0) return 0;

  const highest = PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1];
  if (aqi >= highest.iHigh) return highest.cHigh;

  for (const bp of PM25_BREAKPOINTS) {
    if (aqi >= bp.iLow && aqi <= bp.iHigh) {
      const indexSpan = bp.iHigh - bp.iLow;
      if (indexSpan === 0) return bp.cLow;
      const concentration =
        ((bp.cHigh - bp.cLow) / indexSpan) * (aqi - bp.iLow) + bp.cLow;
      return Math.round(concentration * 10) / 10;
    }
  }

  return 0;
}

/**
 * Activity types and how much harder each one makes you breathe.
 *
 * The multiplier combines two effects: how much of the outdoor concentration reaches you
 * (a purifier removes most of it; a traffic cabin concentrates it) and how much air you
 * move while doing it (jogging roughly triples resting ventilation).
 *
 * @type {{ id: string, label: string, multiplier: number, description: string }[]}
 */
export const ACTIVITIES = [
  {
    id: 'indoor_purified',
    label: '🏠 Indoors (with Air Purifier)',
    multiplier: 0.3,
    description: 'Lowest intake, filtered air',
  },
  {
    id: 'indoor_standard',
    label: '🏢 Indoors (Standard / Office / Home)',
    multiplier: 0.7,
    description: 'Moderate protection from ambient air',
  },
  {
    id: 'outdoor_walking',
    label: '🚶 Outdoor Walking / Light Activity',
    multiplier: 1.5,
    description: 'Higher respiration rate outdoors',
  },
  {
    id: 'commute_transit',
    label: '🚗 Traffic Commute (Car / Bus / Auto)',
    multiplier: 2.5,
    description: 'Direct exposure to vehicle exhaust spikes',
  },
  {
    id: 'outdoor_exercise',
    label: '🏃 Outdoor Exercise / Jogging / Cycling',
    multiplier: 3.5,
    description: 'Heavy breathing drastically increases particulate intake',
  },
];

/** @type {Record<string, any>} */
const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

/** The fallback used when a logged activity references an unknown type. */
export const DEFAULT_ACTIVITY = ACTIVITY_BY_ID.indoor_standard;

/**
 * Looks up an activity definition, falling back to standard indoors.
 *
 * @param {string} id
 * @returns {any}
 */
export function getActivity(id) {
  return ACTIVITY_BY_ID[id] || DEFAULT_ACTIVITY;
}

/**
 * Severity bands, expressed as a fraction of the WHO daily guideline.
 *
 * @param {number} ratio - exposure / SAFE_DAILY_EXPOSURE.
 * @returns {{ label: string, color: string, bg: string }}
 */
export function getSeverity(ratio) {
  if (ratio <= 1) {
    return { label: 'WITHIN GUIDELINE', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
  }
  if (ratio <= 2) {
    return { label: 'ABOVE GUIDELINE', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
  }
  if (ratio <= 4) {
    return { label: 'HIGH EXPOSURE', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
  }
  return { label: 'VERY HIGH EXPOSURE', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
}

/**
 * A single logged activity.
 * @typedef {Object} LoggedActivity
 * @property {number|string} id
 * @property {string} type - One of the {@link ACTIVITIES} ids.
 * @property {number} hours
 */

/**
 * Result of scoring a day's routine.
 * @typedef {Object} ExposureResult
 * @property {number} exposure - Total intake in µg/m³·h.
 * @property {number} ambientPm25 - The concentration the AQI corresponds to, µg/m³.
 * @property {number} totalHours - Hours logged.
 * @property {number} ratio - exposure / SAFE_DAILY_EXPOSURE.
 * @property {number} percentOfGuideline - The same ratio as a whole-number percentage.
 * @property {{label: string, color: string, bg: string}} severity
 * @property {{activity: any, hours: number, exposure: number}[]} breakdown
 * @property {'short'|'long'|null} dayCoverage - Set when the routine is not a full 24 h.
 */

/**
 * Scores a day's routine against the WHO 24-hour PM2.5 guideline.
 *
 * @param {LoggedActivity[]} activities - The logged routine.
 * @param {number} currentAqi - Ambient US AQI for the location.
 * @returns {ExposureResult}
 *
 * @example
 * // A normal indoor day in clean air comes out well under the guideline.
 * calculateExposure(
 *   [{ id: 1, type: 'indoor_standard', hours: 24 }],
 *   50
 * ).percentOfGuideline; // 56
 */
export function calculateExposure(activities, currentAqi) {
  const ambientPm25 = aqiToPm25(currentAqi);
  const list = Array.isArray(activities) ? activities : [];

  const breakdown = list.map((item) => {
    const activity = getActivity(item?.type);
    const hours = Number(item?.hours);
    const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
    return {
      activity,
      hours: safeHours,
      exposure: safeHours * activity.multiplier * ambientPm25,
    };
  });

  const exposure = breakdown.reduce((sum, entry) => sum + entry.exposure, 0);
  const totalHours = breakdown.reduce((sum, entry) => sum + entry.hours, 0);
  const ratio = exposure / SAFE_DAILY_EXPOSURE;

  // A routine that does not add up to a day makes the comparison against a 24-hour
  // guideline misleading in either direction, so the UI is told about it.
  let dayCoverage = null;
  if (totalHours > 0 && totalHours < HOURS_IN_DAY) dayCoverage = 'short';
  else if (totalHours > HOURS_IN_DAY) dayCoverage = 'long';

  return {
    exposure: Math.round(exposure),
    ambientPm25,
    totalHours: Math.round(totalHours * 10) / 10,
    ratio,
    percentOfGuideline: Math.round(ratio * 100),
    severity: getSeverity(ratio),
    breakdown,
    dayCoverage,
  };
}
