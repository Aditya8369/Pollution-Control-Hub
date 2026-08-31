import { useState, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useSWR } from "../hooks/useSWR";
import { fetchCityComparisons } from "../services/airQualityService";
import {
  rankCities,
  getAQIBand,
  categoriseByRisk,
  comparePollutants,
  comparisonToCSV,
  generateComparisonSummary,
} from "../services/cityComparisonReportService";
import { triggerDownload, copyToClipboard } from "../services/dataExportService";
import styles from "./CityComparisonReport.module.css";

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

const RankingItem = memo(function RankingItem({ city }) {
  const rankEmoji = city.rank === 1 ? "🥇" : city.rank === 2 ? "🥈" : city.rank === 3 ? "🥉" : `#${city.rank}`;
  return (
    <div className={styles.rankingItem} data-rank={city.rank} data-testid="ranking-item">
      <span className={styles.rankBadge}>{rankEmoji}</span>
      <span className={styles.cityName}>{city.name}</span>
      <span className={styles.aqiValue} style={{ color: city.band?.color }}>
        {city.aqi}
      </span>
      <span
        className={styles.bandBadge}
        style={{ background: `${city.band?.color}20`, color: city.band?.color }}
      >
        {city.band?.label}
      </span>
    </div>
  );
});

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
      <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value ?? "—"}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CityComparisonReport({ savedLocations, cityName }) {
  const { t } = useTranslation();
  const [toastMessage, setToastMessage] = useState("");

  // Fetch AQI data for all saved cities + current city
  const allCities = useMemo(() => {
    const cities = [{ name: cityName, isCurrent: true }];
    for (const loc of savedLocations || []) {
      if (loc.name !== cityName) {
        cities.push({ name: loc.name, lat: loc.lat, lon: loc.lon });
      }
    }
    return cities;
  }, [savedLocations, cityName]);

  // Fetch AQI for each saved city using SWR
  const cityDataResults = useMemo(() => {
    return allCities.map((city) => {
      const key = city.lat && city.lon ? `aqi_${city.lat}_${city.lon}` : null;
      return { ...city, swrKey: key };
    });
  }, [allCities]);

  // We use a single SWR call for comparisons
  const { data: cityComparisons } = useSWR("city_comparisons", () => fetchCityComparisons());

  // Merge fetched comparison data with saved locations
  const mergedCities = useMemo(() => {
    const result = [];

    for (const city of allCities) {
      // Try to find in cityComparisons
      const match = (cityComparisons || []).find(
        (c) => c.name?.toLowerCase() === city.name.toLowerCase(),
      );

      if (match && !match.unavailable && match.aqi != null) {
        result.push({
          name: city.name,
          aqi: match.aqi,
          pm2_5: match.pm2_5 ?? null,
          pm10: match.pm10 ?? null,
          no2: match.nitrogen_dioxide ?? null,
          o3: match.ozone ?? null,
          co: match.carbon_monoxide ?? null,
        });
      } else {
        result.push({
          name: city.name,
          aqi: null,
          pm2_5: null,
          pm10: null,
          no2: null,
          o3: null,
          co: null,
        });
      }
    }

    return result;
  }, [allCities, cityComparisons]);

  // Ranked cities
  const rankedCities = useMemo(() => rankCities(mergedCities), [mergedCities]);

  // Risk groups
  const riskGroups = useMemo(() => categoriseByRisk(mergedCities), [mergedCities]);

  // Pollutant comparison
  const pollutantData = useMemo(() => comparePollutants(mergedCities), [mergedCities]);

  // Chart data for AQI comparison
  const chartData = useMemo(() =>
    mergedCities
      .filter((c) => typeof c.aqi === "number")
      .map((c) => ({
        name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
        aqi: c.aqi,
        fill: getAQIBand(c.aqi).color,
      })),
    [mergedCities],
  );

  // Stats
  const validAqis = mergedCities.filter((c) => typeof c.aqi === "number").map((c) => c.aqi);
  const bestCity = rankedCities[0];
  const worstCity = rankedCities.length > 0 ? rankedCities[rankedCities.length - 1] : null;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = comparisonToCSV(rankedCities);
    triggerDownload(csv, `city-comparison-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    showToast(t("comparison.downloaded", "CSV downloaded!"));
  }, [rankedCities, t, showToast]);

  const handleCopyReport = useCallback(async () => {
    const report = generateComparisonSummary(rankedCities);
    const ok = await copyToClipboard(report);
    showToast(ok ? t("comparison.copied", "Report copied!") : t("comparison.copyFailed", "Copy failed"));
  }, [rankedCities, t, showToast]);

  // --- Empty state ---
  if (!savedLocations || savedLocations.length === 0) {
    return (
      <section data-testid="city-comparison-report" className="panel">
        <div className={styles.root}>
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>🏙️ {t("comparison.title", "City Comparison Report")}</h2>
            <p className={styles.headerSubtitle}>{t("comparison.subtitle", "Compare air quality across your saved cities")}</p>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📍</div>
            <p className={styles.emptyTitle}>{t("comparison.noCities", "No saved cities yet")}</p>
            <p className={styles.emptyDesc}>{t("comparison.noCitiesDesc", "Save locations from the dashboard controls to compare their air quality side by side.")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="city-comparison-report" className="panel">
      <div className={styles.root}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>🏙️ {t("comparison.title", "City Comparison Report")}</h2>
          <p className={styles.headerSubtitle}>
            {t("comparison.subtitleCount", "Comparing air quality across {{count}} cities", { count: mergedCities.length })}
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <StatCard icon="🏙️" value={mergedCities.length} label={t("comparison.cities", "Cities")} />
          <StatCard icon="🏆" value={bestCity?.name || "—"} label={t("comparison.cleanest", "Cleanest")} color="#22c55e" />
          <StatCard icon="⚠️" value={worstCity?.name || "—"} label={t("comparison.mostPolluted", "Most Polluted")} color="#ef4444" />
          {bestCity && worstCity && bestCity.aqi != null && worstCity.aqi != null && (
            <StatCard
              icon="📊"
              value={worstCity.aqi - bestCity.aqi}
              label={t("comparison.aqiGap", "AQI Gap")}
              color="#f59e0b"
            />
          )}
        </div>

        {/* AQI Chart */}
        {chartData.length > 1 && (
          <div className={styles.rankingSection}>
            <h3 className={styles.sectionTitle}>📊 {t("comparison.aqiChart", "AQI Comparison")}</h3>
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: "var(--text-secondary, #64748b)" }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis fontSize={10} tick={{ fill: "var(--text-secondary, #64748b)" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Bar dataKey="aqi" name="US AQI" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ranking */}
        <div className={styles.rankingSection} data-testid="ranking-section">
          <h3 className={styles.sectionTitle}>🏅 {t("comparison.rankings", "City Rankings")}</h3>
          <div className={styles.rankingList}>
            {rankedCities.map((city) => (
              <RankingItem key={city.name} city={city} />
            ))}
          </div>
        </div>

        {/* Pollutant Comparison */}
        {pollutantData.some((p) => p.readings.some((r) => typeof r.value === "number")) && (
          <div className={styles.pollutantSection} data-testid="pollutant-section">
            <h3 className={styles.sectionTitle}>🔬 {t("comparison.pollutantBreakdown", "Pollutant Breakdown")}</h3>
            <div style={{ overflowX: "auto" }}>
              <table className={styles.pollutantTable}>
                <thead>
                  <tr>
                    <th>{t("comparison.pollutant", "Pollutant")}</th>
                    <th>WHO Limit</th>
                    {mergedCities.map((c) => (
                      <th key={c.name}>{c.name.length > 10 ? c.name.slice(0, 10) + "…" : c.name}</th>
                    ))}
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {pollutantData.map((p) => (
                    <tr key={p.key}>
                      <td style={{ fontWeight: 600 }}>{p.pollutant} ({p.unit})</td>
                      <td>{p.whoLimit}</td>
                      {p.readings.map((r) => (
                        <td key={r.city} className={r.exceeds ? styles.exceeds : typeof r.value === "number" ? styles.within : ""}>
                          {r.value ?? "—"}
                        </td>
                      ))}
                      <td>{p.average.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Risk Groups */}
        <div className={styles.riskSection} data-testid="risk-section">
          <h3 className={styles.sectionTitle}>🛡️ {t("comparison.riskGroups", "Health Risk Groups")}</h3>
          <div className={styles.riskGrid}>
            <div className={`${styles.riskGroup} ${styles.riskSafe}`}>
              <p className={styles.riskGroupTitle}>✅ {t("comparison.safe", "Safe")} (AQI ≤ 100)</p>
              <p className={styles.riskGroupCities}>{riskGroups.safe.length > 0 ? riskGroups.safe.join(", ") : "—"}</p>
            </div>
            <div className={`${styles.riskGroup} ${styles.riskModerate}`}>
              <p className={styles.riskGroupTitle}>🟡 {t("comparison.moderateRisk", "Moderate")} (101–150)</p>
              <p className={styles.riskGroupCities}>{riskGroups.moderate.length > 0 ? riskGroups.moderate.join(", ") : "—"}</p>
            </div>
            <div className={`${styles.riskGroup} ${styles.riskUnhealthy}`}>
              <p className={styles.riskGroupTitle}>🟠 {t("comparison.unhealthyRisk", "Unhealthy")} (151–200)</p>
              <p className={styles.riskGroupCities}>{riskGroups.unhealthy.length > 0 ? riskGroups.unhealthy.join(", ") : "—"}</p>
            </div>
            <div className={`${styles.riskGroup} ${styles.riskCritical}`}>
              <p className={styles.riskGroupTitle}>🔴 {t("comparison.criticalRisk", "Critical")} (201+)</p>
              <p className={styles.riskGroupCities}>{riskGroups.critical.length > 0 ? riskGroups.critical.join(", ") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actionsBar} data-testid="actions-bar">
          <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleExportCSV} data-testid="export-csv-btn">
            📄 {t("comparison.exportCSV", "Export CSV")}
          </button>
          <button type="button" className={styles.actionBtn} onClick={handleCopyReport} data-testid="copy-report-btn">
            📋 {t("comparison.copyReport", "Copy Report")}
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
