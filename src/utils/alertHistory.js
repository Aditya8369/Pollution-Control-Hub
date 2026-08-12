import { SAFE_LIMITS } from '../constants/cities';

/**
 * The alert log AlertsPanel keeps, and the rules for what goes into it.
 *
 * Pulled out of the component because none of it needs React: which warnings a reading
 * produces, and whether a warning set has already been logged, are both decidable from
 * their inputs. Keeping them here means they can be tested without rendering, the way
 * contributionStats and checkInStreak are.
 */

export const ALERT_HISTORY_KEY = 'aqi-alert-history';

/** How many rows are kept. Oldest are dropped first. */
export const MAX_HISTORY = 50;

/** AQI above which a browser notification is sent, when the visitor has opted in. */
export const HAZARDOUS_AQI_THRESHOLD = 200;

/**
 * How long the same warning set stays "already logged".
 *
 * The de-duplication key used to live in a `useRef`, which is per-mount: every reload
 * looked like a brand new alert, so a single bad-air afternoon in Delhi wrote five rows
 * per page load until the log was nothing but copies of one moment. Switching city away
 * and back did it too.
 *
 * An hour is long enough to absorb reloads, re-renders and city switching, and short
 * enough that conditions still being bad tomorrow morning is recorded as the separate
 * event it is.
 */
export const RECORD_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * The health warnings a reading produces.
 *
 * @param {any} current - Current pollutant readings.
 * @returns {string[]}
 */
export function buildWarnings(current) {
  if (!current) return [];

  const warnings = [];
  if (current.pm2_5 > SAFE_LIMITS.pm2_5)
    warnings.push('PM2.5 is high. Wear a certified mask and avoid heavy outdoor exercise.');
  if (current.pm10 > SAFE_LIMITS.pm10)
    warnings.push('PM10 is elevated. Keep windows closed during peak traffic hours.');
  if (current.nitrogen_dioxide > SAFE_LIMITS.nitrogen_dioxide)
    warnings.push('NO2 levels are unsafe. Reduce roadside exposure if possible.');
  if (current.ozone > SAFE_LIMITS.ozone)
    warnings.push('Ozone levels are high. Limit outdoor activity during peak sunlight hours.');
  if (current.us_aqi > 120)
    warnings.push('AQI suggests unhealthy conditions. Avoid outdoor activities today.');
  return warnings;
}

/**
 * Identifies a warning set, so the same one is recognisable across mounts.
 *
 * @param {string} cityName
 * @param {string[]} warnings
 * @returns {string}
 */
export function alertSignature(cityName, warnings) {
  return `${cityName}:${warnings.join('|')}`;
}

/** @returns {any[]} The stored log, or an empty one if it is missing or unreadable. */
export function readAlertHistory() {
  try {
    const raw = localStorage.getItem(ALERT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {any[]} entries
 * @returns {boolean} Whether the write landed.
 */
export function writeAlertHistory(entries) {
  try {
    localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(entries));
    return true;
  } catch {
    // Quota exceeded. The log is a convenience; losing a write must not break alerts.
    return false;
  }
}

/** Clears the stored log. */
export function clearAlertHistory() {
  try {
    localStorage.removeItem(ALERT_HISTORY_KEY);
  } catch {
    // Nothing useful to do — the in-memory list is cleared by the caller regardless.
  }
}

/**
 * Whether this warning set has already been logged recently enough to skip.
 *
 * @param {any[]} history
 * @param {string} signature
 * @param {number} now - Epoch ms.
 * @returns {boolean}
 */
export function isAlreadyRecorded(history, signature, now) {
  return history.some((entry) => {
    if (!entry || entry.signature !== signature) return false;
    const at = Date.parse(entry.at);
    if (Number.isNaN(at)) return false;
    return now - at < RECORD_COOLDOWN_MS;
  });
}

/**
 * Adds a warning set to the log, unless it is already there.
 *
 * Returns a new list rather than mutating, and reports whether anything changed, so the
 * caller can skip both the write and the re-render when nothing did.
 *
 * @param {any[]} history - The existing log, newest first.
 * @param {{cityName: string, aqi: any, warnings: string[], now?: number}} alert
 * @returns {{history: any[], changed: boolean}}
 */
export function recordAlerts(history, { cityName, aqi, warnings, now = Date.now() }) {
  const existing = Array.isArray(history) ? history : [];

  if (!warnings || warnings.length === 0) {
    return { history: existing, changed: false };
  }

  const signature = alertSignature(cityName, warnings);
  if (isAlreadyRecorded(existing, signature, now)) {
    return { history: existing, changed: false };
  }

  // Stored as an ISO string and formatted at render. The old entries kept
  // `new Date().toLocaleString()`, a locale- and timezone-specific display string, which
  // could not be compared, sorted, or de-duplicated on — and rendered in whatever locale
  // the visitor happened to have when it was written.
  const at = new Date(now).toISOString();

  const entries = warnings.map((warning, index) => ({
    id: `${now}-${index}`,
    at,
    signature,
    city: cityName,
    aqi: typeof aqi === 'number' && Number.isFinite(aqi) ? aqi : null,
    warning,
  }));

  return { history: [...entries, ...existing].slice(0, MAX_HISTORY), changed: true };
}

/**
 * Renders a stored timestamp.
 *
 * Entries written before this change hold a pre-formatted locale string rather than an
 * ISO one. Those are passed through as they are, so an upgrade does not blank out the
 * existing log.
 *
 * @param {any} entry
 * @returns {string}
 */
export function formatAlertTimestamp(entry) {
  if (!entry) return '';

  if (typeof entry.at === 'string') {
    const parsed = Date.parse(entry.at);
    if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
  }

  return typeof entry.timestamp === 'string' ? entry.timestamp : '';
}

/**
 * A stable React key for a log row.
 *
 * The list is prepended to, so an array index changed every row's key on every new
 * alert and re-rendered the whole log.
 *
 * @param {any} entry
 * @param {number} index
 * @returns {string}
 */
export function alertEntryKey(entry, index) {
  if (entry?.id) return String(entry.id);
  // Legacy rows have no id. City + warning + stored timestamp is unique enough for them.
  return `${entry?.timestamp ?? ''}-${entry?.city ?? ''}-${entry?.warning ?? ''}-${index}`;
}
