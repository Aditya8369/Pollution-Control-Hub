import { useState } from 'react';
import { parseThreshold } from '../hooks/useNotificationSettings';

const POLLUTANT_FIELDS = [
    { key: 'pm2_5', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'nitrogen_dioxide', label: 'NO₂' },
    { key: 'ozone', label: 'Ozone' },
    { key: 'carbon_monoxide', label: 'CO' },
];

const INVALID_THRESHOLD_MESSAGE = 'Enter a number of 0 or more.';

/**
 * Validates every threshold on the form and reports the parsed values alongside a map of
 * field -> message for whatever failed. Saving used to run each field through a bare
 * `Number()`, so an empty box became 0 (alert on everything) and a half-typed value became
 * NaN (alert on nothing) — both stored without a word to the visitor.
 *
 * @returns {{ values: { aqiThreshold: number, pollutantThresholds: Record<string, number> }, errors: Record<string, string> }}
 */
function validate(aqiThreshold, pollutantThresholds) {
    const errors = {};
    const parsedAqi = parseThreshold(aqiThreshold);
    if (parsedAqi === null) errors.aqiThreshold = INVALID_THRESHOLD_MESSAGE;

    const parsedPollutants = {};
    for (const { key } of POLLUTANT_FIELDS) {
        const parsed = parseThreshold(pollutantThresholds[key]);
        if (parsed === null) errors[key] = INVALID_THRESHOLD_MESSAGE;
        else parsedPollutants[key] = parsed;
    }

    return {
        values: { aqiThreshold: parsedAqi, pollutantThresholds: parsedPollutants },
        errors,
    };
}

/** @param {any} params */
export default function NotificationSettings({ settings, onUpdate, onClose }) {
    const [aqiThreshold, setAqiThreshold] = useState(settings.aqiThreshold);
    const [pollutantThresholds, setPollutantThresholds] = useState(settings.pollutantThresholds);
    const [quietHoursEnabled, setQuietHoursEnabled] = useState(settings.quietHours.enabled);
    const [quietStart, setQuietStart] = useState(settings.quietHours.start);
    const [quietEnd, setQuietEnd] = useState(settings.quietHours.end);
    const [errors, setErrors] = useState({});

    const handleSave = () => {
        const { values, errors: nextErrors } = validate(aqiThreshold, pollutantThresholds);

        // Nothing is persisted and the panel stays open, so the offending field is still
        // on screen next to its message.
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        onUpdate({
            aqiThreshold: values.aqiThreshold,
            pollutantThresholds: values.pollutantThresholds,
            quietHours: { enabled: quietHoursEnabled, start: quietStart, end: quietEnd },
        });
        onClose();
    };

    const clearError = (key) =>
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });

    return (
        <div
            data-testid="notification-settings-panel"
            className="notif-settings-panel"
        >
            {/* Header: title + close */}
            <div className="notif-settings-header">
                <span className="notif-settings-title">Notification Settings</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close notification settings"
                    className="notif-settings-close"
                >
                    ✕
                </button>
            </div>

            {/* AQI threshold */}
            <div className="notif-settings-section">
                <span className="notif-section-label">AQI Threshold</span>
                <label className="notif-aqi-row" htmlFor="notif-aqi-threshold">
                    Alert me when AQI &gt;
                    <input
                        id="notif-aqi-threshold"
                        type="number"
                        min="0"
                        data-testid="aqi-threshold-input"
                        value={aqiThreshold}
                        onChange={(e) => {
                            setAqiThreshold(e.target.value);
                            clearError('aqiThreshold');
                        }}
                        aria-invalid={Boolean(errors.aqiThreshold)}
                        aria-describedby={errors.aqiThreshold ? 'notif-aqi-threshold-error' : undefined}
                        className="notif-input"
                    />
                </label>
                {errors.aqiThreshold && (
                    <p
                        id="notif-aqi-threshold-error"
                        role="alert"
                        data-testid="aqi-threshold-error"
                        className="notif-field-error"
                    >
                        {errors.aqiThreshold}
                    </p>
                )}
            </div>

            {/* Per-pollutant thresholds */}
            <div className="notif-settings-section">
                <span className="notif-section-label">Per-Pollutant Thresholds</span>
                <div className="notif-pollutant-rows">
                    {POLLUTANT_FIELDS.map(({ key, label }) => (
                        <div key={key}>
                            <label
                                className="notif-pollutant-row"
                                htmlFor={`notif-threshold-${key}`}
                            >
                                <span className="notif-pollutant-name">{label}</span>
                                <input
                                    id={`notif-threshold-${key}`}
                                    type="number"
                                    min="0"
                                    data-testid={`pollutant-threshold-${key}`}
                                    value={pollutantThresholds[key]}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setPollutantThresholds((prev) => ({ ...prev, [key]: value }));
                                        clearError(key);
                                    }}
                                    aria-invalid={Boolean(errors[key])}
                                    aria-describedby={errors[key] ? `notif-threshold-${key}-error` : undefined}
                                    className="notif-input"
                                />
                            </label>
                            {errors[key] && (
                                <p
                                    id={`notif-threshold-${key}-error`}
                                    role="alert"
                                    data-testid={`pollutant-threshold-${key}-error`}
                                    className="notif-field-error"
                                >
                                    {errors[key]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quiet Hours */}
            <div className="notif-settings-section">
                <span className="notif-section-label">Quiet Hours</span>
                <label className="notif-quiet-label">
                    <input
                        type="checkbox"
                        data-testid="quiet-hours-enabled"
                        checked={quietHoursEnabled}
                        onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                    />
                    Enable quiet hours
                </label>
                {quietHoursEnabled && (
                    <div className="notif-quiet-times">
                        <label className="notif-time-label" htmlFor="notif-quiet-start">
                            From
                            <input
                                id="notif-quiet-start"
                                type="time"
                                data-testid="quiet-hours-start"
                                value={quietStart}
                                onChange={(e) => setQuietStart(e.target.value)}
                                className="notif-time-input"
                            />
                        </label>
                        <label className="notif-time-label" htmlFor="notif-quiet-end">
                            To
                            <input
                                id="notif-quiet-end"
                                type="time"
                                data-testid="quiet-hours-end"
                                value={quietEnd}
                                onChange={(e) => setQuietEnd(e.target.value)}
                                className="notif-time-input"
                            />
                        </label>
                    </div>
                )}
            </div>

            {/* Save */}
            <button
                type="button"
                data-testid="save-notification-settings"
                onClick={handleSave}
                className="notif-save-btn"
            >
                Save Settings
            </button>
        </div>
    );
}
