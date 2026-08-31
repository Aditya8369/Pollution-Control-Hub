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
  ReferenceLine,
} from "recharts";
import { useSWR } from "../hooks/useSWR";
import { fetchHourlyWeather } from "../services/weatherService";
import {
  WEATHER_VARIABLES,
  AQI_VARIABLES,
  alignDatasets,
  computeCorrelationMatrix,
  prepareScatterData,
  prepareDualAxisData,
  generateInsights,
  pearsonCorrelation,
  mean,
  aqiColor,
  aqiBandLabel,
  classifyCorrelation,
} from "../services/weatherCorrelationService";
import styles from "./WeatherHealthCorrelation.module.css";

// ---------------------------------------------------------------------------
// Memoized sub-components
// ---------------------------------------------------------------------------

const InsightItem = memo(function InsightItem({ insight }) {
  const className = [
    styles.insightItem,
    insight.severity === "high" ? styles.insightItemHigh : "",
    insight.severity === "medium" ? styles.insightItemMedium : "",
    insight.severity === "insight" ? styles.insightItemInsight : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className} role="listitem">
      <span className={styles.insightIcon} aria-hidden="true">
        {insight.icon}
      </span>
      <div className={styles.insightContent}>
        <p className={styles.insightTitle}>{insight.title}</p>
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
        AQI: {data.y} ({aqiBandLabel(data.y)})
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
          {entry.name}: {entry.value != null ? entry.value.toFixed(1) : "—"}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data quality computation
// ---------------------------------------------------------------------------

function computeDataQuality(alignedData, weatherKey, aqiKey) {
  if (alignedData.length === 0) return { count: 0, percent: 0, quality: "none" };
  const validPairs = alignedData.filter(
    (d) =>
      typeof d[weatherKey] === "number" &&
      Number.isFinite(d[weatherKey]) &&
      typeof d[aqiKey] === "number" &&
      Number.isFinite(d[aqiKey]),
  );
  const percent = Math.round((validPairs.length / alignedData.length) * 100);
  const quality = percent >= 80 ? "high" : percent >= 50 ? "medium" : "low";
  return { count: validPairs.length, percent, quality };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WeatherHealthCorrelation({ lat, lon, trend, cityName }) {
  const { t } = useTranslation();
  const [weatherVar, setWeatherVar] = useState("temperature");
  const [aqiVar, setAqiVar] = useState("us_aqi");
  const [showScatter, setShowScatter] = useState(true);

  // Fetch weather data
  const weatherKey =
    lat && lon ? `weather_corr_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;
  const { data: weatherData, error: weatherError } = useSWR(
    weatherKey,
    () => fetchHourlyWeather(lat, lon),
    { ttl: 60 * 60 * 1000 },
  );

  // Align datasets
  const alignedData = useMemo(
    () => alignDatasets(weatherData || [], trend || []),
    [weatherData, trend],
  );

  // Compute correlation matrix
  const { matrix } = useMemo(
    () => computeCorrelationMatrix(alignedData),
    [alignedData],
  );

  // Generate insights
  const insights = useMemo(() => generateInsights(matrix), [matrix]);

  // Scatter data
  const scatterData = useMemo(
    () => prepareScatterData(alignedData, weatherVar, aqiVar),
    [alignedData, weatherVar, aqiVar],
  );

  // Dual-axis data
  const dualData = useMemo(
    () => prepareDualAxisData(alignedData, weatherVar, aqiVar),
    [alignedData, weatherVar, aqiVar],
  );

  // Selected variable labels
  const weatherVarDef = WEATHER_VARIABLES.find((v) => v.key === weatherVar);
  const aqiVarDef = AQI_VARIABLES.find((v) => v.key === aqiVar);

  // Compute key stats
  const avgAqi = useMemo(() => {
    const vals = alignedData.map((d) => d.us_aqi).filter((v) => typeof v === "number");
    return mean(vals);
  }, [alignedData]);

  const avgTemp = useMemo(() => {
    const vals = alignedData.map((d) => d.temperature).filter((v) => typeof v === "number");
    return mean(vals);
  }, [alignedData]);

  const avgHumidity = useMemo(() => {
    const vals = alignedData.map((d) => d.humidity).filter((v) => typeof v === "number");
    return mean(vals);
  }, [alignedData]);

  // Current correlation for selected pair
  const currentCorrelation = useMemo(() => {
    const xVals = alignedData.map((d) => d[weatherVar]);
    const yVals = alignedData.map((d) => d[aqiVar]);
    return pearsonCorrelation(xVals, yVals);
  }, [alignedData, weatherVar, aqiVar]);

  const correlationStrength = classifyCorrelation(currentCorrelation);

  const dataQuality = useMemo(
    () => computeDataQuality(alignedData, weatherVar, aqiVar),
    [alignedData, weatherVar, aqiVar],
  );

  const handleWeatherChange = useCallback((e) => setWeatherVar(e.target.value), []);
  const handleAqiChange = useCallback((e) => setAqiVar(e.target.value), []);
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
                defaultValue: "Analyzing how weather conditions affect air quality health risks",
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
                defaultValue: "Analyzing how weather conditions affect air quality health risks",
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
            🌤️ {t("weatherCorrelation.title", "Weather–Health Correlation")}
          </h2>
          <p className={styles.headerSubtitle}>
            {t("weatherCorrelation.subtitle", {
              defaultValue: "Analyzing how weather conditions affect air quality health risks in {{city}}",
              city: cityName,
            })}
          </p>
        </div>

        {/* Controls */}
        <div className={styles.controlBar} role="toolbar" aria-label="Correlation settings">
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="weather-var-select">
              {t("weatherCorrelation.weatherVar", "Weather Factor")}
            </label>
            <select
              id="weather-var-select"
              className={styles.controlSelect}
              value={weatherVar}
              onChange={handleWeatherChange}
            >
              {WEATHER_VARIABLES.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.icon} {v.label} ({v.unit})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="aqi-var-select">
              {t("weatherCorrelation.aqiVar", "Pollution Metric")}
            </label>
            <select
              id="aqi-var-select"
              className={styles.controlSelect}
              value={aqiVar}
              onChange={handleAqiChange}
            >
              {AQI_VARIABLES.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.icon} {v.label} {v.unit ? `(${v.unit})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              {t("weatherCorrelation.view", "View")}
            </label>
            <button
              type="button"
              className={styles.controlSelect}
              onClick={toggleScatter}
              style={{ cursor: "pointer", textAlign: "center" }}
            >
              {showScatter
                ? "📊 " + t("weatherCorrelation.showTrend", "Show Trend")
                : "📈 " + t("weatherCorrelation.showScatter", "Show Scatter")}
            </button>
          </div>
        </div>

        {/* Data quality badge */}
        <div style={{ textAlign: "center" }}>
          <span
            className={`${styles.qualityBadge} ${
              dataQuality.quality === "low" ? styles.qualityBadgeLow : ""
            }`}
            data-testid="data-quality-badge"
          >
            📊 {dataQuality.count} aligned data points ({dataQuality.percent}% quality)
          </span>
        </div>

        {/* Key stats */}
        <div className={styles.statsRow} data-testid="stats-row">
          <div className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              📊
            </span>
            <span className={styles.statValue} style={{ color: aqiColor(avgAqi) }}>
              {Math.round(avgAqi)}
            </span>
            <span className={styles.statLabel}>
              {t("weatherCorrelation.avgAqi", "Avg AQI")}
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
            <span
              className={styles.statIcon}
              aria-hidden="true"
              style={{ fontSize: "1rem" }}
            >
              {correlationStrength.emoji}
            </span>
            <span
              className={styles.statValue}
              style={{ color: correlationStrength.color }}
            >
              {currentCorrelation.toFixed(2)}
            </span>
            <span className={styles.statLabel}>
              {weatherVarDef?.label} ↔ {aqiVarDef?.label}
            </span>
          </div>
        </div>

        {/* Correlation Matrix */}
        <div className={styles.matrixSection} data-testid="correlation-matrix">
          <h3 className={styles.sectionTitle}>
            🔬 {t("weatherCorrelation.matrixTitle", "Correlation Matrix")}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th scope="col">
                    {t("weatherCorrelation.weatherFactors", "Weather ↓ / AQI →")}
                  </th>
                  {AQI_VARIABLES.map((v) => (
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
                    {AQI_VARIABLES.map((av, ai) => {
                      const cell = matrix[wi]?.[ai];
                      if (!cell) return <td key={av.key}>—</td>;
                      const bg =
                        cell.r > 0
                          ? `rgba(239, 68, 68, ${Math.min(Math.abs(cell.r) * 0.5, 0.6)})`
                          : `rgba(59, 130, 246, ${Math.min(Math.abs(cell.r) * 0.5, 0.6)})`;
                      return (
                        <td key={av.key}>
                          <span
                            className={styles.matrixCell}
                            style={{
                              background: bg,
                              color: Math.abs(cell.r) > 0.35 ? "#fff" : "inherit",
                              display: "inline-block",
                              padding: "0.2rem 0.45rem",
                              minWidth: "3rem",
                            }}
                            title={`${wv.label} ↔ ${av.label}: r=${cell.r.toFixed(3)} (${cell.label})`}
                            data-testid="matrix-cell"
                          >
                            {cell.r.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legendBar} role="img" aria-label="Correlation strength legend">
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "rgba(239, 68, 68, 0.5)" }} />
            {t("weatherCorrelation.positiveCorr", "Positive (higher weather → higher AQI)")}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "rgba(59, 130, 246, 0.5)" }} />
            {t("weatherCorrelation.negativeCorr", "Negative (higher weather → lower AQI)")}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "#f1f5f9" }} />
            {t("weatherCorrelation.weakCorr", "Weak / negligible")}
          </span>
        </div>

        {/* Charts */}
        <div className={styles.chartsGrid} data-testid="charts-area">
          {/* Scatter / Dual Axis Chart */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              {showScatter
                ? `📊 ${weatherVarDef?.label} vs ${aqiVarDef?.label}`
                : `📈 ${weatherVarDef?.label} & ${aqiVarDef?.label} Trend`}
            </h3>
            <div className={styles.chartContainer}>
              {showScatter ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
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
                      name={aqiVarDef?.label}
                      unit={aqiVarDef?.unit ? ` ${aqiVarDef.unit}` : ""}
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
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dualData} margin={{ top: 10, right: 40, bottom: 10, left: 10 }}>
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
                        value: weatherVarDef?.label,
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 10,
                        fill: "#0d9488",
                      }}
                    />
                    <YAxis
                      yAxisId="aqi"
                      orientation="right"
                      fontSize={10}
                      tick={{ fill: "#ef4444" }}
                      label={{
                        value: aqiVarDef?.label,
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
                    <ReferenceLine yAxisId="aqi" y={100} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.5} />
                    <ReferenceLine yAxisId="aqi" y={150} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.5} />
                    <Line
                      yAxisId="weather"
                      type="monotone"
                      dataKey="weather"
                      name={weatherVarDef?.label}
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#0d9488" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="aqi"
                      type="monotone"
                      dataKey="aqi"
                      name={aqiVarDef?.label}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#ef4444" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Distribution by AQI band */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              🌡️ {weatherVarDef?.label}{" "}
              {t("weatherCorrelation.byBand", "by AQI Band")}
            </h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChartByBand
                  data={alignedData}
                  weatherKey={weatherVar}
                  weatherLabel={weatherVarDef?.label || ""}
                  weatherUnit={weatherVarDef?.unit || ""}
                />
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className={styles.insightsSection} data-testid="insights-section">
            <h3 className={styles.sectionTitle}>
              💡 {t("weatherCorrelation.insightsTitle", "Weather–Pollution Insights")}
            </h3>
            <ul className={styles.insightsList} role="list">
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
// Bar chart showing average weather variable per AQI band
// ---------------------------------------------------------------------------

function BarChartByBand({ data, weatherKey, weatherLabel, weatherUnit }) {
  const { t } = useTranslation();
  const bandData = useMemo(() => {
    const bands = [
      { label: "Good\n(0–50)", min: 0, max: 50, color: "#22c55e", values: [] },
      { label: "Moderate\n(51–100)", min: 51, max: 100, color: "#eab308", values: [] },
      { label: "USG\n(101–150)", min: 101, max: 150, color: "#f97316", values: [] },
      { label: "Unhealthy\n(151–200)", min: 151, max: 200, color: "#ef4444", values: [] },
      { label: "Very Unhealthy\n(201+)", min: 201, max: 500, color: "#9333ea", values: [] },
    ];

    for (const d of data) {
      const aqi = d.us_aqi;
      const weather = d[weatherKey];
      if (typeof aqi !== "number" || typeof weather !== "number") continue;
      const band = bands.find((b) => aqi >= b.min && aqi <= b.max);
      if (band) band.values.push(weather);
    }

    return bands
      .filter((b) => b.values.length > 0)
      .map((b) => ({
        name: b.label,
        value: mean(b.values),
        count: b.values.length,
        color: b.color,
      }));
  }, [data, weatherKey]);

  if (bandData.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary, #94a3b8)", fontSize: "0.85rem" }}>
        {t("weatherCorrelation.noBandData", { defaultValue: "No data available for band breakdown" })}
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
          angle={0}
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
          formatter={(value) => [`${value.toFixed(1)} ${weatherUnit}`, weatherLabel]}
          contentStyle={{
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {bandData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
