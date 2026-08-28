/**
 * Alert Rules Engine Service
 *
 * Manages user-defined alert rules that evaluate incoming AQI data against
 * custom thresholds and conditions. Rules are persisted in localStorage.
 *
 * Supports:
 * - AQI threshold alerts (above/below/between)
 * - Pollutant-specific alerts (PM2.5, PM10, NO₂, O₃, CO)
 * - Time-of-day conditions (morning/afternoon/evening/night or custom hours)
 * - Frequency throttling (once per N hours)
 * - Enable/disable individual rules
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RULES_STORAGE_KEY = 'pch_alert_rules';
const RULE_HISTORY_KEY = 'pch_alert_history';

export const POLLUTANT_OPTIONS = [
  { key: 'us_aqi', label: 'US AQI', unit: '' },
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { key: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³' },
  { key: 'ozone', label: 'O₃', unit: 'µg/m³' },
  { key: 'carbon_monoxide', label: 'CO', unit: 'mg/m³' },
];

export const OPERATORS = [
  { key: 'above', label: 'Above (≥)', symbol: '≥' },
  { key: 'below', label: 'Below (≤)', symbol: '≤' },
  { key: 'equals', label: 'Equals (=)', symbol: '=' },
];

export const TIME_WINDOWS = [
  { key: 'any', label: 'Any Time', hours: null },
  { key: 'morning', label: 'Morning (6–12)', hours: [6, 7, 8, 9, 10, 11] },
  { key: 'afternoon', label: 'Afternoon (12–18)', hours: [12, 13, 14, 15, 16, 17] },
  { key: 'evening', label: 'Evening (18–24)', hours: [18, 19, 20, 21, 22, 23] },
  { key: 'night', label: 'Night (0–6)', hours: [0, 1, 2, 3, 4, 5] },
];

export const THROTTLE_OPTIONS = [
  { key: 1, label: 'Every time' },
  { key: 3, label: 'Every 3 hours' },
  { key: 6, label: 'Every 6 hours' },
  { key: 12, label: 'Every 12 hours' },
  { key: 24, label: 'Once per day' },
];

// ---------------------------------------------------------------------------
// Rule structure
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AlertRule
 * @property {string} id - UUID
 * @property {string} name - User-friendly label
 * @property {string} pollutant - Key from POLLUTANT_OPTIONS
 * @property {string} operator - 'above' | 'below' | 'equals'
 * @property {number} threshold - Numeric threshold value
 * @property {string} timeWindow - Key from TIME_WINDOWS
 * @property {number} throttleHours - Minimum hours between firings
 * @property {boolean} enabled - Whether the rule is active
 * @property {string} severity - 'info' | 'warning' | 'critical'
 * @property {number} createdAt - Timestamp
 */

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * @returns {AlertRule[]}
 */
export function readRules() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {AlertRule[]} rules
 */
export function writeRules(rules) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    }
  } catch {
    // Best effort
  }
}

/**
 * Creates a new rule with a generated ID.
 *
 * @param {Partial<AlertRule>} partial
 * @returns {AlertRule}
 */
export function createRule(partial = {}) {
  const rule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name || 'New Alert Rule',
    pollutant: partial.pollutant || 'us_aqi',
    operator: partial.operator || 'above',
    threshold: partial.threshold ?? 100,
    timeWindow: partial.timeWindow || 'any',
    throttleHours: partial.throttleHours ?? 6,
    enabled: partial.enabled !== false,
    severity: partial.severity || 'warning',
    createdAt: Date.now(),
  };
  const rules = readRules();
  rules.push(rule);
  writeRules(rules);
  return rule;
}

/**
 * Updates an existing rule by ID.
 *
 * @param {string} id
 * @param {Partial<AlertRule>} updates
 * @returns {AlertRule|null}
 */
export function updateRule(id, updates) {
  const rules = readRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  rules[idx] = { ...rules[idx], ...updates };
  writeRules(rules);
  return rules[idx];
}

/**
 * Deletes a rule by ID.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function deleteRule(id) {
  const rules = readRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  writeRules(filtered);
  return true;
}

/**
 * Toggles a rule's enabled state.
 *
 * @param {string} id
 * @returns {AlertRule|null}
 */
export function toggleRule(id) {
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  rule.enabled = !rule.enabled;
  writeRules(rules);
  return rule;
}

// ---------------------------------------------------------------------------
// Evaluation engine
// ---------------------------------------------------------------------------

/**
 * Evaluates all active rules against a set of current readings.
 *
 * @param {Object} current - Current readings { us_aqi, pm2_5, pm10, nitrogen_dioxide, ozone, carbon_monoxide }
 * @returns {{ triggered: AlertRule[], firedIds: string[] }}
 */
export function evaluateRules(current) {
  if (!current) return { triggered: [], firedIds: [] };

  const rules = readRules();
  const history = readAlertHistory();
  const now = Date.now();
  const currentHour = new Date().getHours();

  const triggered = [];
  const firedIds = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Time window check
    const window = TIME_WINDOWS.find((tw) => tw.key === rule.timeWindow);
    if (window?.hours && !window.hours.includes(currentHour)) continue;

    // Read value
    const value = current[rule.pollutant];
    if (value == null || !Number.isFinite(value)) continue;

    // Operator check
    let matched = false;
    switch (rule.operator) {
      case 'above':
        matched = value >= rule.threshold;
        break;
      case 'below':
        matched = value <= rule.threshold;
        break;
      case 'equals':
        matched = Math.abs(value - rule.threshold) < 0.5;
        break;
      default:
        matched = false;
    }

    if (!matched) continue;

    // Throttle check
    const lastFired = history[rule.id];
    if (lastFired) {
      const elapsedHours = (now - lastFired) / (1000 * 60 * 60);
      if (elapsedHours < rule.throttleHours) continue;
    }

    triggered.push(rule);
    firedIds.push(rule.id);
  }

  // Update history for fired rules
  if (firedIds.length > 0) {
    const updatedHistory = { ...history };
    for (const id of firedIds) {
      updatedHistory[id] = now;
    }
    writeAlertHistory(updatedHistory);
  }

  return { triggered, firedIds };
}

// ---------------------------------------------------------------------------
// Alert history (for throttling)
// ---------------------------------------------------------------------------

function readAlertHistory() {
  try {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(RULE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAlertHistory(history) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RULE_HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    // Best effort
  }
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

/**
 * Sends a browser notification for a triggered rule.
 *
 * @param {AlertRule} rule
 * @param {Object} current
 * @returns {boolean} Whether notification was shown
 */
export function sendNotification(rule, current) {
  if (typeof window === 'undefined' || !window.Notification) return false;
  if (window.Notification.permission !== 'granted') return false;

  const pollutant = POLLUTANT_OPTIONS.find((p) => p.key === rule.pollutant);
  const value = current[rule.pollutant];
  const symbol = OPERATORS.find((o) => o.key === rule.operator)?.symbol || '≥';

  const body = `${pollutant?.label || rule.pollutant}: ${value} ${pollutant?.unit || ''} ${symbol} ${rule.threshold}`;
  const icon = rule.severity === 'critical' ? '🔴' : rule.severity === 'warning' ? '🟠' : '🔵';

  try {
    new window.Notification(`${icon} ${rule.name}`, {
      body,
      icon: '/favicon.ico',
      tag: rule.id,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests browser notification permission.
 *
 * @returns {Promise<string>} Permission state
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !window.Notification) return 'unavailable';
  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';
  const result = await window.Notification.requestPermission();
  return result;
}

// ---------------------------------------------------------------------------
// Preset rules
// ---------------------------------------------------------------------------

export const PRESET_RULES = [
  {
    name: 'High AQI Alert',
    pollutant: 'us_aqi',
    operator: 'above',
    threshold: 150,
    timeWindow: 'any',
    throttleHours: 6,
    severity: 'critical',
  },
  {
    name: 'PM2.5 Warning',
    pollutant: 'pm2_5',
    operator: 'above',
    threshold: 55,
    timeWindow: 'any',
    throttleHours: 12,
    severity: 'warning',
  },
  {
    name: 'Morning Air Check',
    pollutant: 'us_aqi',
    operator: 'above',
    threshold: 100,
    timeWindow: 'morning',
    throttleHours: 24,
    severity: 'warning',
  },
  {
    name: 'Good Air Window',
    pollutant: 'us_aqi',
    operator: 'below',
    threshold: 50,
    timeWindow: 'morning',
    throttleHours: 6,
    severity: 'info',
  },
];
