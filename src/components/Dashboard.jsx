import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useRef, useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import styles from "./Dashboard.module.css";
import { useSWR } from "../hooks/useSWR";
import { getAQIBand, getPollutantColor, get7DayForecast, getWeatherDetails } from "../services/airQualityService";
import { fetchHourlyWeather } from "../services/weatherService";
import MorningBriefing from "./MorningBriefing";
import { eventBus } from "../core/events";
import ChallengesWidget from "./ChallengesWidget";
import WindPollutionRose from "./WindPollutionRose";
import Factoid from "./Factoid";
import SymptomReportButton from "./SymptomReportButton";

/** @param {any} isoTime */
function shortTimeLabel(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Renders a reading, or an em dash when the hour had no value.
 *
 * The service returns null for a missing reading rather than 0, so nothing here may
 * print a bare number without checking — "0" would read as a measurement of clean air.
 *
 * @param {number|null|undefined} value
 * @returns {string}
 */
function displayReading(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '—';
}

/**
 * Mean of whichever readings exist in a window, or null when none do.
 *
 * @param {any[]} items
 * @param {string} field
 * @returns {number|null}
 */
function averageOf(items, field) {
  const values = (items || [])
    .map((item) => item?.[field])
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** @param {any} params */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        padding: '1rem',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        maxWidth: '250px',
        zIndex: 1000,
        position: 'relative'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: data.color, fontSize: '1.25rem', fontWeight: 'bold' }}>{data.name}</h4>
        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary, #0f172a)' }}>
          <strong>Current:</strong> {data.value} µg/m³
        </p>
        <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary, #0f172a)' }}>
          <strong>WHO Limit:</strong> {data.limit} µg/m³
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary, #475569)', lineHeight: '1.4' }}>
          {data.impact}
        </p>
      </div>
    );
  }
  return null;
}

/** @param {any} params */
export default function Dashboard({
  cityName,
  lat,
  lon,
  current,
  trend,
  cityComparisons,
  timeRange,
  onTimeRangeChange,
  lastUpdated,
  isRefreshing,
  confidenceScore,
  dataCompleteness,
  isFallback
}) {
  const forecastKey = lat && lon ? `forecast_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;
  const {
    data: forecastData,
    error: forecastError,
    mutate: mutateForecast
  } = useSWR(forecastKey, () => get7DayForecast(lat, lon), { ttl: 60 * 60 * 1000 });

  const weatherKey = lat && lon ? `openweather_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;
  const {
    data: hourlyWeather,
    error: hourlyWeatherError
  } = useSWR(weatherKey, () => fetchHourlyWeather(lat, lon), { ttl: 60 * 60 * 1000 });

  const [animateForecast, setAnimateForecast] = useState(false);

  useEffect(() => {
    if (forecastData) {
      const timer = setTimeout(() => setAnimateForecast(true), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimateForecast(false);
    }
  }, [forecastData]);

  useEffect(() => {
    const handleForceRefresh = () => {
      mutateForecast();
    };
    eventBus.on("FORCE_REFRESH", handleForceRefresh);
    return () => {
      eventBus.off("FORCE_REFRESH", handleForceRefresh);
    };
  }, [mutateForecast]);

  const measuredCities = useMemo(
    () => (cityComparisons || []).filter((c) => !c.unavailable && c.aqi != null),
    [cityComparisons]
  );
  const unavailableCities = useMemo(
    () => (cityComparisons || []).filter((c) => c.unavailable || c.aqi == null),
    [cityComparisons]
  );

  const reportRef = useRef(null);
  const shareCardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  const exportReportAsPDF = async () => {
    if (!reportRef.current || isExporting) return;
    setExportError(null);
    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let position = margin;
      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        position = heightLeft - imageHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      const safeCityName = cityName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      pdf.save(`${safeCityName}-air-quality-report.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      setExportError(error?.message || "Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const shareAQICard = async () => {
    if (!shareCardRef.current || isSharing) return;
    try {
      setIsSharing(true);
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
      });
      const safeCityName = cityName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const fileName = `${safeCityName}-aqi-${new Date().toISOString().slice(0, 10)}.png`;

      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${cityName} Air Quality`,
              text: `Current AQI in ${cityName}: ${current.us_aqi} — ${getAQIBand(current.us_aqi).label}`,
            });
            return;
          }
          triggerDownload(canvas, fileName);
        });
      } else {
        triggerDownload(canvas, fileName);
      }
    } catch (error) {
      console.error("AQI share card export failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

  function triggerDownload(canvas, fileName) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!current) {
    return (
      <section data-testid="dashboard" className="panel dashboard">
        <div className="panel-head">
          <h2>Real-Time Pollution Dashboard</h2>
          <p>Live readings for {cityName}</p>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }} role="alert">
          <h3>No data available</h3>
          <p>We couldn't retrieve live air quality data for {cityName} and no cached readings are available.</p>
        </div>
      </section>
    );
  }

  const aqiBand = getAQIBand(current.us_aqi);
  const forecastAqiValues = forecastData ? forecastData.map(d => d.aqi) : [];
  const minAqi = forecastAqiValues.length > 0 ? Math.min(...forecastAqiValues) : Infinity;
  const maxAqi = forecastAqiValues.length > 0 ? Math.max(...forecastAqiValues) : -Infinity;
  const chartData = trend.slice(-timeRange).map((item) => ({
    ...item,
    label: shortTimeLabel(item.time)
  }));

  const pollutants = [
    { name: 'PM2.5', value: current.pm2_5, limit: 15, impact: 'Fine particles can penetrate lungs and enter the bloodstream.', color: getPollutantColor(current.pm2_5, 15) },
    { name: 'PM10', value: current.pm10, limit: 45, impact: 'Coarse particles can irritate airways and cause coughing.', color: getPollutantColor(current.pm10, 45) },
    { name: 'NO2', value: current.nitrogen_dioxide, limit: 25, impact: 'May irritate airways and aggravate respiratory diseases.', color: getPollutantColor(current.nitrogen_dioxide, 25) },
    { name: 'O3', value: current.ozone, limit: 100, impact: 'Can trigger asthma and reduce lung function.', color: getPollutantColor(current.ozone, 100) },
    { name: 'CO', value: current.carbon_monoxide, limit: 4000, impact: 'High levels reduce oxygen delivery to the body.', color: getPollutantColor(current.carbon_monoxide, 4000) }
  ].map(p => ({
    ...p,
    ratio: typeof p.value === 'number' && Number.isFinite(p.value)
      ? Math.max(10, (p.value / p.limit) * 100)
      : 10
  }));

  const getAqiTrendIndicator = () => {
    if (!trend || trend.length < 2) return null;
    const windowSize = Math.min(4, Math.floor(trend.length / 2));
    if (windowSize === 0) return null;
    const recentData = trend.slice(-windowSize);
    const previousData = trend.slice(-windowSize * 2, -windowSize);
    const recentAvg = averageOf(recentData, 'us_aqi');
    const previousAvg = averageOf(previousData, 'us_aqi');
    if (recentAvg === null || previousAvg === null) return null;
    const diff = recentAvg - previousAvg;
    const threshold = 2;
    if (diff > threshold) return { label: '🔴 ↑ Worsening', color: '#ef4444' };
    else if (diff < -threshold) return { label: '🟢 ↓ Improving', color: '#22c55e' };
    else return { label: '⚪ → Stable', color: '#94a3b8' };
  };

  const aqiTrend = getAqiTrendIndicator();

  return (
    <>
      <section data-testid="dashboard" className="panel dashboard" ref={reportRef} aria-labelledby="dashboard-title">
        <MorningBriefing current={current} trend={trend} />

        {exportError && (
          <div
            className="pdf-export-error-toast"
            role="alert"
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              padding: "0.85rem 1.25rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem"
            }}
          >
            <div>
              <strong>PDF Export Failed:</strong> {exportError}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={exportReportAsPDF}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
                aria-label="Retry PDF Export"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setExportError(null)}
                style={{
                  backgroundColor: "transparent",
                  color: "#991b1b",
                  border: "1px solid #fca5a5",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.375rem",
                  cursor: "pointer"
                }}
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="panel-head" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className={styles.dashboardHeaderRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 id="dashboard-title">Real-Time Pollution Dashboard</h2>
              <p>
                Live readings for {cityName}
                {isFallback && (
                  <span className="fallback-badge" style={{
                    marginLeft: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    backgroundColor: '#d97706',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    verticalAlign: 'middle'
                  }} aria-label="Showing cached data due to network fallback">
                    Showing Cached Reading
                  </span>
                )}
              </p>
            </div>
            <div className={styles.dashboardHeaderActions} data-html2canvas-ignore="true">
              <button
                type="button"
                className={styles.exportReportButton}
                onClick={exportReportAsPDF}
                disabled={isExporting}
                data-html2canvas-ignore="true"
                aria-label={isExporting ? 'Generating PDF, please wait' : 'Export dashboard report as PDF'}
                style={{ flexShrink: 0 }}
              >
                {isExporting ? "Generating PDF..." : "Export Report as PDF"}
              </button>
              <button
                type="button"
                className={styles.shareAQIButton}
                onClick={shareAQICard}
                disabled={isSharing}
                data-html2canvas-ignore="true"
                aria-label={isSharing ? 'Generating share card, please wait' : 'Share AQI as image'}
                style={{ flexShrink: 0 }}
              >
                {isSharing ? "Generating..." : "Share AQI"}
              </button>
              <SymptomReportButton fallbackPosition={lat && lon ? { lat, lon } : null} />
            </div>
          </div>
          <div className={styles.dashboardTools}>
            <div
              data-testid="time-range-selector"
              className="range-switch"
              role="tablist"
              aria-label="Time range selector for AQI trend chart"
            >
              {[6, 12, 24].map((range) => (
                <button
                  key={range}
                  type="button"
                  role="tab"
                  id={`time-tab-${range}`}
                  aria-selected={timeRange === range}
                  aria-controls="aqi-trend-chart"
                  tabIndex={timeRange === range ? 0 : -1}
                  onClick={() => onTimeRangeChange(range)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") {
                      const ranges = [6, 12, 24];
                      const next = ranges[(ranges.indexOf(range) + 1) % ranges.length];
                      onTimeRangeChange(next);
                      document.getElementById(`time-tab-${next}`)?.focus();
                    }
                    if (e.key === "ArrowLeft") {
                      const ranges = [6, 12, 24];
                      const prev = ranges[(ranges.indexOf(range) - 1 + ranges.length) % ranges.length];
                      onTimeRangeChange(prev);
                      document.getElementById(`time-tab-${prev}`)?.focus();
                    }
                  }}
                >
                  {range}h
                </button>
              ))}
            </div>
            <p className={styles.dashboardMeta} aria-live="polite">
              {isRefreshing ? 'Updating data...' : `Updated ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'just now'}`}
            </p>
          </div>
        </div>

        <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>
          <article className={`${styles.kpiCard} ${styles.aqi}`} aria-labelledby="us-aqi-title">
            <h3 id="us-aqi-title">US AQI</h3>
            <div data-testid="aqi-value" className={styles.kpiValue} style={{ color: aqiBand.color }}>
              {displayReading(current.us_aqi)}
            </div>
            <p data-testid="aqi-band-label" aria-live="polite">{aqiBand.label}</p>
            {aqiTrend && (
              <div 
                style={{ fontSize: "0.95rem", fontWeight: "600", color: aqiTrend.color, marginTop: "0.5rem", marginBottom: "0.5rem" }}
                aria-label={`Trend: ${aqiTrend.label.replace(/[^a-zA-Z ]/g, '')}`}
              >
                <span aria-hidden="true">{aqiTrend.label}</span>
              </div>
            )}
            <span className={`confidence-badge confidence-${confidenceScore?.toLowerCase()}`} aria-label={`Confidence score: ${confidenceScore}, Data completeness: ${dataCompleteness}%`}>
              {confidenceScore} ({dataCompleteness}% data)
            </span>
          </article>

          <article className={`${styles.kpiCard} ${styles.chartCard}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Pollutant Health Speedometer</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Relative magnitude vs. WHO guidelines. Larger segments indicate higher severity.
            </p>
            {/* A11Y FIX: Recharts SVGs require role="img" and aria-label on parent containers */}
            <div style={{ flex: 1, minHeight: '200px' }} role="img" aria-label="Donut chart displaying current pollutants against WHO guidelines.">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pollutants}
                    dataKey="ratio"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    label={({ name }) => name}
                    labelLine={false}
                  >
                    {pollutants.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
          <ChallengesWidget />
        </div>

        <div data-testid="pollutants-grid" className={styles.pollutantsGrid}>
          {pollutants.map((p) => {
            const pct = Math.round((p.value / p.limit) * 100);
            const status =
              pct >= 100
                ? { label: 'HIGH', bg: '#fee2e2', color: '#ef4444' }
                : pct >= 50
                  ? { label: 'CAUTION', bg: '#fff7ed', color: '#f97316' }
                  : { label: 'SAFE', bg: '#f0fdf4', color: '#22c55e' };

            return (
              <article
                key={p.name}
                data-testid={`pollutant-${p.name.toLowerCase().replace('.', '_')}`}
                className={styles.pollutantCard}
                style={{ borderLeft: `4px solid ${p.color}` }}
                aria-label={`${p.name} levels are ${status.label}`}
              >
                <div className={styles.pollutantCardHeader}>
                  <h4>{p.name}</h4>
                  <span
                    className={styles.pollutantStatusPill}
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    <span style={{
                      width: '7px', height: '7px',
                      borderRadius: '50%',
                      backgroundColor: status.color,
                      display: 'inline-block'
                    }} aria-hidden="true" />
                    {status.label}
                  </span>
                </div>

                <div className={styles.pollutantValueContainer}>
                  <span className={styles.pollutantValue} style={{ color: p.color }}>{p.value}</span>
                  <span className={styles.pollutantUnit}>µg/m³</span>
                </div>

                <div className={styles.pollutantMetaInfo}>
                  <span className={styles.pollutantLimit}>WHO Limit: {p.limit} µg/m³</span>
                  <span className={styles.pollutantPercent} style={{ color: p.color }}>{pct}%</span>
                </div>

                {/* A11Y FIX: Semantically define this as a progressbar so screen readers read the percentage naturally */}
                <div 
                  className={styles.pollutantProgressTrack}
                  role="progressbar"
                  aria-label={`${p.name} percentage of WHO limit`}
                  aria-valuenow={Math.min(pct, 100)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className={styles.pollutantProgressFill}
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: p.color
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <Factoid label="Did You Know?" />

        <div className={styles.chartGrid}>
          <article className={`${styles.chartCard} ${styles.forecastCard}`} style={{ gridColumn: '1 / -1' }}>
            <h3>7-Day AQI & Weather Forecast</h3>
            {forecastError && <p style={{ color: 'var(--danger)', padding: '1rem' }} role="alert">Failed to load forecast data.</p>}
            {!forecastData && !forecastError && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  opacity: 0.7
                }}
              >
                <span
                  className="loading-spinner live-dot active"
                  aria-hidden="true"
                  style={{ display: 'inline-block', marginRight: '0.5rem' }}></span>
                Loading 7-day forecast...
              </div>
            )}
            {forecastData && forecastData.length > 0 && (
              <div data-testid="7-day-forecast-chart" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: '600' }}>
                  7-Day Predictive AQI Trend & Confidence Bounds
                </h4>
                {/* A11Y FIX: Chart accessibility wrapper */}
                <div role="img" aria-label="Area chart showing 7-day predictive AQI trend and confidence bounds">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={forecastData.map((d) => ({
                        ...d,
                        label: new Date(d.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC'
                        }),
                      }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip
                        formatter={(val, name) => {
                          if (name === "Confidence Range") {
                            const tuple = Array.isArray(val) ? val : [val, val];
                            return [`${tuple[0]} – ${tuple[1]} AQI`, 'Confidence Bounds'];
                          }
                          return [`${val} AQI`, 'Predicted AQI'];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceRange"
                        stroke="none"
                        fill="#0d9488"
                        fillOpacity={0.18}
                        name="Confidence Range"
                      />
                      <Line
                        type="monotone"
                        dataKey="aqi"
                        stroke="#0d9488"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#0d9488" }}
                        name="Predicted AQI"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {forecastData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }} role="list" aria-label="7-Day forecast details">
                {forecastData.map((day) => {
                  const weather = getWeatherDetails(day.weatherCode);
                  const band = getAQIBand(day.aqi);
                  const isBest = day.aqi === minAqi;
                  const isWorst = day.aqi === maxAqi;

                  const formattedDate = new Date(day.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC'
                  });

                  return (
                    <div
                      key={day.date}
                      role="listitem"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--bg-card-alt, rgba(0,0,0,0.015))',
                        border: '1px solid var(--line)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '150px' }}>
                        <span style={{ fontSize: '1.25rem' }} title={weather.label} aria-hidden="true">{weather.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--ink)' }}>{formattedDate}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{weather.label}</span>
                        </div>
                      </div>

                      <div style={{ flex: '1 1 200px', minWidth: '150px' }} aria-hidden="true">
                        <div style={{ height: '8px', width: '100%', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: animateForecast ? `${Math.min(100, (day.aqi / 300) * 100)}%` : '0%',
                              background: band.color,
                              borderRadius: '4px',
                              transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '120px' }}>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: band.color }} aria-label={`AQI ${day.aqi}`}>{day.aqi}</span>
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: `${band.color}22`,
                            color: band.color,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {band.label}
                        </span>
                      </div>

                      {isBest && (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          <span aria-hidden="true">✨</span> Best Day
                        </span>
                      )}
                      {isWorst && (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#b91c1c',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          <span aria-hidden="true">⚠️</span> Worst Day
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Hourly Weather Forecast</h3>
            {hourlyWeatherError && (
              <p style={{ color: 'var(--danger)', padding: '1rem' }} role="alert">
                Failed to load hourly weather data.
              </p>
            )}
            {!hourlyWeather && !hourlyWeatherError && (
              <p style={{ padding: '1rem', color: 'var(--muted)' }} aria-live="polite">Loading hourly weather…</p>
            )}
            {hourlyWeather && hourlyWeather.length === 0 && !hourlyWeatherError && (
              <p style={{ padding: '1rem', color: 'var(--muted)' }}>
                Hourly weather is unavailable — set VITE_OPENWEATHER_API_KEY to enable it.
              </p>
            )}
            {hourlyWeather && hourlyWeather.length > 0 && (
              {/* A11Y FIX: Make horizontal scrolling container accessible via keyboard tab */}
              <div 
                style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}
                tabIndex={0}
                role="region"
                aria-label="Hourly weather scrollable list"
              >
                <div style={{ display: 'flex', gap: '0.75rem' }} role="list">
                  {hourlyWeather.map((point) => (
                    <div
                      key={point.time}
                      role="listitem"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        minWidth: '90px',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: 'var(--bg-card-alt, rgba(0,0,0,0.015))',
                        border: '1px solid var(--line)'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {new Date(point.time).toLocaleTimeString([], { hour: '2-digit' })}
                      </span>
                      <img
                        src={`https://openweathermap.org/img/wn/${point.weatherIcon}.png`}
                        alt={point.weatherLabel}
                        width="32"
                        height="32"
                      />
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--ink)' }} aria-label={`Temperature ${point.temperature !== null ? Math.round(point.temperature) + ' degrees Celsius' : 'unknown'}`}>
                        {point.temperature !== null ? `${Math.round(point.temperature)}°C` : '—'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }} aria-label={`Humidity ${point.humidity ?? 'unknown'} percent`}>
                        <span aria-hidden="true">💧</span> {point.humidity ?? '—'}%
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }} aria-label={`Wind speed ${point.windSpeed ?? 'unknown'} meters per second`}>
                        <span aria-hidden="true">🌬️</span> {point.windSpeed ?? '—'} m/s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Wind & Pollution Rose Chart */}
          <WindPollutionRose lat={lat} lon={lon} />

          <article className="chart-card">
            <h3>AQI Trend ({timeRange}h)</h3>
            <div
              id="aqi-trend-chart"
              data-testid="aqi-trend-chart"
              role="tabpanel"
              aria-labelledby={`time-tab-${timeRange}`}
              tabIndex={0} // A11Y FIX: Allow users to tab into the panel
              style={{ outline: 'none' }} // Prevents messy focus ring on click, relies on standard internal focus
            >
              {/* A11Y FIX: Wrapper for Recharts */}
              <div role="img" aria-label={`Line chart displaying AQI trend over the last ${timeRange} hours`}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                    <XAxis dataKey="label" minTickGap={28} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="us_aqi" stroke="#0d9488" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </article>

          <article data-testid="city-comparisons" className="chart-card">
            <h3>City-Wise AQI Comparison</h3>
            {/* A11Y FIX: Wrapper for Recharts */}
            <div role="img" aria-label="Horizontal bar chart comparing Air Quality Index across different cities">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={measuredCities} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="city" width={90} />
                  <Tooltip />
                  <Bar dataKey="aqi" fill="#f97316" radius={[0, 12, 12, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {unavailableCities.length > 0 && (
              <p className="city-comparison-unavailable" data-testid="city-comparison-unavailable">
                No reading available for {unavailableCities.map((c) => c.city).join(', ')}.
              </p>
            )}
            <ul style={{ display: 'none' }} aria-hidden="true">
              {cityComparisons && cityComparisons.map((c, i) => (
                <li key={i} data-testid="city-comparison-item">
                  {c.city}: {c.unavailable || c.aqi == null ? 'Unavailable' : c.aqi}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* Hidden AQI Share Card */}
      <div
        ref={shareCardRef}
        aria-hidden="true"
        className="share-card-container"
        style={{
          borderColor: `${aqiBand.color}44`,
        }}
      >
        <div className="share-card-header">
          <span className="share-card-badge">POLLUTION CONTROL HUB</span>
          <span className="share-card-date">
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <h2 className="share-card-city">
          {cityName}
        </h2>

        <div className="share-card-hero">
          <div className="share-card-hero-left">
            <span className="share-card-hero-sub">AIR QUALITY INDEX</span>
            <span className="share-card-hero-value" style={{ color: aqiBand.color }}>
              {displayReading(current.us_aqi)}
            </span>
          </div>
          <div className="share-card-hero-pill" style={{ background: aqiBand.color }}>
            {aqiBand.label}
          </div>
        </div>

        <div className="share-card-grid">
          {[
            { label: 'PM2.5', value: current.pm2_5, limit: 15 },
            { label: 'PM10', value: current.pm10, limit: 45 },
            { label: 'NO₂', value: current.nitrogen_dioxide, limit: 25 },
          ].map(({ label, value, limit }) => {
            const color = getPollutantColor(value, limit);
            return (
              <div
                key={label}
                className="share-card-tile"
                style={{
                  borderColor: `${color}66`,
                  borderTop: `3px solid ${color}`
                }}
              >
                <div className="share-card-tile-label">{label}</div>
                <div className="share-card-tile-value" style={{ color }}>
                  {value !== undefined ? Number(value).toFixed(1) : '—'}
                </div>
                <div className="share-card-tile-unit">µg/m³</div>
              </div>
            );
          })}
        </div>

        <div className="share-card-footer">
          <span>🌍 Live Air Quality Status</span>
          <span>pollution-control-hub.vercel.app</span>
        </div>
      </div>
    </>
  );
}
