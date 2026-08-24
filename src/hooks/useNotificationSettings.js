import { useState, useCallback } from 'react';

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

export const DEFAULT_NOTIFICATION_SETTINGS = {
    alertsEnabled: true,
    aqiThreshold: 200,
    pollutantThresholds: {
        pm2_5: 15,
        pm10: 45,
        nitrogen_dioxide: 25,
        ozone: 100,
        carbon_monoxide: 4000,
    },
    activePollutants: ['pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone', 'carbon_monoxide'],
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * A threshold is only usable if it is a finite, non-negative number. `Number('')` is 0 —
 * which alerts on everything — and `Number('abc')` is NaN, which makes every `x > NaN`
 * comparison false and silently switches that pollutant off. Both are rejected here so
 * neither the settings form nor a hand-edited localStorage entry can produce one.
 *
 * @param {unknown} raw
 * @returns {number | null} the parsed threshold, or null if it is not usable
 */
export function parseThreshold(raw) {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) && raw >= 0 ? raw : null;
    }
    if (typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    if (trimmed === '') return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Falls back to the default for any threshold that does not survive parseThreshold. */
function sanitiseThresholds(raw, defaults) {
    const result = { ...defaults };
    if (!raw || typeof raw !== 'object') return result;

    for (const key of Object.keys(defaults)) {
        const parsed = parseThreshold(raw[key]);
        if (parsed !== null) result[key] = parsed;
    }
    return result;
}

function sanitiseQuietHours(raw) {
    const defaults = DEFAULT_NOTIFICATION_SETTINGS.quietHours;
    if (!raw || typeof raw !== 'object') return { ...defaults };

    return {
        enabled: raw.enabled === true,
        start: TIME_PATTERN.test(raw.start) ? raw.start : defaults.start,
        end: TIME_PATTERN.test(raw.end) ? raw.end : defaults.end,
    };
}

/**
 * Normalises an arbitrary object into a complete, usable settings object.
 * Exported so the settings form and the storage reader agree on what is valid.
 *
 * @param {unknown} raw
 * @returns {typeof DEFAULT_NOTIFICATION_SETTINGS}
 */
export function sanitiseSettings(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS };

    const aqiThreshold = parseThreshold(raw.aqiThreshold);
    
    // Ensure activePollutants is an array of strings that exist in the defaults
    let activePollutants = DEFAULT_NOTIFICATION_SETTINGS.activePollutants;
    if (Array.isArray(raw.activePollutants)) {
        const validKeys = Object.keys(DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds);
        activePollutants = raw.activePollutants.filter(p => validKeys.includes(p));
    }

    return {
        alertsEnabled: raw.alertsEnabled !== false, // Default true
        aqiThreshold: aqiThreshold === null ? DEFAULT_NOTIFICATION_SETTINGS.aqiThreshold : aqiThreshold,
        pollutantThresholds: sanitiseThresholds(
            raw.pollutantThresholds,
            DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds
        ),
        activePollutants,
        quietHours: sanitiseQuietHours(raw.quietHours),
    };
}

function readSettings() {
    try {
        const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
        return sanitiseSettings(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
}

/**
 * Manages custom notification settings (AQI threshold, per-pollutant thresholds,
 * quiet hours) persisted to localStorage under NOTIFICATION_SETTINGS_KEY.
 *
 * @returns {{
 *   settings: typeof DEFAULT_NOTIFICATION_SETTINGS,
 *   updateSettings: (next: object) => void,
 *   isWithinQuietHours: () => boolean
 * }}
 */
export function useNotificationSettings() {
    const [settings, setSettings] = useState(() => readSettings());

    const updateSettings = useCallback((next) => {
        setSettings((prev) => {
            const merged = sanitiseSettings({
                ...prev,
                ...next,
                pollutantThresholds: {
                    ...prev.pollutantThresholds,
                    ...(next?.pollutantThresholds || {}),
                },
                quietHours: {
                    ...prev.quietHours,
                    ...(next?.quietHours || {}),
                },
            });
            try {
                localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(merged));
            } catch {
                // Quota exceeded or private browsing — keep the change for this session
            }
            return merged;
        });
    }, []);

    const isWithinQuietHours = useCallback(() => {
        const { enabled, start, end } = settings.quietHours;
        if (!enabled) return false;
        const now = new Date();
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (startMinutes === endMinutes) return false;
        if (startMinutes < endMinutes) {
            return nowMinutes >= startMinutes && nowMinutes < endMinutes;
        }
        // Window wraps past midnight (e.g. 22:00 -> 07:00)
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }, [settings.quietHours]);

    return { settings, updateSettings, isWithinQuietHours };
}
