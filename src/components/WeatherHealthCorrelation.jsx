import { useState, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useSWR } from "../hooks/useSWR";
import { fetchHourlyWeather } from "../services/weatherService";
import {
  WEATHER_VARIABLES,
  POLLUTANT_VARIABLES,
  AQI_VARIABLES,
  alignDatasets,
  computeCorrelationMatrix,
  prepareScatterData,
  prepareDualAxisData,
  computeAqiBandBreakdown,
  generateInsights,
  pearsonCorrelation,
  mean,
  aqiColor,
  aqiBandLabel,
  classifyCorrelation,
  MIN_CORRELATION_OBSERVATIONS,
} from "../services/weatherCorrelationService";
import styles from "./WeatherHealthCorrelation.module.css";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const InsightItem = memo(function InsightItem({ insight }) {
  const className = [
    styles.insightItem,
    insight.severity === "high" ? styles.insightItemHigh : "",
    insight.severity === "medium" ? styles.insightItemMedium : "",
    insight.severity === "insight" ? styles.insightItemInsight : "",
    insight.severity === "insufficient" ? styles.insightItemInsufficient : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className}>
      <span className={styles.insightIcon} aria-hidden="true">
        {insight.icon}
      </span>
      <div className={styles.insightContent}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <p className={styles.insightTitle}>{insight.title}</p>
          <span
            className={`${styles.severityBadge} ${
              insight.severity === "high"
                ? styles.severityBadgeHigh
                : insight.severity === "medium"
                ? styles.severityBadgeMedium
                : insight.severity === "insufficient"
                ? styles.severityBadgeInsufficient
                : styles.severityBadgeLow
            }`}
          >
            {insight.severity.toUpperCase()}
          </span>
        </div>
        <p className={styles.insightDescription}>{insight.description}</p>
      </div>
    </li>
  );
});
InsightItem.displayName = "InsightItem";

function ScatterTooltipContent({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className={styles.scatterTooltip}>
      <p className={styles.scatterTooltipValue}>
        Pollutant: {data.y}
      </p>
      <p className={styles.scatterTooltipValue}>
        Weather: {data.x}
      </p>
      {data.time && (
        <p className={styles.scatterTooltipTime}>
          {new Date(data.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

function DualAxisTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.scatterTooltip}>
      <p className={styles.scatterTooltipTime}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className={styles.scatterTooltipValue} style={{ color: entry.color }}>
          {entry.name}: {entry.value != null ? Number(entry.value).toFixed(1) : "—"}
        </p>
      ))}
    </div>
  );
}

function computeDataQuality(alignedData, weatherKey, pollutantKey) {
  if (!alignedData || alignedData.length === 0) return { count: 0, percent: 0, quality: "none" };
  const validPairs = alignedData.filter(
    (d) =>
      typeof d[weatherKey] === "number" &&
      Number.isFinite(d[weatherKey]) &&
      typeof d[pollutantKey] === "number" &&
      Number.isFinite(d[pollutantKey]),
  );
  const percent = Math.round((validPairs.length / alignedData.length) * 100);
  const quality = percent >= 80 ? "high" : percent >= 50 ? "medium" : "low";
  return { count: validPairs.length, percent, quality };
}

// ---------------------------------------------------------------------------
// Main WeatherHealthCorrelation component
// ---------------------------------------------------------------------------

export default function WeatherHealthCorrelation({ lat, lon, trend, cityName = "Delhi" }) {
  const { t } = useTranslation();
  const [weatherVar, setWeatherVar] = useState("temperature");
  const [pollutantVar, setPollutantVar] = useState("pm2_5");
  const [showScatter, setShowScatter] = useState(true);

  // Fetch hourly weather data
  const weatherKey =
    lat && lon ? `weather_corr_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;
  const { data: weatherData, error: weatherError } = useSWR(
    weatherKey,
    () => fetchHourlyWeather(lat, lon),
    { ttl: 60 * 60 * 1000 },
  );

  // Align datasets by timestamp
  const alignedData = useMemo(
    () => alignDatasets(weatherData || [], trend || []),
    [weatherData, trend],
  );

  // Correlation matrix calculation
  const { matrix } = useMemo(
    () => computeCorrelationMatrix(alignedData),
    [alignedData],
  );

  // Derived severity-rated insights
  const insights = useMemo(
    () => generateInsights(matrix, alignedData.length),
    [matrix, alignedData.length],
  );

  // Scatter & Dual Axis Data
  const scatterData = useMemo(
    () => prepareScatterData(alignedData, weatherVar, pollutantVar),
    [alignedData, weatherVar, pollutantVar],
  );

  const dualData = useMemo(
    () => prepareDualAxisData(alignedData, weatherVar, pollutantVar),
    [alignedData, weatherVar, pollutantVar],
  );

  // Variable Definitions
  const weatherVarDef = WEATHER_VARIABLES.find((v) => v.key === weatherVar) || WEATHER_VARIABLES[0];
  const pollutantVarDef = AQI_VARIABLES.find((v) => v.key === pollutantVar) || POLLUTANT_VARIABLES[0];

  // Averages for KPI Cards
  const avgAqi = useMemo(() => {
    const vals = alignedData.map((d) => d.us_aqi).filter((v) => typeof v === "number" && Number.isFinite(v));
    return mean(vals);
  }, [alignedData]);

  const avgTemp = useMemo(() => {
    const vals = alignedData.map((d) => d.temperature).filter((v) => typeof v === "number" && Number.isFinite(v));
    return mean(vals);
  }, [alignedData]);

  const avgHumidity = useMemo(() => {
    const vals = alignedData.map((d) => d.humidity).filter((v) => typeof v === "number" && Number.isFinite(v));
    return mean(vals);
  }, [alignedData]);

  const avgWindSpeed = useMemo(() => {
    const vals = alignedData.map((d) => d.windSpeed).filter((v) => typeof v === "number" && Number.isFinite(v));
    return mean(vals);
  }, [alignedData]);

  // Selected Pair Correlation Coefficient
  const currentCorrelation = useMemo(() => {
    const xVals = alignedData.map((d) => d[weatherVar]);
    const yVals = alignedData.map((d) => d[pollutantVar]);
    return pearsonCorrelation(xVals, yVals);
  }, [alignedData, weatherVar, pollutantVar]);

  const correlationStrength = classifyCorrelation(currentCorrelation);

  const dataQuality = useMemo(
    () => computeDataQuality(alignedData, weatherVar, pollutantVar),
    [alignedData, weatherVar, pollutantVar],
  );

  const handleWeatherChange = useCallback((e) => setWeatherVar(e.target.value), []);
  const handlePollutantChange = useCallback((e) => setPollutantVar(e.target.value), []);
  const toggleScatter = useCallback(() => setShowScatter((prev) => !prev), []);

  // --- Error state ---
  if (weatherError && (!weatherData || weatherData.length === 0)) {
    return (
      <section data-testid="weather-health-correlation" className="panel">
        <div className={styles.correlationRoot}>
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>
              🌤️ {t("weatherCorrelation.title", "Weather–Health Correlation")}
            </h2>
            <p className={styles.headerSubtitle}>
              {t("weatherCorrelation.subtitle", {
                defaultValue: `Analyzing how weather conditions affect air quality health risks in ${cityName}`,
                city: cityName,
              })}
            </p>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <p className={styles.emptyTitle}>
              {t("weatherCorrelation.weatherUnavailable", "Weather data unavailable")}
            </p>
            <p className={styles.emptyDescription}>
              {t("weatherCorrelation.weatherUnavailableDesc", {
                defaultValue: "Could not retrieve weather forecast data. Set VITE_OPENWEATHER_API_KEY in your .env file to enable this feature.",
              })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // --- Empty state ---
  if (alignedData.length === 0) {
    return (
      <section data-testid="weather-health-correlation" className="panel">
        <div className={styles.correlationRoot}>
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>
              🌤️ {t("weatherCorrelation.title", "Weather–Health Correlation")}
            </h2>
            <p className={styles.headerSubtitle}>
              {t("weatherCorrelation.subtitle", {
                defaultValue: `Analyzing how weather conditions affect air quality health risks in ${cityName}`,
                city: cityName,
              })}
            </p>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📡</div>
            <p className={styles.emptyTitle}>
              {t("weatherCorrelation.collecting", "Collecting data points…")}
            </p>
            <p className={styles.emptyDescription}>
              {t("weatherCorrelation.collectingDesc", {
                defaultValue: "Weather and AQI data are being gathered. Correlations will appear once enough overlapping readings are available.",
              })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="weather-health-correlation" className="panel">
      <div className={styles.correlationRoot}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            🌤️ {t("weatherCorrelation.title", "Weather–Health Correlation Analytics")}
          </h2>
          <p className={styles.headerSubtitle}>
            {t("weatherCorrelation.subtitle", {
              defaultValue: `Analyzing how weather conditions affect air quality health risks in ${cityName}`,
              city: cityName,
            })}
          </p>
        </div>

        {/* Controls Bar */}
        <div className={styles.controlBar} role="toolbar" aria-label="Correlation settings">
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="weather-var-select">
              {t("weatherCorrelation.weatherVar", "Weather Variable")}
              <select
                id="weather-var-select"
                className={styles.controlSelect}
                value={weatherVar}
                onChange={handleWeatherChange}
                style={{ display: "block", marginTop: "0.25rem" }}
              >
                {WEATHER_VARIABLES.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.icon} {v.label} ({v.unit})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="pollutant-var-select">
              {t("weatherCorrelation.pollutantVar", "Pollutant / AQI Metric")}
              <select
                id="pollutant-var-select"
                className={styles.controlSelect}
                value={pollutantVar}
                onChange={handlePollutantChange}
                style={{ display: "block", marginTop: "0.25rem" }}
              >
                {AQI_VARIABLES.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.icon} {v.label} {v.unit ? `(${v.unit})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel} style={{ display: "block", marginBottom: "0.25rem" }}>
              {t("weatherCorrelation.view", "View Mode")}
            </span>
            <button
              type="button"
              className={styles.controlSelect}
              onClick={toggleScatter}
              style={{ cursor: "pointer", textAlign: "center" }}
            >
              {showScatter
                ? "📈 " + t("weatherCorrelation.showTrend", "Show Dual-Axis Trend")
                : "📊 " + t("weatherCorrelation.showScatter", "Show Scatter Plot")}
            </button>
          </div>
        </div>

        {/* Data quality badge */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span
            className={`${styles.qualityBadge} ${
              dataQuality.quality === "low" ? styles.qualityBadgeLow : ""
            }`}
            data-testid="data-quality-badge"
          >
            📊 {dataQuality.count} aligned observation pairs ({dataQuality.percent}% match rate)
          </span>
        </div>

        {/* Key Summary Stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              📊
            </span>
            <span className={styles.statValue} style={{ color: aqiColor(avgAqi) }}>
              {Math.round(avgAqi)}
            </span>
            <span className={styles.statLabel}>
              {t("weatherCorrelation.avgAqi", "Avg AQI")} ({aqiBandLabel(avgAqi)})
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              🌡️
            </span>
            <span className={styles.statValue}>{avgTemp.toFixed(1)}°C</span>
            <span className={styles.statLabel}>
              {t("weatherCorrelation.avgTemp", "Avg Temperature")}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              💧
            </span>
            <span className={styles.statValue}>{avgHumidity.toFixed(0)}%</span>
            <span className={styles.statLabel}>
              {t("weatherCorrelation.avgHumidity", "Avg Humidity")}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              🌬️
            </span>
            <span className={styles.statValue}>{avgWindSpeed.toFixed(1)} m/s</span>
            <span className={styles.statLabel}>
              {t("weatherCorrelation.avgWind", "Avg Wind Speed")}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true" style={{ fontSize: "1rem" }}>
              {correlationStrength.emoji}
            </span>
            <span className={styles.statValue} style={{ color: correlationStrength.color }}>
              {currentCorrelation !== null ? (currentCorrelation >= 0 ? `+${currentCorrelation.toFixed(2)}` : currentCorrelation.toFixed(2)) : "N/A"}
            </span>
            <span className={styles.statLabel}>
              {weatherVarDef?.label} ↔ {pollutantVarDef?.label}
            </span>
          </div>
        </div>

        {/* Interactive 15-Pair Correlation Matrix */}
        <div className={styles.matrixSection} data-testid="correlation-matrix">
          <h3 className={styles.sectionTitle}>
            🔬 {t("weatherCorrelation.matrixTitle", "Weather–Pollutant Correlation Matrix")}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.matrixTable} aria-label="15 Weather-Pollutant correlation matrix">
              <thead>
                <tr>
                  <th scope="col">
                    {t("weatherCorrelation.weatherFactors", "Weather ↓ / Pollutant →")}
                  </th>
                  {POLLUTANT_VARIABLES.map((v) => (
                    <th key={v.key} scope="col">
                      {v.icon} {v.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEATHER_VARIABLES.map((wv, wi) => (
                  <tr key={wv.key}>
                    <th scope="row">
                      {wv.icon} {wv.label}
                    </th>
                    {POLLUTANT_VARIABLES.map((pv, pi) => {
                      const cell = matrix[wi]?.[pi];
                      if (!cell || cell.r === null || cell.unavailable) {
                        return (
                          <td key={pv.key}>
                            <span className={styles.matrixCellUnavailable} title={`${wv.label} ↔ ${pv.label}: Insufficient Data`}>
                              N/A
                            </span>
                          </td>
                        );
                      }
                      const r = cell.r;
                      const bg =
                        r > 0
                          ? `rgba(239, 68, 68, ${Math.min(Math.abs(r) * 0.65, 0.75)})`
                          : `rgba(59, 130, 246, ${Math.min(Math.abs(r) * 0.65, 0.75)})`;
                      const formattedVal = r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
                      return (
                        <td key={pv.key}>
                          <span
                            className={styles.matrixCell}
                            style={{
                              background: bg,
                              color: Math.abs(r) > 0.35 ? "#fff" : "inherit",
                            }}
                            title={`${wv.label} ↔ ${pv.label}: r = ${formattedVal} (${cell.label}, n=${cell.count})`}
                            data-testid="matrix-cell"
                            aria-label={`${wv.label} vs ${pv.label}: r = ${formattedVal}, ${cell.label} correlation with ${cell.count} observations`}
                          >
                            {formattedVal}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color Scale Legend */}
          <div className={styles.legendBar} role="img" aria-label="Correlation color scale legend">
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "rgba(239, 68, 68, 0.7)" }} />
              {t("weatherCorrelation.positiveCorr", "Positive (+0.2 to +1.0)")}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#f1f5f9" }} />
              {t("weatherCorrelation.nearZeroCorr", "Near Zero (-0.2 to +0.2)")}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "rgba(59, 130, 246, 0.7)" }} />
              {t("weatherCorrelation.negativeCorr", "Negative (-1.0 to -0.2)")}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#cbd5e1" }} />
              {t("weatherCorrelation.unavailableCorr", "N/A (n < 3)")}
            </span>
          </div>
        </div>

        {/* Visualizations Grid */}
        <div className={styles.chartsGrid} data-testid="charts-area">
          {/* Scatter Plot / Dual Axis Trend */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              {showScatter
                ? `📊 Scatter Plot: ${weatherVarDef?.label} vs ${pollutantVarDef?.label}`
                : `📈 Dual-Axis Trend: ${weatherVarDef?.label} & ${pollutantVarDef?.label}`}
            </h3>
            <div className={styles.chartContainer}>
              {showScatter ? (
                scatterData.length >= MIN_CORRELATION_OBSERVATIONS ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 15, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={weatherVarDef?.label}
                        unit={weatherVarDef?.unit ? ` ${weatherVarDef.unit}` : ""}
                        fontSize={11}
                        tick={{ fill: "var(--text-secondary, #64748b)" }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={pollutantVarDef?.label}
                        unit={pollutantVarDef?.unit ? ` ${pollutantVarDef.unit}` : ""}
                        fontSize={11}
                        tick={{ fill: "var(--text-secondary, #64748b)" }}
                      />
                      <Tooltip content={<ScatterTooltipContent />} />
                      <Scatter
                        data={scatterData}
                        fill={aqiColor(avgAqi)}
                        fillOpacity={0.7}
                        stroke={aqiColor(avgAqi)}
                        strokeWidth={1}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyChartMessage}>
                    ⚠️ Insufficient paired observations to render scatter plot (n = {scatterData.length}, required n ≥ 3).
                  </div>
                )
              ) : dualData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dualData} margin={{ top: 10, right: 40, bottom: 15, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="timeLabel"
                      fontSize={10}
                      tick={{ fill: "var(--text-secondary, #64748b)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="weather"
                      orientation="left"
                      fontSize={10}
                      tick={{ fill: "#0d9488" }}
                      label={{
                        value: `${weatherVarDef?.label} (${weatherVarDef?.unit || ""})`,
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 10,
                        fill: "#0d9488",
                      }}
                    />
                    <YAxis
                      yAxisId="pollutant"
                      orientation="right"
                      fontSize={10}
                      tick={{ fill: "#ef4444" }}
                      label={{
                        value: `${pollutantVarDef?.label} (${pollutantVarDef?.unit || ""})`,
                        angle: 90,
                        position: "insideRight",
                        fontSize: 10,
                        fill: "#ef4444",
                      }}
                    />
                    <Tooltip content={<DualAxisTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "0.75rem" }}
                      formatter={(value) => (
                        <span style={{ color: "var(--text-secondary, #475569)" }}>{value}</span>
                      )}
                    />
                    <Line
                      yAxisId="weather"
                      type="monotone"
                      dataKey="weather"
                      name={`${weatherVarDef?.label} (${weatherVarDef?.unit})`}
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#0d9488" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="pollutant"
                      type="monotone"
                      dataKey="pollutant"
                      name={`${pollutantVarDef?.label} (${pollutantVarDef?.unit})`}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#ef4444" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChartMessage}>
                  ⚠️ No trend data available for selected metrics.
                </div>
              )}
            </div>
          </div>

          {/* AQI-Band Breakdown Chart */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              🌡️ {weatherVarDef?.label} Distribution by Authoritative AQI Band
            </h3>
            <div className={styles.chartContainer}>
              <BarChartByBand
                alignedData={alignedData}
                weatherKey={weatherVar}
                weatherLabel={weatherVarDef?.label || ""}
                weatherUnit={weatherVarDef?.unit || ""}
              />
            </div>
            <p className={styles.causationDisclaimer}>
              * Observational summary: Observed differences show associations across AQI bands, but do not prove direct environmental causation.
            </p>
          </div>
        </div>

        {/* Severity-Rated Insights */}
        {insights.length > 0 && (
          <div className={styles.insightsSection} data-testid="insights-section">
            <h3 className={styles.sectionTitle}>
              💡 {t("weatherCorrelation.insightsTitle", "Severity-Rated Weather–Pollution Insights")}
            </h3>
            <ul className={styles.insightsList}>
              {insights.map((insight, idx) => (
                <InsightItem key={`${insight.title}-${idx}`} insight={insight} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bar chart component showing weather metric per AQI band
// ---------------------------------------------------------------------------

function BarChartByBand({ alignedData, weatherKey, weatherLabel, weatherUnit }) {
  const { t } = useTranslation();
  const bandData = useMemo(
    () => computeAqiBandBreakdown(alignedData, weatherKey),
    [alignedData, weatherKey]
  );

  if (bandData.length === 0) {
    return (
      <div className={styles.emptyChartMessage}>
        {t("weatherCorrelation.noBandData", { defaultValue: "No data available for AQI band breakdown" })}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bandData} margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis
          dataKey="name"
          fontSize={9}
          tick={{ fill: "var(--text-secondary, #64748b)" }}
          interval={0}
        />
        <YAxis
          fontSize={10}
          tick={{ fill: "var(--text-secondary, #64748b)" }}
          label={{
            value: `${weatherLabel} (${weatherUnit})`,
            angle: -90,
            position: "insideLeft",
            fontSize: 10,
            fill: "var(--text-secondary, #64748b)",
          }}
        />
        <Tooltip
          formatter={(value, name, item) => [
            `${Number(value).toFixed(1)} ${weatherUnit} (n=${item?.payload?.count || 0})`,
            weatherLabel,
          ]}
          contentStyle={{
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {bandData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
