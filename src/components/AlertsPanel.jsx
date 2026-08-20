import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import NotificationSettings from "./NotificationSettings";
import {
  alertSignature,
  readAlertHistory,
  writeAlertHistory,
  clearAlertHistory,
  recordAlerts,
  formatAlertTimestamp,
  alertEntryKey,
} from "../utils/alertHistory";

const PUSH_ALERTS_KEY = "push-alerts-enabled";
const PUSH_ALERTS_FLAG = "enabled";

/**
 * Every warning here is driven by the visitor's own notification settings. The AQI cut-off
 * used to be hardcoded to 120 while the settings panel offered an "Alert me when AQI >"
 * field that only the browser push consulted, so the two disagreed out of the box and
 * raising the threshold had no effect on what was actually shown or logged.
 *
 * @param {any} current
 * @param {{ aqiThreshold: number, pollutantThresholds: any }} settings
 * @param {(key: string, fallback: string) => string} t
 */
function buildWarnings(current, settings, t) {
  const thresholds = settings.pollutantThresholds;
  const warnings = [];
  if (current.pm2_5 > thresholds.pm2_5)
    warnings.push(
      t("alerts.warnings.pm25", "PM2.5 is high. Wear a certified mask and avoid heavy outdoor exercise."),
    );
  if (current.pm10 > thresholds.pm10)
    warnings.push(
      t("alerts.warnings.pm10", "PM10 is elevated. Keep windows closed during peak traffic hours."),
    );
  if (current.nitrogen_dioxide > thresholds.nitrogen_dioxide)
    warnings.push(
      t("alerts.warnings.no2", "NO2 levels are unsafe. Reduce roadside exposure if possible."),
    );
  if (current.ozone > thresholds.ozone)
    warnings.push(
      t("alerts.warnings.ozone", "Ozone levels are high. Limit outdoor activity during peak sunlight hours."),
    );
  if (current.carbon_monoxide > thresholds.carbon_monoxide)
    warnings.push(
      t("alerts.warnings.co", "CO levels are unsafe. Ventilate indoor spaces and check fuel-burning appliances."),
    );
  if (current.us_aqi > settings.aqiThreshold)
    warnings.push(
      t("alerts.warnings.aqi", "AQI suggests unhealthy conditions. Avoid outdoor activities today."),
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
  const { t } = useTranslation();
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

  // Custom AQI threshold, per-pollutant thresholds, and quiet hours (localStorage-backed)
  const { settings: notificationSettings, updateSettings, isWithinQuietHours } =
    useNotificationSettings();
  const [showSettings, setShowSettings] = useState(false);

  // Keep every hook call unconditional (Rules of Hooks). Guard `current` inside
  // the hooks and bail out before rendering the JSX further down.
  const warnings = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is used inside
    // buildWarnings via closure; it is intentionally excluded here because some
    // i18next setups (and tests) hand back a new `t` reference on every render,
    // which would otherwise recompute `warnings` every render and re-fire the
    // alert-recording effect below even when nothing actually changed.
    () => (current ? buildWarnings(current, notificationSettings, t) : []),
    [current, notificationSettings],
  );
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

    // Browser push notification: only fire when permission is granted,
    // alerts are enabled by the user, AQI exceeds the user's custom threshold,
    // and we're not inside their configured quiet hours.
    //
    // `lastNotified` was assigned but never compared against, so an unchanged alert set
    // pushed a fresh desktop notification on every dashboard refresh. The signature check
    // is what the comment claimed and the code did not do.
    if (
      lastNotified.current !== signature &&
      permission === "granted" &&
      alertsEnabled &&
      current.us_aqi > notificationSettings.aqiThreshold &&
      !isWithinQuietHours()
    ) {
      new Notification("⚠️ Hazardous Pollution Alert", {
        body: `${cityName}: AQI ${current.us_aqi} — ${warnings[0]}`,
      });
      lastNotified.current = signature;
    }
  }, [
    warnings,
    cityName,
    current?.us_aqi,
    permission,
    alertsEnabled,
    notificationSettings.aqiThreshold,
    isWithinQuietHours,
  ]);

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
      <div
        className="panel-head"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <h2>{t("alerts.title", "Alerts & Notifications")}</h2>
          <p>{t("alerts.subtitle", "Health warnings based on safe pollutant thresholds")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          aria-label={t("alerts.settingsAriaLabel", "Open notification settings")}
          data-testid="notification-settings-toggle"
          className="notif-gear-btn"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <NotificationSettings
          settings={notificationSettings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

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
            {t("alerts.enable", "Enable Desktop Notifications")}
          </button>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary, #64748b)",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            {t("alerts.enableDesc", "Enable notifications to receive real-time pollution alerts.")}
          </p>
        </div>
      )}

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
              {t("alerts.toggleTitle", "Hazardous Pollution Alerts")}
            </strong>
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary, #64748b)",
              }}
            >
              {t("alerts.toggleDesc", "Receive a browser notification when AQI exceeds {{threshold}}", { threshold: notificationSettings.aqiThreshold })}
            </span>
          </div>

          <button
            type="button"
            className={`alerts-toggle-inline ${alertsEnabled ? "on" : ""}`}
            onClick={() => toggleAlertFlag(PUSH_ALERTS_FLAG)}
            aria-label={t("alerts.toggleAriaLabel", "Toggle Hazardous Pollution Alerts")}
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
            {t("alerts.blockedTitle", "Notifications are blocked")}
          </p>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary, #64748b)",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            {t("alerts.blockedDesc", "You've blocked notifications for this site. To receive pollution alerts, enable them manually in your browser settings (click the lock/info icon next to the address bar → Notifications → Allow).")}
          </p>
        </div>
      )}

      {exposureEstimate && (
        <div className="exposure-card">
          <h3>{t("alerts.exposureTimer", "Exposure Timer")}</h3>
          <p className="exposure-message">{exposureEstimate.message}</p>
          <small className="exposure-note">
            {t("alerts.estimatedNote", "Estimated from recent AQI trends.")}
          </small>
        </div>
      )}

      {warnings.length ? (
        <>
          {confidenceScore === "Low" && (
            <p className="low-confidence-note">
              {t("alerts.lowConfidence", "Warnings based on low-confidence data")}
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
          {t("alerts.safeLimits", "Air quality is within safer limits right now. Keep monitoring for changes.")}
        </p>
      )}

      <div className="alert-history">
        <div className="alert-history-head">
          <h3>{t("alerts.historyTitle", "Alert History")}</h3>
          {alertHistory.length > 0 && (
            <button
              type="button"
              className="alert-history-clear"
              onClick={handleClearHistory}
            >
              {t("alerts.clearHistory", "Clear History")}
            </button>
          )}
        </div>
        {alertHistory.length === 0 ? (
          <p className="alert-history-empty">{t("alerts.noHistory", "No alert history yet.")}</p>
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
