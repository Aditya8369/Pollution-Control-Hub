import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  recordExposure,
  readExposureHistory,
  computeDailySummaries,
  computeWeeklySummaries,
  computeHealthScore,
  generateRecommendations,
  getRiskMeta,
  clearExposureHistory,
  exposureToCSV,
} from "../services/exposureTimelineService";
import { triggerDownload, copyToClipboard } from "../services/dataExportService";
import styles from "./ExposureTimelineTracker.module.css";

// ---------------------------------------------------------------------------
// Memoized sub-components
// ---------------------------------------------------------------------------

const StatCard = memo(function StatCard({ icon, value, label, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon} aria-hidden="true">{icon}</span>
      <span className={styles.statValue} style={color ? { color } : undefined}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
});

const RecItem = memo(function RecItem({ rec }) {
  const cls = rec.priority === "high" ? styles.recHigh
    : rec.priority === "medium" ? styles.recMedium
    : rec.priority === "low" ? styles.recLow
    : styles.recInfo;
  return (
    <li className={`${styles.recItem} ${cls}`}>
      <span className={styles.recIcon} aria-hidden="true">{rec.icon}</span>
      <div className={styles.recContent}>
        <p className={styles.recTitle}>{rec.title}</p>
        <p className={styles.recDesc}>{rec.description}</p>
      </div>
    </li>
  );
});

function ScoreRing({ score, color }) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.scoreRing}>
      <svg className={styles.scoreRingSvg} viewBox="0 0 160 160">
        <circle className={styles.scoreRingBg} cx="80" cy="80" r={radius} />
        <circle
          className={styles.scoreRingFill}
          cx="80" cy="80" r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.scoreCenter}>
        <div className={styles.scoreValue} style={{ color }}>{score}</div>
        <div className={styles.scoreLabel}>/ 100</div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: "var(--bg-card, #fff)",
      border: "1px solid var(--border-color, #e2e8f0)",
      borderRadius: "0.5rem",
      padding: "0.5rem 0.75rem",
      fontSize: "0.78rem",
      boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{label}</div>
      {payload.map((e) => (
        <div key={e.dataKey} style={{ color: e.color || "var(--text-primary, #0f172a)" }}>
          {e.name}: {e.value}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExposureTimelineTracker({ current, cityName }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState(() => readExposureHistory());
  const [activeTab, setActiveTab] = useState("daily");
  const [toastMessage, setToastMessage] = useState("");

  // Record current AQI on mount / when current changes
  useEffect(() => {
    if (current?.us_aqi != null) {
      const updated = recordExposure(current.us_aqi, cityName);
      setHistory(updated);
    }
  }, [current?.us_aqi, cityName]);

  // Aggregations
  const dailySummaries = useMemo(() => computeDailySummaries(history), [history]);
  const weeklySummaries = useMemo(() => computeWeeklySummaries(history), [history]);
  const healthScore = useMemo(() => computeHealthScore(history), [history]);
  const recommendations = useMemo(() => generateRecommendations(history), [history]);

  // Chart data (daily)
  const dailyChartData = useMemo(() =>
    dailySummaries.slice(-14).map((d) => ({
      date: d.date.slice(5), // MM-DD
      avgAqi: d.avgAqi,
      maxAqi: d.maxAqi,
      riskLevel: d.riskLevel,
    })),
    [dailySummaries],
  );

  // Stats
  const totalDays = dailySummaries.length;
  const totalHours = history.length;
  const overallAvg = dailySummaries.length > 0
    ? Math.round(dailySummaries.reduce((s, d) => s + d.avgAqi, 0) / dailySummaries.length)
    : 0;
  const peakDay = dailySummaries.reduce((max, d) => d.maxAqi > (max?.maxAqi ?? 0) ? d : max, null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = exposureToCSV(history);
    triggerDownload(csv, `exposure-history-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    showToast(t("exposure.downloaded", "Export downloaded!"));
  }, [history, t, showToast]);

  const handleCopySummary = useCallback(async () => {
    const score = healthScore;
    const lines = [
      '═══════════════════════════════════════════',
      '  EXPOSURE TIMELINE SUMMARY',
      `  Generated: ${new Date().toLocaleString()}`,
      '═══════════════════════════════════════════',
      '',
      `  Health Score: ${score.score}/100 (${score.label})`,
      `  Total days tracked: ${totalDays}`,
      `  Total data points: ${totalHours}`,
      `  Overall average AQI: ${overallAvg}`,
      peakDay ? `  Peak day: ${peakDay.date} (AQI ${peakDay.maxAqi})` : '',
      '',
      '  ─── Recommendations ───',
      ...recommendations.map((r) => `  ${r.icon} ${r.title}: ${r.description}`),
      '',
      '═══════════════════════════════════════════',
      '  Source: Pollution Control Hub',
      '═══════════════════════════════════════════',
    ];
    const ok = await copyToClipboard(lines.filter(Boolean).join("\n"));
    showToast(ok ? t("exposure.copied", "Summary copied!") : t("exposure.copyFailed", "Copy failed"));
  }, [healthScore, totalDays, totalHours, overallAvg, peakDay, recommendations, t, showToast]);

  const handleClearHistory = useCallback(() => {
    if (typeof window !== "undefined" && window.confirm("Clear all exposure history? This cannot be undone.")) {
      clearExposureHistory();
      setHistory([]);
      showToast(t("exposure.cleared", "History cleared"));
    }
  }, [t, showToast]);

  // --- Empty state ---
  if (history.length === 0 && (!current || current.us_aqi == null)) {
    return (
      <section data-testid="exposure-timeline-tracker" className="panel">
        <div className={styles.root}>
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>⏱️ {t("exposure.title", "Exposure Timeline")}</h2>
            <p className={styles.headerSubtitle}>{t("exposure.subtitle", "Track your cumulative pollution exposure over time")}</p>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏱️</div>
            <p className={styles.emptyTitle}>{t("exposure.noData", "No exposure data yet")}</p>
            <p className={styles.emptyDesc}>{t("exposure.noDataDesc", "Your exposure timeline builds automatically as you use the app. Check back after a few hours to see your exposure patterns.")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="exposure-timeline-tracker" className="panel">
      <div className={styles.root}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>⏱️ {t("exposure.title", "Exposure Timeline")}</h2>
          <p className={styles.headerSubtitle}>{t("exposure.subtitleTrack", "Track your cumulative pollution exposure over time — {{city}}", { city: cityName })}</p>
        </div>

        {/* Health Score Ring */}
        <div className={styles.healthScoreSection} data-testid="health-score">
          <div>
            <ScoreRing score={healthScore.score} color={healthScore.color} />
            <p style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.9rem", fontWeight: 600, color: healthScore.color }}>
              {t("exposure.healthScore", "7-Day Health Score")}: {healthScore.label}
            </p>
            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)", margin: "0.2rem 0 0" }}>
              {t("exposure.healthScoreDesc", "Based on your rolling 7-day average AQI exposure")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <StatCard icon="📅" value={totalDays} label={t("exposure.daysTracked", "Days Tracked")} />
          <StatCard icon="📊" value={totalHours} label={t("exposure.dataPoints", "Data Points")} />
          <StatCard icon="🌡️" value={overallAvg} label={t("exposure.overallAvg", "Overall Avg AQI")} color={healthScore.color} />
          {peakDay && (
            <StatCard icon="⬆️" value={peakDay.maxAqi} label={`${t("exposure.peak", "Peak")} (${peakDay.date.slice(5)})`} color="#ef4444" />
          )}
        </div>

        {/* Daily chart */}
        {dailyChartData.length > 1 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📈 {t("exposure.dailyChart", "Daily Average AQI")}</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="date" fontSize={9} tick={{ fill: "var(--text-secondary, #94a3b8)" }} />
                  <YAxis fontSize={9} tick={{ fill: "var(--text-secondary, #94a3b8)" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.4} />
                  <ReferenceLine y={100} stroke="#eab308" strokeDasharray="5 5" strokeOpacity={0.4} />
                  <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.4} />
                  <Bar dataKey="avgAqi" name="Avg AQI" radius={[4, 4, 0, 0]}>
                    {dailyChartData.map((entry, idx) => {
                      const risk = getRiskMeta(entry.riskLevel);
                      return <Cell key={idx} fill={risk.color} fillOpacity={0.8} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabbed view: Daily / Weekly */}
        <div className={styles.section} data-testid="summary-table">
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "daily" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("daily")}
            >
              📅 {t("exposure.daily", "Daily")}
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "weekly" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("weekly")}
            >
              📆 {t("exposure.weekly", "Weekly")}
            </button>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {activeTab === "daily" ? (
                    <>
                      <th>{t("exposure.colDate", "Date")}</th>
                      <th>{t("exposure.colAvg", "Avg AQI")}</th>
                      <th>{t("exposure.colPeak", "Peak")}</th>
                      <th>{t("exposure.colLow", "Low")}</th>
                      <th>{t("exposure.colHours", "Hours")}</th>
                      <th>{t("exposure.colScore", "Exposure")}</th>
                      <th>{t("exposure.colRisk", "Risk")}</th>
                    </>
                  ) : (
                    <>
                      <th>{t("exposure.colWeek", "Week Starting")}</th>
                      <th>{t("exposure.colAvg", "Avg AQI")}</th>
                      <th>{t("exposure.colPeak", "Peak")}</th>
                      <th>{t("exposure.colHours", "Hours")}</th>
                      <th>{t("exposure.colScore", "Total Exposure")}</th>
                      <th>{t("exposure.colRisk", "Risk")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === "daily" ? (
                  dailySummaries.length > 0 ? (
                    [...dailySummaries].reverse().map((d) => {
                      const risk = getRiskMeta(d.riskLevel);
                      const riskCls = d.riskLevel === "low" ? styles.riskLow
                        : d.riskLevel === "moderate" ? styles.riskModerate
                        : d.riskLevel === "high" ? styles.riskHigh
                        : styles.riskCritical;
                      return (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td style={{ fontWeight: 600 }}>{d.avgAqi}</td>
                          <td>{d.maxAqi}</td>
                          <td>{d.minAqi}</td>
                          <td>{d.hours}</td>
                          <td>{d.exposureScore}</td>
                          <td className={riskCls}>{risk.emoji} {risk.label}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary, #94a3b8)" }}>
                      {t("exposure.noDailyData", "No daily data available yet")}
                    </td></tr>
                  )
                ) : (
                  weeklySummaries.length > 0 ? (
                    [...weeklySummaries].reverse().map((w) => {
                      const risk = getRiskMeta(w.riskLevel);
                      const riskCls = w.riskLevel === "low" ? styles.riskLow
                        : w.riskLevel === "moderate" ? styles.riskModerate
                        : w.riskLevel === "high" ? styles.riskHigh
                        : styles.riskCritical;
                      return (
                        <tr key={w.weekStart}>
                          <td>{w.weekStart}</td>
                          <td style={{ fontWeight: 600 }}>{w.avgAqi}</td>
                          <td>{w.maxAqi}</td>
                          <td>{w.totalHours}</td>
                          <td>{w.exposureScore}</td>
                          <td className={riskCls}>{risk.emoji} {risk.label}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary, #94a3b8)" }}>
                      {t("exposure.noWeeklyData", "No weekly data available yet")}
                    </td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className={styles.section} data-testid="recommendations">
            <h3 className={styles.sectionTitle}>💡 {t("exposure.recommendations", "Exposure Recommendations")}</h3>
            <ul className={styles.recList}>
              {recommendations.map((rec, idx) => (
                <RecItem key={`${rec.title}-${idx}`} rec={rec} />
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actionsBar} data-testid="actions-bar">
          <button type="button" className={styles.actionBtn} onClick={handleExportCSV} data-testid="export-btn">
            📄 {t("exposure.exportCSV", "Export CSV")}
          </button>
          <button type="button" className={styles.actionBtn} onClick={handleCopySummary} data-testid="copy-btn">
            📋 {t("exposure.copySummary", "Copy Summary")}
          </button>
          <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleClearHistory} data-testid="clear-btn">
            🗑️ {t("exposure.clearHistory", "Clear History")}
          </button>
        </div>

        {/* Toast */}
        <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ""}`} role="status" aria-live="polite">
          {toastMessage}
        </div>
      </div>
    </section>
  );
}
