import { useState } from 'react';

const POLLUTANT_FIELDS = [
    { key: 'pm2_5', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'nitrogen_dioxide', label: 'NO₂' },
    { key: 'ozone', label: 'Ozone' },
    { key: 'carbon_monoxide', label: 'CO' },
];

/** @param {any} params */
export default function NotificationSettings({ settings, onUpdate, onClose }) {
    const [aqiThreshold, setAqiThreshold] = useState(settings.aqiThreshold);
    const [pollutantThresholds, setPollutantThresholds] = useState(settings.pollutantThresholds);
    const [quietHoursEnabled, setQuietHoursEnabled] = useState(settings.quietHours.enabled);
    const [quietStart, setQuietStart] = useState(settings.quietHours.start);
    const [quietEnd, setQuietEnd] = useState(settings.quietHours.end);

    const handleSave = () => {
        onUpdate({
            aqiThreshold: Number(aqiThreshold),
            pollutantThresholds: Object.fromEntries(
                Object.entries(pollutantThresholds).map(([k, v]) => [k, Number(v)])
            ),
            quietHours: { enabled: quietHoursEnabled, start: quietStart, end: quietEnd },
        });
        onClose();
    };

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
                <label className="notif-aqi-row">
                    Alert me when AQI &gt;
                    <input
                        type="number"
                        data-testid="aqi-threshold-input"
                        value={aqiThreshold}
                        onChange={(e) => setAqiThreshold(e.target.value)}
                        className="notif-input"
                    />
                </label>
            </div>

            {/* Per-pollutant thresholds */}
            <div className="notif-settings-section">
                <span className="notif-section-label">Per-Pollutant Thresholds</span>
                <div className="notif-pollutant-rows">
                    {POLLUTANT_FIELDS.map(({ key, label }) => (
                        <label
                            key={key}
                            className="notif-pollutant-row"
                        >
                            <span className="notif-pollutant-name">{label}</span>
                            <input
                                type="number"
                                data-testid={`pollutant-threshold-${key}`}
                                value={pollutantThresholds[key]}
                                onChange={(e) =>
                                    setPollutantThresholds((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="notif-input"
                            />
                        </label>
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
                        <label className="notif-time-label">
                            From
                            <input
                                type="time"
                                data-testid="quiet-hours-start"
                                value={quietStart}
                                onChange={(e) => setQuietStart(e.target.value)}
                                className="notif-time-input"
                            />
                        </label>
                        <label className="notif-time-label">
                            To
                            <input
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