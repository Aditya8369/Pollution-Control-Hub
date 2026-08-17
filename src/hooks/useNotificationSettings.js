import { useState, useCallback } from 'react';

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

export const DEFAULT_NOTIFICATION_SETTINGS = {
    aqiThreshold: 200,
    pollutantThresholds: {
        pm2_5: 15,
        pm10: 45,
        nitrogen_dioxide: 25,
        ozone: 100,
        carbon_monoxide: 4000,
    },
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
};

function readSettings() {
    try {
        const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...parsed,
            pollutantThresholds: {
                ...DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds,
                ...(parsed.pollutantThresholds || {}),
            },
            quietHours: {
                ...DEFAULT_NOTIFICATION_SETTINGS.quietHours,
                ...(parsed.quietHours || {}),
            },
        };
    } catch {
        return DEFAULT_NOTIFICATION_SETTINGS;
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
            const merged = {
                ...prev,
                ...next,
                pollutantThresholds: {
                    ...prev.pollutantThresholds,
                    ...(next.pollutantThresholds || {}),
                },
                quietHours: {
                    ...prev.quietHours,
                    ...(next.quietHours || {}),
                },
            };
            try {
                localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(merged));
            } catch (_e) {
                // Quota exceeded — skip persist
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