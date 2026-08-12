import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet";
import {
  HAZARDOUS_AQI_THRESHOLD,
  alertEntryKey,
  alertSignature,
  buildWarnings,
  clearAlertHistory,
  formatAlertTimestamp,
  readAlertHistory,
  recordAlerts,
  writeAlertHistory,
} from "../utils/alertHistory";

const PUSH_ALERTS_KEY = "push-alerts-enabled";
const PUSH_ALERTS_FLAG = "enabled";

/** @param {any} params */
export default function AlertsPanel({
  cityName,
  current,
  confidenceScore,
  exposureEstimate,
}) {
  // "unsupported" rather than "denied" when the API is absent. iOS Safari and in-app
  // webviews have no Notification constructor at all, and telling those visitors they
  // have blocked notifications — with instructions for unblocking them — describes a
  // setting that does not exist on their device.
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );

  const [alertHistory, setAlertHistory] = useState(readAlertHistory);

  // Persist alert toggle state via the existing useLocalStorageSet hook.
  // The set contains PUSH_ALERTS_FLAG ('enabled') when alerts are on.
  const { has: hasAlertFlag, toggle: toggleAlertFlag } =
    useLocalStorageSet(PUSH_ALERTS_KEY);
  const alertsEnabled = hasAlertFlag(PUSH_ALERTS_FLAG);

  // Keep every hook call unconditional (Rules of Hooks). Guard `current` inside
  // the hooks and bail out before rendering the JSX further down.
  const warnings = useMemo(() => buildWarnings(current), [current]);
  const lastNotified = useRef("");

  useEffect(() => {
    if (!warnings.length) {
      lastNotified.current = "";
      return;
    }

    const signature = alertSignature(cityName, warnings);

    // Recording the alert no longer sits behind a Notification check. History is a log
    // of what the app displayed; it has nothing to do with whether the browser can send
    // a notification. Guarding both together meant iOS Safari and in-app webviews — a
    // large share of this app's traffic — showed "No alert history yet." forever.
    //
    // The de-duplication key is read back from the stored log rather than kept in a ref,
    // so it survives a reload. That is what made every page load append the same
    // warnings again. Reading storage instead of `alertHistory` also keeps this effect
    // out of its own dependency list and the write out of a setState updater.
    const { history, changed } = recordAlerts(readAlertHistory(), {
      cityName,
      aqi: current?.us_aqi,
      warnings,
    });

    if (changed) {
      writeAlertHistory(history);
      setAlertHistory(history);
    }

    if (!("Notification" in window)) return;

    // Only fire when permission is granted, alerts are enabled by the user, and AQI
    // exceeds the hazardous threshold. Same signature = no repeat.
    if (
      permission === "granted" &&
      alertsEnabled &&
      current?.us_aqi > HAZARDOUS_AQI_THRESHOLD &&
      lastNotified.current !== signature
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
    clearAlertHistory();
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
              <li key={alertEntryKey(entry, i)} className="alert-history-item">
                <span className="alert-history-meta">
                  {formatAlertTimestamp(entry)} · {entry.city} · AQI{" "}
                  {entry.aqi ?? "—"}
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
