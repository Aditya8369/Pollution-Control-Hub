import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  readRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  evaluateRules,
  sendNotification,
  requestNotificationPermission,
  POLLUTANT_OPTIONS,
  OPERATORS,
  TIME_WINDOWS,
  THROTTLE_OPTIONS,
  PRESET_RULES,
} from "../services/alertRulesService";
import styles from "./AlertRulesEngine.module.css";

// ---------------------------------------------------------------------------
// Memoized sub-components
// ---------------------------------------------------------------------------

const StatCard = memo(function StatCard({ icon, value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon} aria-hidden="true">{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
});

const RuleCard = memo(function RuleCard({ rule, onToggle, onDelete, onEdit }) {
  const pollutant = POLLUTANT_OPTIONS.find((p) => p.key === rule.pollutant);
  const operator = OPERATORS.find((o) => o.key === rule.operator);
  const timeWindow = TIME_WINDOWS.find((tw) => tw.key === rule.timeWindow);
  const severityCls = rule.severity === "critical" ? styles.severityCritical
    : rule.severity === "warning" ? styles.severityWarning
    : styles.severityInfo;
  const cardCls = rule.enabled ? styles.ruleEnabled : styles.ruleDisabled;
  const sevBorder = rule.severity === "critical" ? styles.ruleSeverityCritical
    : rule.severity === "warning" ? styles.ruleSeverityWarning
    : styles.ruleSeverityInfo;

  return (
    <div className={`${styles.ruleCard} ${cardCls} ${sevBorder}`} data-testid="rule-card">
      <button
        type="button"
        className={`${styles.ruleToggle} ${rule.enabled ? styles.ruleToggleOn : ""}`}
        onClick={() => onToggle(rule.id)}
        aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
        data-testid="rule-toggle"
      />
      <div className={styles.ruleContent}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <p className={styles.ruleName}>{rule.name}</p>
          <span className={`${styles.severityBadge} ${severityCls}`}>{rule.severity}</span>
        </div>
        <p className={styles.ruleCondition}>
          {pollutant?.label} {operator?.symbol} {rule.threshold} {pollutant?.unit}
          {rule.timeWindow !== "any" && ` · ${timeWindow?.label}`}
        </p>
        <p className={styles.ruleMeta}>
          Throttle: every {rule.throttleHours}h
          {rule.lastFired ? ` · Last fired: ${new Date(rule.lastFired).toLocaleTimeString()}` : ""}
        </p>
      </div>
      <div className={styles.ruleActions}>
        <button type="button" className={`${styles.btn} ${styles.btnSmall}`} onClick={() => onEdit(rule)} aria-label="Edit rule" data-testid="edit-btn">✏️</button>
        <button type="button" className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => onDelete(rule.id)} aria-label="Delete rule" data-testid="delete-btn">🗑️</button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AlertRulesEngine({ current }) {
  const { t } = useTranslation();
  const [rules, setRules] = useState(() => readRules());
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [notifPermission, setNotifPermission] = useState("unknown");

  // Form state
  const [formName, setFormName] = useState("");
  const [formPollutant, setFormPollutant] = useState("us_aqi");
  const [formOperator, setFormOperator] = useState("above");
  const [formThreshold, setFormThreshold] = useState("100");
  const [formTimeWindow, setFormTimeWindow] = useState("any");
  const [formThrottle, setFormThrottle] = useState(6);
  const [formSeverity, setFormSeverity] = useState("warning");

  // Evaluate rules on current data
  const triggeredCount = useMemo(() => {
    if (!current) return 0;
    const { triggered } = evaluateRules(current);
    // Send notifications for triggered rules
    for (const rule of triggered) {
      sendNotification(rule, current);
    }
    return triggered.length;
  }, [current]);

  // Check notification permission on mount
  useEffect(() => {
    setNotifPermission(requestNotificationPermission());
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }, []);

  const refreshRules = useCallback(() => {
    setRules(readRules());
  }, []);

  // Stats
  const activeRules = useMemo(() => rules.filter((r) => r.enabled), [rules]);
  const totalRules = rules.length;

  // Form handlers
  const resetForm = useCallback(() => {
    setFormName("");
    setFormPollutant("us_aqi");
    setFormOperator("above");
    setFormThreshold("100");
    setFormTimeWindow("any");
    setFormThrottle(6);
    setFormSeverity("warning");
    setEditingRule(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((rule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormPollutant(rule.pollutant);
    setFormOperator(rule.operator);
    setFormThreshold(String(rule.threshold));
    setFormTimeWindow(rule.timeWindow);
    setFormThrottle(rule.throttleHours);
    setFormSeverity(rule.severity);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const threshold = parseFloat(formThreshold);
    if (!Number.isFinite(threshold)) {
      showToast(t("alerts.invalidThreshold", "Please enter a valid threshold"));
      return;
    }

    const data = {
      name: formName || "Alert Rule",
      pollutant: formPollutant,
      operator: formOperator,
      threshold,
      timeWindow: formTimeWindow,
      throttleHours: formThrottle,
      severity: formSeverity,
    };

    if (editingRule) {
      updateRule(editingRule.id, data);
      showToast(t("alerts.updated", "Rule updated!"));
    } else {
      createRule(data);
      showToast(t("alerts.created", "Rule created!"));
    }

    refreshRules();
    resetForm();
  }, [formName, formPollutant, formOperator, formThreshold, formTimeWindow, formThrottle, formSeverity, editingRule, t, showToast, refreshRules, resetForm]);

  const handleDelete = useCallback((id) => {
    if (typeof window !== "undefined" && window.confirm("Delete this alert rule?")) {
      deleteRule(id);
      refreshRules();
      showToast(t("alerts.deleted", "Rule deleted"));
    }
  }, [refreshRules, t, showToast]);

  const handleToggle = useCallback((id) => {
    toggleRule(id);
    refreshRules();
  }, [refreshRules]);

  const handleAddPreset = useCallback((preset) => {
    createRule(preset);
    refreshRules();
    showToast(t("alerts.presetAdded", "Preset rule added!"));
  }, [refreshRules, t, showToast]);

  const handleEnableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      showToast(t("alerts.notifsEnabled", "Notifications enabled!"));
    } else {
      showToast(t("alerts.notifsDenied", "Notifications blocked by browser"));
    }
  }, [t, showToast]);

  return (
    <section data-testid="alert-rules-engine" className="panel">
      <div className={styles.root}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>🔔 {t("alerts.title", "Alert Rules Engine")}</h2>
          <p className={styles.headerSubtitle}>{t("alerts.subtitle", "Create custom alert rules based on AQI thresholds and conditions")}</p>
        </div>

        {/* Stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <StatCard icon="📋" value={totalRules} label={t("alerts.totalRules", "Total Rules")} />
          <StatCard icon="✅" value={activeRules.length} label={t("alerts.activeRules", "Active")} />
          <StatCard icon="🔔" value={triggeredCount} label={t("alerts.triggered", "Triggered Now")} />
          <StatCard
            icon="📢"
            value={notifPermission === "granted" ? "On" : "Off"}
            label={t("alerts.notifications", "Notifications")}
          />
        </div>

        {/* Notification permission */}
        {notifPermission !== "granted" && (
          <div style={{ textAlign: "center" }}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleEnableNotifications}>
              🔔 {t("alerts.enableNotifs", "Enable Browser Notifications")}
            </button>
          </div>
        )}

        {/* Create / Edit form */}
        <div className={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>📝 {editingRule ? t("alerts.editRule", "Edit Rule") : t("alerts.createRule", "Create Rule")}</h3>
            <button
              type="button"
              className={`${styles.btn} ${showForm ? "" : styles.btnPrimary}`}
              onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            >
              {showForm ? "✕ Cancel" : "+ " + t("alerts.newRule", "New Rule")}
            </button>
          </div>

          {showForm && (
            <form className={styles.form} onSubmit={handleSubmit} data-testid="rule-form">
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-name">{t("alerts.name", "Name")}</label>
                <input
                  id="rule-name"
                  type="text"
                  className={styles.formInput}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("alerts.namePlaceholder", "e.g. High PM2.5 Alert")}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-pollutant">{t("alerts.pollutant", "Pollutant")}</label>
                <select id="rule-pollutant" className={styles.formSelect} value={formPollutant} onChange={(e) => setFormPollutant(e.target.value)}>
                  {POLLUTANT_OPTIONS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label} {p.unit ? `(${p.unit})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-operator">{t("alerts.condition", "Condition")}</label>
                <select id="rule-operator" className={styles.formSelect} value={formOperator} onChange={(e) => setFormOperator(e.target.value)}>
                  {OPERATORS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-threshold">{t("alerts.threshold", "Threshold")}</label>
                <input
                  id="rule-threshold"
                  type="number"
                  className={styles.formInput}
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-timewindow">{t("alerts.timeWindow", "Time Window")}</label>
                <select id="rule-timewindow" className={styles.formSelect} value={formTimeWindow} onChange={(e) => setFormTimeWindow(e.target.value)}>
                  {TIME_WINDOWS.map((tw) => (
                    <option key={tw.key} value={tw.key}>{tw.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-throttle">{t("alerts.frequency", "Frequency")}</label>
                <select id="rule-throttle" className={styles.formSelect} value={formThrottle} onChange={(e) => setFormThrottle(Number(e.target.value))}>
                  {THROTTLE_OPTIONS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="rule-severity">{t("alerts.severity", "Severity")}</label>
                <select id="rule-severity" className={styles.formSelect} value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)}>
                  <option value="info">🔵 Info</option>
                  <option value="warning">🟠 Warning</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={resetForm}>{t("alerts.cancel", "Cancel")}</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingRule ? t("alerts.update", "Update") : t("alerts.create", "Create")} {t("alerts.rule", "Rule")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Active Rules */}
        <div className={styles.section} data-testid="rules-list">
          <h3 className={styles.sectionTitle}>📋 {t("alerts.yourRules", "Your Rules")} ({rules.length})</h3>
          {rules.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t("alerts.noRules", "No rules yet. Create one above or add a preset below.")}</p>
            </div>
          ) : (
            <div className={styles.rulesList}>
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preset Rules */}
        <div className={styles.section} data-testid="presets-section">
          <h3 className={styles.sectionTitle}>⚡ {t("alerts.presetRules", "Quick Preset Rules")}</h3>
          <div className={styles.presetGrid}>
            {PRESET_RULES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.presetCard}
                onClick={() => handleAddPreset(preset)}
                data-testid="preset-card"
              >
                <p className={styles.presetName}>{preset.name}</p>
                <p className={styles.presetDesc}>
                  {POLLUTANT_OPTIONS.find((p) => p.key === preset.pollutant)?.label}{" "}
                  {OPERATORS.find((o) => o.key === preset.operator)?.symbol} {preset.threshold}
                  {preset.timeWindow !== "any" && ` · ${TIME_WINDOWS.find((tw) => tw.key === preset.timeWindow)?.label}`}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Toast */}
        <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ""}`} role="status" aria-live="polite">
          {toastMessage}
        </div>
      </div>
    </section>
  );
}
