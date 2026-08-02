import { useEffect, useMemo, useRef, useState } from "react";
import { SAFE_LIMITS } from "../constants/cities";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet";

const HISTORY_KEY = "aqi-alert-history";
const MAX_HISTORY = 50;
const HAZARDOUS_AQI_THRESHOLD = 200;
const PUSH_ALERTS_KEY = "push-alerts-enabled";
const PUSH_ALERTS_FLAG = "enabled";

/** @param {any} current */
function buildWarnings(current) {
  const warnings = [];
  if (current.pm2_5 > SAFE_LIMITS.pm2_5)
    warnings.push(
      "PM2.5 is high. Wear a certified mask and avoid heavy outdoor exercise.",
    );
  if (current.pm10 > SAFE_LIMITS.pm10)
    warnings.push(
      "PM10 is elevated. Keep windows closed during peak traffic hours.",
    );
  if (current.nitrogen_dioxide > SAFE_LIMITS.nitrogen_dioxide)
    warnings.push(
      "NO2 levels are unsafe. Reduce roadside exposure if possible.",
    );
  if (current.ozone > SAFE_LIMITS.ozone)
    warnings.push(
      "Ozone levels are high. Limit outdoor activity during peak sunlight hours.",
    );
  if (current.us_aqi > 120)
    warnings.push(
      "AQI suggests unhealthy conditions. Avoid outdoor activities today.",
    );
  return warnings;
}

/** @param {any} params */
export default function AlertsPanel({
  cityName,
  current,
  confidenceScore,
  exposureEstimate,
}) {
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "denied",
  );

  const [alertHistory, setAlertHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (_e) {
      return [];
    }
  });

  // Persist alert toggle state via the existing useLocalStorageSet hook.
  // The set contains PUSH_ALERTS_FLAG ('enabled') when alerts are on.
  const { has: hasAlertFlag, toggle: toggleAlertFlag } =
    useLocalStorageSet(PUSH_ALERTS_KEY);
  const alertsEnabled = hasAlertFlag(PUSH_ALERTS_FLAG);

  // Separate ref for history deduplication — does not affect notification behavior
  const lastHistorySignature = useRef("");

  // Keep every hook call unconditional (Rules of Hooks). Guard `current` inside
  // the hooks and bail out before rendering the JSX further down.
  const warnings = useMemo(() => (current ? buildWarnings(current) : []), [current]);
  const lastNotified = useRef("");

  useEffect(() => {
    if (!("Notification" in window)) return;

    if (!warnings.length) {
      lastNotified.current = "";
      return;
    }

    const signature = `${cityName}:${warnings.join("|")}`;
    if (lastNotified.current === signature) return;

    // Append to history only when the warning set is new
    if (lastHistorySignature.current !== signature) {
      lastHistorySignature.current = signature;
      const timestamp = new Date().toLocaleString();
      const newEntries = warnings.map((w) => ({
        timestamp,
        city: cityName,
        aqi: current.us_aqi,
        warning: w,
      }));
      setAlertHistory((prev) => {
        const updated = [...newEntries, ...prev].slice(0, MAX_HISTORY);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch (_e) {
          // Quota exceeded — skip persist
        }
        return updated;
      });
    }

    // Browser push notification: only fire when permission is granted,
    // alerts are enabled by the user, and AQI exceeds the hazardous threshold.
    // Deduplication is enforced via lastNotified ref (same signature = no repeat).
    if (
      permission === "granted" &&
      alertsEnabled &&
      current.us_aqi > HAZARDOUS_AQI_THRESHOLD
    ) {
      new Notification("⚠️ Hazardous Pollution Alert", {
        body: `${cityName}: AQI ${current.us_aqi} — ${warnings[0]}`,
      });
      lastNotified.current = signature;
    }
  }, [warnings, cityName, current?.us_aqi, permission, alertsEnabled]);

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then((newPermission) => {
      setPermission(newPermission);
    });
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (_e) {
      // ignore
    }
    setAlertHistory([]);
  };

  if (!current) return null;

  return (
    <section data-testid="alerts-panel" className="panel">
      <div className="panel-head">
        <h2>Alerts &amp; Notifications</h2>
        <p>Health warnings based on safe pollutant thresholds</p>
      </div>

      {permission === "default" && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "var(--card-bg, #f8fafc)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color, #e2e8f0)",
          }}
        >
          <button
            type="button"
            onClick={requestNotificationPermission}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontWeight: "500",
            }}
          >
            Enable Desktop Notifications
          </button>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary, #64748b)",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            Enable notifications to receive real-time pollution alerts.
          </p>
        </div>
      )}

      {/* Pollution alerts toggle — only shown when notification permission is granted */}
      {permission === "granted" && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--card-bg, #f8fafc)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div>
            <strong style={{ fontSize: "0.9rem" }}>
              Hazardous Pollution Alerts
            </strong>
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary, #64748b)",
              }}
            >
              Receive a browser notification when AQI exceeds{" "}
              {HAZARDOUS_AQI_THRESHOLD} (hazardous level)
            </span>
          </div>

          <button
            type="button"
            className={`alerts-toggle-inline ${alertsEnabled ? "on" : ""}`}
            onClick={() => toggleAlertFlag(PUSH_ALERTS_FLAG)}
            aria-label="Toggle Hazardous Pollution Alerts"
          >
            <span className="toggle-thumb">
              <svg viewBox="0 0 24 24" className="bell-icon">
                <path
                  fill="currentColor"
                  d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                />
              </svg>
            </span>
          </button>
        </div>
      )}

      {permission === "denied" && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "var(--card-bg, #f8fafc)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color, #fecaca)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "#dc2626",
              fontWeight: "500",
            }}
          >
            Notifications are blocked
          </p>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary, #64748b)",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            You've blocked notifications for this site. To receive pollution
            alerts, enable them manually in your browser settings (click the
            lock/info icon next to the address bar → Notifications → Allow).
          </p>
        </div>
      )}

      {exposureEstimate && (
        <div className="exposure-card">
          <h3>Exposure Timer</h3>

          <p className="exposure-message">{exposureEstimate.message}</p>

          <small className="exposure-note">
            Estimated from recent AQI trends.
          </small>
        </div>
      )}

      {warnings.length ? (
        <>
          {confidenceScore === "Low" && (
            <p className="low-confidence-note">
              Warnings based on low-confidence data
            </p>
          )}
          <ul className="warnings">
            {warnings.map((warning) => (
              <li data-testid="alert-item" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="safe-note">
          Air quality is within safer limits right now. Keep monitoring for
          changes.
        </p>
      )}

      <div className="alert-history">
        <div className="alert-history-head">
          <h3>Alert History</h3>
          {alertHistory.length > 0 && (
            <button
              type="button"
              className="alert-history-clear"
              onClick={handleClearHistory}
            >
              Clear History
            </button>
          )}
        </div>
        {alertHistory.length === 0 ? (
          <p className="alert-history-empty">No alert history yet.</p>
        ) : (
          <ul className="alert-history-list">
            {alertHistory.map((entry, i) => (
              <li key={i} className="alert-history-item">
                <span className="alert-history-meta">
                  {entry.timestamp} · {entry.city} · AQI {entry.aqi}
                </span>
                <span className="alert-history-warning">{entry.warning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
