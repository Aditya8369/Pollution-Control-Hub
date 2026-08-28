/**
 * Exposure Timeline Service
 *
 * Tracks cumulative pollution exposure, computes health-risk scores,
 * and generates personalised exposure history and recommendations.
 *
 * All exposure data is persisted in localStorage under a single key.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPOSURE_STORAGE_KEY = 'pch_exposure_history';
const MAX_HISTORY_DAYS = 90;

/**
 * Health risk thresholds for cumulative AQI exposure (hourly buckets).
 * These are simplified guidance based on WHO/EPA general recommendations.
 */
const EXPOSURE_THRESHOLDS = {
  /** Below this, exposure is considered "safe" for the current hour. */
  safeHourly: 50,
  /** Above this, a single hour is flagged as "moderate risk". */
  moderateHourly: 100,
  /** Above this, a single hour is "high risk". */
  highHourly: 150,
  /** Cumulative daily exposure score thresholds. */
  dailyLow: 50,
  dailyModerate: 100,
  dailyHigh: 150,
  dailyCritical: 200,
};

/**
 * Weekly exposure score thresholds for cumulative risk.
 */
const WEEKLY_THRESHOLDS = {
  low: 350,      // ~50 avg over 7 days
  moderate: 700, // ~100 avg over 7 days
  high: 1050,    // ~150 avg over 7 days
  critical: 1400,// ~200 avg over 7 days
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Reads the full exposure history from localStorage.
 *
 * @returns {Array<{ date: string, hour: number, aqi: number, city: string }>}
 */
export function readExposureHistory() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(EXPOSURE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists the exposure history to localStorage.
 *
 * @param {Array} history
 */
export function writeExposureHistory(history) {
  try {
    if (typeof window === 'undefined') return;
    // Trim to MAX_HISTORY_DAYS to prevent unbounded growth
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const trimmed = history.filter((entry) => entry.date >= cutoffStr);
    window.localStorage.setItem(EXPOSURE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota — best effort
  }
}

/**
 * Records a single exposure data point (called on each auto-refresh cycle).
 *
 * @param {number} aqi - Current US AQI reading
 * @param {string} cityName
 * @returns {Array} Updated history
 */
export function recordExposure(aqi, cityName) {
  if (aqi == null || !Number.isFinite(aqi)) return readExposureHistory();

  const now = new Date();
  const entry = {
    date: now.toISOString().slice(0, 10),
    hour: now.getHours(),
    aqi: Math.round(aqi),
    city: cityName || 'Unknown',
    timestamp: now.getTime(),
  };

  const history = readExposureHistory();

  // Deduplicate: replace if same date+hour+city already exists
  const idx = history.findIndex(
    (h) => h.date === entry.date && h.hour === entry.hour && h.city === entry.city,
  );
  if (idx >= 0) {
    history[idx] = entry;
  } else {
    history.push(entry);
  }

  writeExposureHistory(history);
  return history;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Groups exposure records by date and computes daily summaries.
 *
 * @param {Array} history
 * @returns {Array<{ date: string, avgAqi: number, maxAqi: number, minAqi: number, hours: number, riskLevel: string, exposureScore: number }>}
 */
export function computeDailySummaries(history) {
  const byDate = new Map();

  for (const entry of history) {
    if (!entry.date || typeof entry.aqi !== 'number') continue;
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date).push(entry.aqi);
  }

  return Array.from(byDate.entries())
    .map(([date, aqis]) => {
      const avg = aqis.reduce((s, v) => s + v, 0) / aqis.length;
      const max = Math.max(...aqis);
      const min = Math.min(...aqis);
      const exposureScore = Math.round(avg * aqis.length); // total exposure "dose"
      return {
        date,
        avgAqi: Math.round(avg * 10) / 10,
        maxAqi: max,
        minAqi: min,
        hours: aqis.length,
        exposureScore,
        riskLevel: classifyDailyRisk(avg),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups exposure records by week and computes weekly summaries.
 *
 * @param {Array} history
 * @returns {Array<{ weekStart: string, avgAqi: number, maxAqi: number, totalHours: number, exposureScore: number, riskLevel: string }>}
 */
export function computeWeeklySummaries(history) {
  const byWeek = new Map();

  for (const entry of history) {
    if (!entry.date || typeof entry.aqi !== 'number') continue;
    const d = new Date(entry.date);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const weekKey = monday.toISOString().slice(0, 10);

    if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
    byWeek.get(weekKey).push(entry.aqi);
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, aqis]) => {
      const avg = aqis.reduce((s, v) => s + v, 0) / aqis.length;
      const max = Math.max(...aqis);
      const totalScore = aqis.reduce((s, v) => s + v, 0);
      return {
        weekStart,
        avgAqi: Math.round(avg * 10) / 10,
        maxAqi: max,
        totalHours: aqis.length,
        exposureScore: totalScore,
        riskLevel: classifyWeeklyRisk(totalScore),
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

/**
 * @param {number} avgDailyAqi
 * @returns {string}
 */
function classifyDailyRisk(avgDailyAqi) {
  if (avgDailyAqi <= EXPOSURE_THRESHOLDS.dailyLow) return 'low';
  if (avgDailyAqi <= EXPOSURE_THRESHOLDS.dailyModerate) return 'moderate';
  if (avgDailyAqi <= EXPOSURE_THRESHOLDS.dailyHigh) return 'high';
  return 'critical';
}

/**
 * @param {number} weeklyExposureScore
 * @returns {string}
 */
function classifyWeeklyRisk(weeklyExposureScore) {
  if (weeklyExposureScore <= WEEKLY_THRESHOLDS.low) return 'low';
  if (weeklyExposureScore <= WEEKLY_THRESHOLDS.moderate) return 'moderate';
  if (weeklyExposureScore <= WEEKLY_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Returns human-readable risk metadata for a risk level.
 *
 * @param {string} level
 * @returns {{ label: string, color: string, emoji: string, description: string }}
 */
export function getRiskMeta(level) {
  switch (level) {
    case 'low':
      return { label: 'Low Risk', color: '#22c55e', emoji: '🟢', description: 'Air quality exposure is within safe limits. No immediate health concerns.' };
    case 'moderate':
      return { label: 'Moderate Risk', color: '#eab308', emoji: '🟡', description: 'Some exposure above recommended levels. Sensitive individuals should take precautions.' };
    case 'high':
      return { label: 'High Risk', color: '#f97316', emoji: '🟠', description: 'Significant pollution exposure detected. Consider reducing outdoor activities.' };
    case 'critical':
      return { label: 'Critical Risk', color: '#ef4444', emoji: '🔴', description: 'Dangerous exposure levels. Avoid outdoor exertion and use air filtration indoors.' };
    default:
      return { label: 'Unknown', color: '#94a3b8', emoji: '⚪', description: 'Insufficient data to assess risk.' };
  }
}

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

/**
 * Computes a 0–100 "health score" where 100 = no exposure risk.
 * Based on the rolling 7-day average AQI.
 *
 * @param {Array} history
 * @returns {{ score: number, label: string, color: string }}
 */
export function computeHealthScore(history) {
  const daily = computeDailySummaries(history);
  const last7 = daily.slice(-7);

  if (last7.length === 0) {
    return { score: 100, label: 'No Data', color: '#94a3b8' };
  }

  const avgAqi = last7.reduce((s, d) => s + d.avgAqi, 0) / last7.length;

  // Score: 100 at AQI 0, linearly decreasing to 0 at AQI 200+
  const score = Math.max(0, Math.min(100, Math.round(100 - (avgAqi / 200) * 100)));

  let label, color;
  if (score >= 80) { label = 'Excellent'; color = '#22c55e'; }
  else if (score >= 60) { label = 'Good'; color = '#84cc16'; }
  else if (score >= 40) { label = 'Fair'; color = '#eab308'; }
  else if (score >= 20) { label = 'Poor'; color = '#f97316'; }
  else { label = 'Critical'; color = '#ef4444'; }

  return { score, label, color };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/**
 * Generates personalised recommendations based on exposure history.
 *
 * @param {Array} history
 * @returns {Array<{ title: string, description: string, priority: string, icon: string }>}
 */
export function generateRecommendations(history) {
  const daily = computeDailySummaries(history);
  const weekly = computeWeeklySummaries(history);
  const recommendations = [];

  // Check for consecutive high-exposure days
  const recentDays = daily.slice(-3);
  const consecutiveHigh = recentDays.filter((d) => d.riskLevel === 'high' || d.riskLevel === 'critical').length;

  if (consecutiveHigh >= 3) {
    recommendations.push({
      title: 'Extended High Exposure Detected',
      description: 'You have experienced 3+ consecutive days of high pollution exposure. Consider wearing N95 masks outdoors and using air purifiers indoors.',
      priority: 'high',
      icon: '⚠️',
    });
  }

  // Check for peak hours pattern
  const hourlyAvg = new Map();
  for (const entry of history) {
    if (typeof entry.hour !== 'number' || typeof entry.aqi !== 'number') continue;
    if (!hourlyAvg.has(entry.hour)) hourlyAvg.set(entry.hour, []);
    hourlyAvg.get(entry.hour).push(entry.aqi);
  }

  let peakHour = null;
  let peakAvg = 0;
  for (const [hour, aqis] of hourlyAvg) {
    const avg = aqis.reduce((s, v) => s + v, 0) / aqis.length;
    if (avg > peakAvg) { peakAvg = avg; peakHour = hour; }
  }

  if (peakHour !== null && peakAvg > 100) {
    recommendations.push({
      title: `Peak Pollution at ${peakHour}:00`,
      description: `AQI tends to be highest around ${peakHour}:00 (avg ${Math.round(peakAvg)}). Try to schedule outdoor activities before or after this window.`,
      priority: 'medium',
      icon: '🕐',
    });
  }

  // Weekly trend
  if (weekly.length >= 2) {
    const thisWeek = weekly[weekly.length - 1];
    const lastWeek = weekly[weekly.length - 2];

    if (thisWeek.avgAqi > lastWeek.avgAqi * 1.2) {
      recommendations.push({
        title: 'Exposure Trending Upward',
        description: `This week's average AQI (${thisWeek.avgAqi}) is higher than last week's (${lastWeek.avgAqi}). Monitor conditions closely.`,
        priority: 'medium',
        icon: '📈',
      });
    } else if (thisWeek.avgAqi < lastWeek.avgAqi * 0.8) {
      recommendations.push({
        title: 'Exposure Improving',
        description: `Great news — this week's average AQI (${thisWeek.avgAqi}) is lower than last week's (${lastWeek.avgAqi}). Keep up healthy outdoor habits.`,
        priority: 'low',
        icon: '✅',
      });
    }
  }

  // General recommendation if few data points
  if (history.length < 10) {
    recommendations.push({
      title: 'Build Your Exposure Profile',
      description: 'Keep the app running to build a more accurate exposure profile. The more data points collected, the better your personalised recommendations.',
      priority: 'info',
      icon: '📊',
    });
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Clear / reset
// ---------------------------------------------------------------------------

/**
 * Clears all stored exposure history.
 */
export function clearExposureHistory() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(EXPOSURE_STORAGE_KEY);
    }
  } catch {
    // Best effort
  }
}

/**
 * Exports exposure history as CSV string.
 *
 * @param {Array} history
 * @returns {string}
 */
export function exposureToCSV(history) {
  const headers = ['Date', 'Hour', 'AQI', 'City', 'Timestamp'];
  const rows = (history || []).map((e) => [
    e.date ?? '',
    e.hour ?? '',
    e.aqi ?? '',
    `"${(e.city || '').replace(/"/g, '""')}"`,
    e.timestamp ?? '',
  ]);
  const header = `# Exposure History Export — Generated ${new Date().toISOString()}`;
  return `${header}\n${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
}
