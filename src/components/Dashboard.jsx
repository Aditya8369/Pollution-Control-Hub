import {
  LineChart,
  Line,
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
import { useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useSWR } from "../hooks/useSWR";
import { getAQIBand, getPollutantColor, fetch7DayForecast, getWeatherDetails } from "../services/airQualityService";
import MorningBriefing from "./MorningBriefing";
import { eventBus } from "../core/events";

/** @param {any} isoTime */
function shortTimeLabel(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  } = useSWR(forecastKey, () => fetch7DayForecast(lat, lon), { ttl: 60 * 60 * 1000 });

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

  const reportRef = useRef(null);
  const shareCardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const exportReportAsPDF = async () => {
    if (!reportRef.current || isExporting) return;
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
      alert("Unable to export the PDF. Please try again.");
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

      // Use native Web Share API on mobile if available
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
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
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
  ].map(p => ({ ...p, ratio: Math.max(10, (p.value / p.limit) * 100) }));

  const getAqiTrendIndicator = () => {
    if (!trend || trend.length < 2) return null;
    const windowSize = Math.min(4, Math.floor(trend.length / 2));
    if (windowSize === 0) return null;
    const recentData = trend.slice(-windowSize);
    const previousData = trend.slice(-windowSize * 2, -windowSize);
    const recentAvg = recentData.reduce((sum, item) => sum + item.us_aqi, 0) / windowSize;
    const previousAvg = previousData.reduce((sum, item) => sum + item.us_aqi, 0) / windowSize;
    const diff = recentAvg - previousAvg;
    const threshold = 2;
    if (diff > threshold) return { label: '🔴 ↑ Worsening', color: '#ef4444' };
    else if (diff < -threshold) return { label: '🟢 ↓ Improving', color: '#22c55e' };
    else return { label: '⚪ → Stable', color: '#94a3b8' };
  };

  const aqiTrend = getAqiTrendIndicator();

  return (
    <>
      <section data-testid="dashboard" className="panel dashboard" ref={reportRef}>
        <MorningBriefing current={current} trend={trend} />
        <div className="panel-head" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2>Real-Time Pollution Dashboard</h2>
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
                  }}>
                    Showing Cached Reading
                  </span>
                )}
              </p>
            </div>
            <div className="dashboard-header-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }} data-html2canvas-ignore="true">
              <button
                type="button"
                className="export-report-button"
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
                className="share-aqi-button"
                onClick={shareAQICard}
                disabled={isSharing}
                data-html2canvas-ignore="true"
                aria-label={isSharing ? 'Generating share card, please wait' : 'Share AQI as image'}
                style={{ flexShrink: 0 }}
              >
                {isSharing ? "Generating..." : "Share AQI"}
              </button>
            </div>
          </div>
          <div className="dashboard-tools">
            <div data-testid="time-range-selector" className="range-switch" role="group" aria-label="Select time range">
              {[6, 12, 24].map((range) => (
                <button
                  key={range}
                  type="button"
                  className={timeRange === range ? 'active' : ''}
                  onClick={() => onTimeRangeChange(range)}
                  aria-label={`Show last ${range} hours`}
                  aria-pressed={timeRange === range}
                >
                  {range}h
                </button>
              ))}
            </div>
            <p className="dashboard-meta">
              {isRefreshing ? 'Updating...' : `Updated ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'just now'}`}
            </p>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>
          <article className="kpi-card aqi">
            <h3>US AQI</h3>
            <div data-testid="aqi-value" className="kpi-value" style={{ color: aqiBand.color }}>
              {current.us_aqi}
            </div>
            <p data-testid="aqi-band-label">{aqiBand.label}</p>
            {aqiTrend && (
              <div style={{ fontSize: "0.95rem", fontWeight: "600", color: aqiTrend.color, marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                {aqiTrend.label}
              </div>
            )}
            <span className={`confidence-badge confidence-${confidenceScore?.toLowerCase()}`}>
              {confidenceScore} ({dataCompleteness}% data)
            </span>
          </article>

          <article className="kpi-card chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Pollutant Health Speedometer</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Relative magnitude vs. WHO guidelines. Larger segments indicate higher severity.
            </p>
            <div style={{ flex: 1, minHeight: '200px' }} role="img" aria-label="Pollutant health speedometer donut chart showing real-time values vs WHO guidelines">
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
        </div>

        <div data-testid="pollutants-grid" className="pollutants-grid">
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
                className="pollutant-card"
                style={{ borderLeft: `4px solid ${p.color}` }}
              >
                <div className="pollutant-card-header">
                  <h4>{p.name}</h4>
                  <span
                    className="pollutant-status-pill"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    <span style={{
                      width: '7px', height: '7px',
                      borderRadius: '50%',
                      backgroundColor: status.color,
                      display: 'inline-block'
                    }} />
                    {status.label}
                  </span>
                </div>

                <div className="pollutant-value-container">
                  <span className="pollutant-value" style={{ color: p.color }}>{p.value}</span>
                  <span className="pollutant-unit">µg/m³</span>
                </div>

                <div className="pollutant-meta-info">
                  <span className="pollutant-limit">WHO Limit: {p.limit} µg/m³</span>
                  <span className="pollutant-percent" style={{ color: p.color }}>{pct}%</span>
                </div>

                <div className="pollutant-progress-track">
                  <div
                    className="pollutant-progress-fill"
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

        <div className="chart-grid">
          <article className="chart-card forecast-card" style={{ gridColumn: '1 / -1' }}>
            <h3>7-Day AQI & Weather Forecast</h3>
            {forecastError && <p style={{ color: 'var(--danger)', padding: '1rem' }}>Failed to load forecast data.</p>}
            {!forecastData && !forecastError && (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                <span className="live-dot active" style={{ display: 'inline-block', marginRight: '0.5rem' }}></span>
                Loading 7-day forecast...
              </div>
            )}
            {forecastData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
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
                      {/* Date and Weather */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '150px' }}>
                        <span style={{ fontSize: '1.25rem' }} title={weather.label}>{weather.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--ink)' }}>{formattedDate}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{weather.label}</span>
                        </div>
                      </div>

                      {/* Animated AQI relative bar */}
                      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
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

                      {/* AQI Value and Band */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '120px' }}>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: band.color }}>{day.aqi}</span>
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

                      {/* Best/Worst highlights */}
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
                          ✨ Best Day
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
                          ⚠️ Worst Day
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="chart-card">
            <h3>AQI Trend ({timeRange}h)</h3>
            <div data-testid="aqi-trend-chart">
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
          </article>

          <article data-testid="city-comparisons" className="chart-card">
            <h3>City-Wise AQI Comparison</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cityComparisons} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="city" width={90} />
                <Tooltip />
                <Bar dataKey="aqi" fill="#f97316" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ul style={{ display: 'none' }}>
              {cityComparisons && cityComparisons.map((c, i) => (
                <li key={i} data-testid="city-comparison-item">{c.city}: {c.aqi}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* Hidden AQI Share Card — captured by html2canvas */}
      <div
        ref={shareCardRef}
        aria-hidden="true"
        className="share-card-container"
        style={{
          borderColor: `${aqiBand.color}44`,
        }}
      >
        {/* Header */}
        <div className="share-card-header">
          <span className="share-card-badge">POLLUTION CONTROL HUB</span>
          <span className="share-card-date">
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <h2 className="share-card-city">
          {cityName}
        </h2>

        {/* Hero AQI Box */}
        <div className="share-card-hero">
          <div className="share-card-hero-left">
            <span className="share-card-hero-sub">AIR QUALITY INDEX</span>
            <span className="share-card-hero-value" style={{ color: aqiBand.color }}>
              {current.us_aqi}
            </span>
          </div>
          <div className="share-card-hero-pill" style={{ background: aqiBand.color }}>
            {aqiBand.label}
          </div>
        </div>

        {/* Pollutant Metric Grid Tiles */}
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

        {/* Footer Branding */}
        <div className="share-card-footer">
          <span>🌍 Live Air Quality Status</span>
          <span>pollution-control-hub.vercel.app</span>
        </div>
      </div>

    </>
  );
}