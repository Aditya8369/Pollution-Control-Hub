import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  trendToCSV,
  trendToJSON,
  generateTextReport,
  generateShareableLink,
  triggerDownload,
  copyToClipboard,
  computeSummaryStats,
} from "../services/dataExportService";
import styles from "./DataExportDashboard.module.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPORT_FORMATS = [
  {
    id: "csv",
    icon: "📄",
    title: "CSV Spreadsheet",
    desc: "Download trend data as a CSV file compatible with Excel, Google Sheets, or any data tool.",
    ext: ".csv",
    mime: "text/csv",
  },
  {
    id: "json",
    icon: "🔧",
    title: "JSON Data",
    desc: "Structured JSON export with metadata — ideal for APIs, dashboards, or further processing.",
    ext: ".json",
    mime: "application/json",
  },
  {
    id: "text",
    icon: "📋",
    title: "Text Report",
    desc: "Human-readable report with health guidance. Copy to clipboard or download as .txt.",
    ext: ".txt",
    mime: "text/plain",
  },
];

const TIME_RANGES = [
  { label: "Last 6h", hours: 6 },
  { label: "Last 12h", hours: 12 },
  { label: "Last 24h", hours: 24 },
  { label: "All Data", hours: Infinity },
];

// ---------------------------------------------------------------------------
// AQI band helpers
// ---------------------------------------------------------------------------

function aqiClassName(aqi) {
  if (aqi == null) return "";
  if (aqi <= 50) return styles.aqiGood;
  if (aqi <= 100) return styles.aqiModerate;
  if (aqi <= 150) return styles.aqiUSG;
  if (aqi <= 200) return styles.aqiUnhealthy;
  if (aqi <= 300) return styles.aqiVeryUnhealthy;
  return styles.aqiHazardous;
}

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

const ExportCard = memo(function ExportCard({ format, onExport }) {
  const handleClick = useCallback(() => onExport(format.id), [format.id, onExport]);
  return (
    <button
      type="button"
      className={styles.exportCard}
      onClick={handleClick}
      data-testid={`export-${format.id}`}
      aria-label={`Export as ${format.title}`}
    >
      <span className={styles.exportIcon} aria-hidden="true">{format.icon}</span>
      <p className={styles.exportTitle}>{format.title}</p>
      <p className={styles.exportDesc}>{format.desc}</p>
    </button>
  );
});

function MiniTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "var(--bg-card, #fff)",
      border: "1px solid var(--border-color, #e2e8f0)",
      borderRadius: "0.5rem",
      padding: "0.5rem 0.75rem",
      fontSize: "0.78rem",
      boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
      maxWidth: 200,
    }}>
      <div style={{ fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>AQI: {d.us_aqi ?? "—"}</div>
      <div style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.7rem" }}>
        {d.time ? new Date(d.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DataExportDashboard({ trend, current, cityName, position }) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState(24);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter trend by time range
  const filteredTrend = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0) return [];
    if (timeRange === Infinity) return trend;
    const cutoff = Date.now() - timeRange * 60 * 60 * 1000;
    return trend.filter((p) => {
      if (!p?.time) return false;
      try { return new Date(p.time).getTime() >= cutoff; } catch { return false; }
    });
  }, [trend, timeRange]);

  // Summary stats
  const stats = useMemo(() => computeSummaryStats(filteredTrend), [filteredTrend]);

  // Mini chart data
  const chartData = useMemo(() =>
    filteredTrend
      .filter((d) => d?.time && typeof d.us_aqi === "number")
      .map((d) => ({
        time: d.time,
        us_aqi: d.us_aqi,
        pm2_5: d.pm2_5,
      })),
    [filteredTrend],
  );

  // Shareable link
  const shareableLink = useMemo(() =>
    generateShareableLink(cityName, position?.lat, position?.lon),
    [cityName, position],
  );

  // Toast helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }, []);

  // Export handlers
  const handleExport = useCallback((formatId) => {
    const safeCityName = (cityName || "unknown").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const ts = new Date().toISOString().slice(0, 10);
    const fmt = EXPORT_FORMATS.find((f) => f.id === formatId);

    switch (formatId) {
      case "csv": {
        const csv = trendToCSV(filteredTrend, cityName);
        triggerDownload(csv, `${safeCityName}-aqi-${ts}${fmt.ext}`, fmt.mime);
        showToast(t("export.downloadedCSV", "CSV downloaded!"));
        break;
      }
      case "json": {
        const json = trendToJSON(filteredTrend, cityName, position);
        triggerDownload(json, `${safeCityName}-aqi-${ts}${fmt.ext}`, fmt.mime);
        showToast(t("export.downloadedJSON", "JSON downloaded!"));
        break;
      }
      case "text": {
        setShowReportModal(true);
        break;
      }
      default:
        break;
    }
  }, [filteredTrend, cityName, position, t, showToast]);

  const handleCopyTextReport = useCallback(async () => {
    const report = generateTextReport(current, cityName, position);
    const ok = await copyToClipboard(report);
    showToast(ok ? t("export.copiedReport", "Report copied to clipboard!") : t("export.copyFailed", "Copy failed"));
    setShowReportModal(false);
  }, [current, cityName, position, t, showToast]);

  const handleDownloadTextReport = useCallback(() => {
    const report = generateTextReport(current, cityName, position);
    const safeCityName = (cityName || "unknown").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    triggerDownload(report, `${safeCityName}-report-${new Date().toISOString().slice(0, 10)}.txt`, "text/plain");
    showToast(t("export.downloadedReport", "Report downloaded!"));
    setShowReportModal(false);
  }, [current, cityName, position, t, showToast]);

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(shareableLink);
    setCopiedLink(true);
    showToast(ok ? t("export.linkCopied", "Link copied!") : t("export.copyFailed", "Copy failed"));
    setTimeout(() => setCopiedLink(false), 2000);
  }, [shareableLink, t, showToast]);

  // Escape key closes modal
  useEffect(() => {
    if (!showReportModal) return;
    const handler = (e) => { if (e.key === "Escape") setShowReportModal(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showReportModal]);

  const textReport = useMemo(
    () => generateTextReport(current, cityName, position),
    [current, cityName, position],
  );

  // --- Empty state ---
  if (!current || !Array.isArray(trend) || trend.length === 0) {
    return (
      <section data-testid="data-export-dashboard" className="panel">
        <div className={styles.root}>
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>📥 {t("export.title", "Data Export & Reports")}</h2>
            <p className={styles.headerSubtitle}>{t("export.subtitle", "Download, share, and export your air quality data")}</p>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <p className={styles.emptyTitle}>{t("export.noData", "No data to export")}</p>
            <p className={styles.emptyDesc}>{t("export.noDataDesc", "Once AQI data is available for your selected city, you can export it here.")}</p>
          </div>
        </div>
      </section>
    );
  }

  const reportText = generateTextReport(current, cityName, position);

  return (
    <section data-testid="data-export-dashboard" className="panel">
      <div className={styles.root}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>📥 {t("export.title", "Data Export & Reports")}</h2>
          <p className={styles.headerSubtitle}>
            {t("export.subtitleCity", "Download, share, and export air quality data for {{city}}", { city: cityName })}
          </p>
        </div>

        {/* Summary Stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <StatCard icon="📊" value={stats.count} label={t("export.dataPoints", "Data Points")} />
          <StatCard icon="🌡️" value={Math.round(stats.avgAqi)} label={t("export.avgAqi", "Avg AQI")} color="#0d9488" />
          <StatCard icon="⬆️" value={Math.round(stats.maxAqi)} label={t("export.peakAqi", "Peak AQI")} color="#ef4444" />
          <StatCard icon="⬇️" value={Math.round(stats.minAqi)} label={t("export.lowAqi", "Lowest AQI")} color="#22c55e" />
          <StatCard icon="🔬" value={stats.avgPm25.toFixed(1)} label="Avg PM2.5" />
          <StatCard icon="🌫️" value={stats.avgPm10.toFixed(1)} label="Avg PM10" />
        </div>

        {/* Mini Chart */}
        {chartData.length > 2 && (
          <div className={styles.previewSection}>
            <h3 className={styles.sectionTitle}>📈 {t("export.trendPreview", "Trend Preview")}</h3>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis
                    dataKey="time"
                    fontSize={9}
                    tick={{ fill: "var(--text-secondary, #94a3b8)" }}
                    tickFormatter={(v) => { try { return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } }}
                    interval="preserveStartEnd"
                  />
                  <YAxis fontSize={9} tick={{ fill: "var(--text-secondary, #94a3b8)" }} />
                  <Tooltip content={<MiniTooltip />} />
                  <Line type="monotone" dataKey="us_aqi" stroke="#0d9488" strokeWidth={2} dot={false} name="AQI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filter + Data Preview */}
        <div className={styles.previewSection} data-testid="data-preview">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>📋 {t("export.dataPreview", "Data Preview")}</h3>
            <div className={styles.filterBar}>
              <span className={styles.filterLabel}>{t("export.timeRange", "Range:")}</span>
              <select
                className={styles.filterSelect}
                value={timeRange === Infinity ? "all" : timeRange}
                onChange={(e) => setTimeRange(e.target.value === "all" ? Infinity : Number(e.target.value))}
                data-testid="time-range-select"
              >
                {TIME_RANGES.map((r) => (
                  <option key={r.label} value={r.hours === Infinity ? "all" : r.hours}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.tableScroll} style={{ marginTop: "0.75rem", maxHeight: 320, overflowY: "auto" }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t("export.colTime", "Time")}</th>
                  <th>US AQI</th>
                  <th>PM2.5</th>
                  <th>PM10</th>
                  <th>NO₂</th>
                  <th>O₃</th>
                  <th>CO</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrend.map((point, idx) => (
                  <tr key={idx}>
                    <td>{point.time ? new Date(point.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className={aqiClassName(point.us_aqi)}>{point.us_aqi ?? "—"}</td>
                    <td>{point.pm2_5 ?? "—"}</td>
                    <td>{point.pm10 ?? "—"}</td>
                    <td>{point.nitrogen_dioxide ?? "—"}</td>
                    <td>{point.ozone ?? "—"}</td>
                    <td>{point.carbon_monoxide ?? "—"}</td>
                  </tr>
                ))}
                {filteredTrend.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary, #94a3b8)" }}>
                    {t("export.noRowsInRange", "No data in selected time range")}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-secondary, #94a3b8)", marginTop: "0.5rem", textAlign: "right" }}>
            {filteredTrend.length} {t("export.of", "of")} {trend.length} {t("export.rowsShown", "rows shown")}
          </p>
        </div>

        {/* Export Actions */}
        <div>
          <h3 className={styles.sectionTitle}>🚀 {t("export.exportActions", "Export Options")}</h3>
          <div className={styles.exportGrid}>
            {EXPORT_FORMATS.map((fmt) => (
              <ExportCard key={fmt.id} format={fmt} onExport={handleExport} />
            ))}
          </div>
        </div>

        {/* Shareable Link */}
        <div className={styles.linkSection} data-testid="shareable-link-section">
          <h3 className={styles.sectionTitle}>🔗 {t("export.shareLink", "Shareable Link")}</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary, #64748b)", margin: "0 0 0.5rem" }}>
            {t("export.shareLinkDesc", "Share this link so others can view the same city's air quality data.")}
          </p>
          <div className={styles.linkRow}>
            <input
              type="text"
              className={styles.linkInput}
              value={shareableLink}
              readOnly
              aria-label="Shareable link"
              data-testid="shareable-link-input"
            />
            <button
              type="button"
              className={`${styles.copyBtn} ${copiedLink ? styles.copyBtnSuccess : ""}`}
              onClick={handleCopyLink}
              data-testid="copy-link-btn"
            >
              {copiedLink ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Text Report Preview Modal */}
        {showReportModal && (
          <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }} role="dialog" aria-modal="true" aria-label="Text Report">
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>📋 {t("export.reportPreview", "Report Preview")}</h3>
                <button type="button" className={styles.modalClose} onClick={() => setShowReportModal(false)} aria-label="Close">✕</button>
              </div>
              <div className={styles.modalBody}>
                <pre className={styles.reportPreview} data-testid="report-preview">{reportText}</pre>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.copyBtn} onClick={handleCopyTextReport} data-testid="copy-report-btn">
                  📋 {t("export.copyToClipboard", "Copy to Clipboard")}
                </button>
                <button type="button" className={styles.copyBtn} onClick={handleDownloadTextReport} data-testid="download-report-btn">
                  📥 {t("export.downloadTxt", "Download .txt")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ""}`} role="status" aria-live="polite">
          {toastMessage}
        </div>
      </div>
    </section>
  );
}
