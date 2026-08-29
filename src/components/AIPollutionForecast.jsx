import React, { useState, useMemo, useCallback } from "react";
import { SelectionButton } from "./ui/PressableCard";

// ─── Forecast Data Generator ────────────────────────────────────────────────
const POLLUTANTS = [
  { id: "pm25", name: "PM2.5", unit: "µg/m³", color: "#ef4444", max: 500, safe: 25 },
  { id: "pm10", name: "PM10", unit: "µg/m³", color: "#f97316", max: 600, safe: 50 },
  { id: "o3", name: "O₃", unit: "ppb", color: "#8b5cf6", max: 200, safe: 70 },
  { id: "no2", name: "NO₂", unit: "ppb", color: "#06b6d4", max: 200, safe: 53 },
  { id: "so2", name: "SO₂", unit: "ppb", color: "#eab308", max: 200, safe: 35 },
  { id: "co", name: "CO", unit: "ppm", color: "#22c55e", max: 15, safe: 4.4 },
];

const AQI_CATEGORIES = [
  { min: 0, max: 50, label: "Good", color: "#22c55e", icon: "😊" },
  { min: 51, max: 100, label: "Moderate", color: "#eab308", icon: "😐" },
  { min: 101, max: 150, label: "USG", color: "#f97316", icon: "🤧" },
  { min: 151, max: 200, label: "Unhealthy", color: "#ef4444", icon: "😷" },
  { min: 201, max: 300, label: "Very Unhealthy", color: "#9333ea", icon: "🤢" },
  { min: 301, max: 500, label: "Hazardous", color: "#7f1d1d", icon: "☠️" },
];

const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const WEATHER_CONDITIONS = [
  { label: "Clear", icon: "☀️", dispersal: 0.9 },
  { label: "Partly Cloudy", icon: "⛅", dispersal: 0.7 },
  { label: "Overcast", icon: "☁️", dispersal: 0.5 },
  { label: "Light Rain", icon: "🌦️", dispersal: 1.1 },
  { label: "Heavy Rain", icon: "🌧️", dispersal: 1.4 },
  { label: "Fog", icon: "🌫️", dispersal: 0.2 },
  { label: "Wind", icon: "💨", dispersal: 1.3 },
  { label: "Storm", icon: "⛈️", dispersal: 1.5 },
];

const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

function generateHourlyForecast(baseAqi = 85) {
  const now = new Date();
  const hours = [];
  for (let h = 0; h < 72; h++) {
    const time = new Date(now.getTime() + h * 3600000);
    const hour = time.getHours();
    // Traffic rush hours + temperature inversion at night
    const rushFactor = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.3 : 1.0;
    const nightFactor = hour >= 22 || hour <= 5 ? 1.15 : 1.0;
    const diurnalCycle = Math.sin((hour - 6) * Math.PI / 12);
    const noise = 0.9 + Math.random() * 0.2;
    const aqi = Math.round(baseAqi * rushFactor * nightFactor * (0.85 + diurnalCycle * 0.15) * noise);
    const confidence = Math.max(0.5, 1 - h * 0.007 + (Math.random() * 0.1));
    const pm25 = Math.round(aqi * 0.4 * (0.8 + Math.random() * 0.4));
    const pm10 = Math.round(aqi * 0.55 * (0.8 + Math.random() * 0.4));
    const o3 = Math.round(40 + diurnalCycle * 30 + Math.random() * 15);
    const no2 = Math.round(25 + rushFactor * 20 + Math.random() * 10);
    const so2 = Math.round(10 + Math.random() * 15);
    const co = +(1.5 + rushFactor * 1.2 + Math.random() * 0.8).toFixed(1);
    hours.push({
      time,
      hour,
      aqi: Math.min(500, Math.max(0, aqi)),
      confidence,
      pm25, pm10, o3, no2, so2, co,
      temp: Math.round(18 + diurnalCycle * 8 + Math.random() * 3),
      humidity: Math.round(55 + (nightFactor > 1 ? 15 : 0) + Math.random() * 10),
      windSpeed: +(3 + Math.random() * 8).toFixed(1),
      windDir: WIND_DIRECTIONS[Math.floor(Math.random() * 8)],
      weather: WEATHER_CONDITIONS[Math.floor(Math.random() * 4)],
      dominantPollutant: POLLUTANTS[Math.floor(Math.random() * 3)].id,
    });
  }
  return hours;
}

function getAqiCategory(aqi) {
  return AQI_CATEGORIES.find(c => aqi >= c.min && aqi <= c.max) || AQI_CATEGORIES[5];
}

function aggregateDaily(hourly) {
  const days = {};
  hourly.forEach(h => {
    const key = h.time.toLocaleDateString();
    if (!days[key]) days[key] = { date: h.time, entries: [] };
    days[key].entries.push(h);
  });
  return Object.values(days).slice(0, 3).map(d => {
    const entries = d.entries;
    const avgAqi = Math.round(entries.reduce((s, e) => s + e.aqi, 0) / entries.length);
    const maxAqi = Math.max(...entries.map(e => e.aqi));
    const minAqi = Math.min(...entries.map(e => e.aqi));
    const avgConf = +(entries.reduce((s, e) => s + e.confidence, 0) / entries.length).toFixed(2);
    return {
      date: d.date,
      avgAqi,
      maxAqi,
      minAqi,
      confidence: avgConf,
      category: getAqiCategory(avgAqi),
      entries,
    };
  });
}

function generateSources() {
  return [
    { name: "Traffic Emissions", contribution: 32, icon: "🚗", trend: "up", change: +3.2 },
    { name: "Industrial", contribution: 24, icon: "🏭", trend: "down", change: -1.8 },
    { name: "Construction", contribution: 15, icon: "🏗️", trend: "up", change: +5.1 },
    { name: "Residential Heating", contribution: 12, icon: "🏠", trend: "stable", change: +0.2 },
    { name: "Agriculture", contribution: 9, icon: "🌾", trend: "down", change: -2.4 },
    { name: "Natural Sources", contribution: 8, icon: "🌳", trend: "stable", change: +0.1 },
  ];
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  container: {
    padding: "20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    color: "#e2e8f0",
    minHeight: "100vh",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "8px",
  },
  subtitle: { color: "#94a3b8", fontSize: "1rem" },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tab: (active) => ({
    padding: "10px 20px",
    borderRadius: "12px",
    border: active ? "2px solid #60a5fa" : "2px solid #334155",
    background: active ? "rgba(96,165,250,0.15)" : "#1e293b",
    color: active ? "#60a5fa" : "#94a3b8",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    transition: "all 0.3s ease",
  }),
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  kpi: {
    background: "rgba(30,41,59,0.8)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #334155",
    textAlign: "center",
  },
  kpiValue: (color) => ({
    fontSize: "2rem",
    fontWeight: 800,
    color: color || "#60a5fa",
  }),
  kpiLabel: { color: "#94a3b8", fontSize: "0.8rem", marginTop: "4px" },
  card: {
    background: "rgba(30,41,59,0.8)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#f1f5f9",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  alertBanner: (level) => ({
    padding: "16px 24px",
    borderRadius: "12px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: 600,
    background:
      level === "good" ? "rgba(34,197,94,0.15)" :
      level === "moderate" ? "rgba(234,179,8,0.15)" :
      level === "unhealthy" ? "rgba(239,68,68,0.15)" :
      "rgba(147,51,234,0.15)",
    borderLeft: `4px solid ${
      level === "good" ? "#22c55e" :
      level === "moderate" ? "#eab308" :
      level === "unhealthy" ? "#ef4444" :
      "#9333ea"
    }`,
  }),
  miniChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: "2px",
    height: "60px",
  },
  bar: (height, color) => ({
    width: "4px",
    height: `${height}%`,
    background: color,
    borderRadius: "2px",
    transition: "height 0.3s ease",
  }),
  timeline: {
    position: "relative",
    paddingLeft: "24px",
  },
  timelineLine: {
    position: "absolute",
    left: "8px",
    top: "0",
    bottom: "0",
    width: "2px",
    background: "#334155",
  },
  timelineDot: (color) => ({
    position: "absolute",
    left: "3px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: color,
    border: "2px solid #1e293b",
  }),
  hourlyScroll: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    paddingBottom: "12px",
  },
  hourCard: {
    minWidth: "100px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid #334155",
    textAlign: "center",
    flexShrink: 0,
  },
  sourceBar: (width) => ({
    height: "24px",
    width: `${width}%`,
    borderRadius: "12px",
    transition: "width 0.5s ease",
  }),
  confidenceRing: (pct, color) => ({
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: `conic-gradient(${color} ${pct * 360}deg, #334155 ${pct * 360}deg)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  }),
  ringInner: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  sourceRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  sourceName: {
    width: "160px",
    fontSize: "0.85rem",
    color: "#cbd5e1",
  },
  sourceTrend: (trend) => ({
    fontSize: "0.75rem",
    fontWeight: 600,
    color: trend === "up" ? "#ef4444" : trend === "down" ? "#22c55e" : "#94a3b8",
  }),
  weatherTile: (active) => ({
    padding: "12px",
    borderRadius: "12px",
    background: active ? "rgba(96,165,250,0.15)" : "rgba(15,23,42,0.4)",
    border: active ? "2px solid #60a5fa" : "1px solid #334155",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }),
  pollutantChip: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    background: `${color}20`,
    border: `1px solid ${color}40`,
    fontSize: "0.8rem",
    fontWeight: 600,
    color,
    margin: "4px",
  }),
  select: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  toggleRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  toggle: (active) => ({
    padding: "6px 14px",
    borderRadius: "20px",
    border: active ? "2px solid #60a5fa" : "1px solid #334155",
    background: active ? "rgba(96,165,250,0.15)" : "transparent",
    color: active ? "#60a5fa" : "#94a3b8",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  }),
  svgContainer: {
    width: "100%",
    overflow: "visible",
  },
  insightCard: {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid #334155",
    marginBottom: "12px",
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  insightBody: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    background: "#334155",
    marginTop: "6px",
  },
  progressFill: (pct, color) => ({
    height: "100%",
    width: `${pct}%`,
    borderRadius: "3px",
    background: color,
    transition: "width 0.5s ease",
  }),
  comparisonRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(15,23,42,0.4)",
    marginBottom: "8px",
  },
  badge: (color) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: `${color}25`,
    color,
    border: `1px solid ${color}40`,
  }),
  grid24: {
    display: "grid",
    gridTemplateColumns: "repeat(24, 1fr)",
    gap: "3px",
    marginBottom: "8px",
  },
  heatmapCell: (aqi) => {
    const cat = getAqiCategory(aqi);
    return {
      aspectRatio: "1",
      borderRadius: "4px",
      background: cat.color + "90",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.55rem",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
      transition: "transform 0.2s",
    };
  },
};

// ─── Mini Sparkline SVG ─────────────────────────────────────────────────────
function Sparkline({ data, color = "#60a5fa", width = 120, height = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} style={styles.svgContainer}>
      <polygon points={areaPoints} fill={`${color}20`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Forecast Line Chart SVG ────────────────────────────────────────────────
function ForecastChart({ hourly, pollutantId, showConfidence }) {
  const w = 800, h = 200, pad = 40;
  const data = hourly.map(h => h[pollutantId] || h.aqi);
  const max = Math.max(...data) * 1.15;
  const min = 0;
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
    val: v,
    hour: hourly[i]?.hour,
  }));
  const line = points.map(p => `${p.x},${p.y}`).join(" ");

  // Confidence band
  const upperPoints = hourly.map((hr, i) => {
    const y = h - pad - ((data[i] * (1 + (1 - hr.confidence) * 0.3)) / max) * (h - pad * 2);
    return `${pad + i * step},${y}`;
  }).join(" ");
  const lowerPoints = hourly.map((hr, i) => {
    const y = h - pad - ((data[i] * (1 - (1 - hr.confidence) * 0.3)) / max) * (h - pad * 2);
    return `${pad + i * step},${y}`;
  }).join(" ");

  const pollutant = POLLUTANTS.find(p => p.id === pollutantId) || POLLUTANTS[0];
  const safeLine = pollutant.safe;

  // Now line position (first 24 hours)
  const nowX = pad + 24 * step;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "220px" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line x1={pad} y1={h - pad - pct * (h - pad * 2)} x2={w - pad} y2={h - pad - pct * (h - pad * 2)} stroke="#334155" strokeWidth="0.5" />
          <text x={pad - 5} y={h - pad - pct * (h - pad * 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">
            {Math.round(max * pct)}
          </text>
        </g>
      ))}
      {/* Safe limit line */}
      <line x1={pad} y1={h - pad - (safeLine / max) * (h - pad * 2)} x2={w - pad} y2={h - pad - (safeLine / max) * (h - pad * 2)} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x={w - pad + 5} y={h - pad - (safeLine / max) * (h - pad * 2) + 4} fill="#22c55e" fontSize="9">Safe</text>
      {/* Confidence band */}
      {showConfidence && (
        <>
          <polygon points={`${upperPoints} ${lowerPoints.split(" ").reverse().join(" ")}`} fill={`${pollutant.color}15`} />
        </>
      )}
      {/* Now line */}
      <line x1={nowX} y1={h - pad} x2={nowX} y2={pad} stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <text x={nowX} y={pad - 5} fill="#60a5fa" fontSize="9" textAnchor="middle">Now</text>
      {/* Data line */}
      <polyline points={line} fill="none" stroke={pollutant.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Hour labels */}
      {[0, 12, 24, 36, 48, 60, 72].map(h => {
        const idx = Math.min(h, points.length - 1);
        return points[idx] ? (
          <text key={h} x={points[idx].x} y={h - pad + 16} fill="#64748b" fontSize="9" textAnchor="middle">
            +{h}h
          </text>
        ) : null;
      })}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AIPollutionForecast() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPollutant, setSelectedPollutant] = useState("aqi");
  const [showConfidence, setShowConfidence] = useState(true);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [forecastDays, setForecastDays] = useState(3);
  const [baseAqi] = useState(85);

  const hourly = useMemo(() => generateHourlyForecast(baseAqi), [baseAqi]);
  const daily = useMemo(() => aggregateDaily(hourly), [hourly]);
  const sources = useMemo(() => generateSources(), []);

  const currentAqi = hourly[0]?.aqi || 85;
  const currentCat = getAqiCategory(currentAqi);
  const avgConfidence = +(hourly.slice(0, 24).reduce((s, h) => s + h.confidence, 0) / 24).toFixed(2);

  const maxHourlyAqi = Math.max(...hourly.slice(0, forecastDays * 24).map(h => h.aqi));
  const minHourlyAqi = Math.min(...hourly.slice(0, forecastDays * 24).map(h => h.aqi));
  const avgAqi = Math.round(hourly.slice(0, forecastDays * 24).reduce((s, h) => s + h.aqi, 0) / (forecastDays * 24));

  const peakHour = hourly.slice(0, 72).reduce((max, h) => h.aqi > max.aqi ? h : max, hourly[0]);
  const cleanestHour = hourly.slice(0, 72).reduce((min, h) => h.aqi < min.aqi ? h : min, hourly[0]);

  const alertLevel = currentAqi <= 50 ? "good" : currentAqi <= 100 ? "moderate" : currentAqi <= 200 ? "unhealthy" : "severe";

  const alerts = useMemo(() => {
    const list = [];
    hourly.slice(0, 48).forEach((h, i) => {
      if (h.aqi > 150 && (i === 0 || hourly[i - 1].aqi <= 150)) {
        list.push({
          type: "warning",
          message: `AQI expected to exceed 150 at ${h.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          time: h.time,
        });
      }
      if (h.pm25 > 55) {
        list.push({
          type: "alert",
          message: `PM2.5 spike (${h.pm25} µg/m³) predicted at ${h.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          time: h.time,
        });
      }
    });
    return list.slice(0, 5);
  }, [hourly]);

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "hourly", label: "🕐 Hourly" },
    { id: "daily", label: "📅 Daily" },
    { id: "pollutants", label: "🧪 Pollutants" },
    { id: "sources", label: "🏭 Sources" },
    { id: "weather", label: "🌤️ Weather" },
    { id: "insights", label: "💡 AI Insights" },
  ];

  const renderOverview = () => (
    <div>
      {/* Alert Banner */}
      <div style={styles.alertBanner(alertLevel)}>
        <span style={{ fontSize: "1.5rem" }}>{currentCat.icon}</span>
        <div>
          <div>Air Quality: <strong style={{ color: currentCat.color }}>{currentCat.label}</strong> (AQI {currentAqi})</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            {alertLevel === "good" && "Air quality is satisfactory. No health risk."}
            {alertLevel === "moderate" && "Acceptable quality. Sensitive individuals may be affected."}
            {alertLevel === "unhealthy" && "Health effects possible for everyone. Limit outdoor exposure."}
            {alertLevel === "severe" && "Health emergency. Avoid all outdoor activities."}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={styles.kpiRow}>
        <div style={styles.kpi}>
          <div style={styles.kpiValue(currentCat.color)}>{currentAqi}</div>
          <div style={styles.kpiLabel}>Current AQI</div>
          <Sparkline data={hourly.slice(0, 24).map(h => h.aqi)} color={currentCat.color} />
        </div>
        <div style={styles.kpi}>
          <div style={styles.kpiValue("#ef4444")}>{maxHourlyAqi}</div>
          <div style={styles.kpiLabel}>Peak AQI ({forecastDays}d)</div>
          <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "4px" }}>
            at {peakHour.time.toLocaleTimeString([], { hour: "2-digit" })}
          </div>
        </div>
        <div style={styles.kpi}>
          <div style={styles.kpiValue("#22c55e")}>{minHourlyAqi}</div>
          <div style={styles.kpiLabel}>Best AQI ({forecastDays}d)</div>
          <div style={{ fontSize: "0.75rem", color: "#22c55e", marginTop: "4px" }}>
            at {cleanestHour.time.toLocaleTimeString([], { hour: "2-digit" })}
          </div>
        </div>
        <div style={styles.kpi}>
          <div style={styles.kpiValue("#60a5fa")}>{avgAqi}</div>
          <div style={styles.kpiLabel}>Average AQI</div>
          <div style={{ fontSize: "0.75rem", color: getAqiCategory(avgAqi).color, marginTop: "4px" }}>
            {getAqiCategory(avgAqi).icon} {getAqiCategory(avgAqi).label}
          </div>
        </div>
        <div style={styles.kpi}>
          <div style={styles.kpiValue("#a78bfa")}>{Math.round(avgConfidence * 100)}%</div>
          <div style={styles.kpiLabel}>Avg Confidence</div>
          <div style={styles.progressTrack}>
            <div style={styles.progressFill(avgConfidence * 100, "#a78bfa")} />
          </div>
        </div>
        <div style={styles.kpi}>
          <div style={{ fontSize: "1.5rem" }}>{hourly[0]?.weather.icon}</div>
          <div style={styles.kpiLabel}>{hourly[0]?.weather.label}</div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
            {hourly[0]?.temp}°C · {hourly[0]?.humidity}%
          </div>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📈</span> {forecastDays}-Day Forecast
        </div>
        <div style={styles.toggleRow}>
          <select
            value={selectedPollutant}
            onChange={e => setSelectedPollutant(e.target.value)}
            style={styles.select}
          >
            <option value="aqi">AQI (Composite)</option>
            {POLLUTANTS.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
          <button
            onClick={() => setShowConfidence(!showConfidence)}
            style={styles.toggle(showConfidence)}
          >
            {showConfidence ? "✅ Confidence Band" : "⬜ Confidence Band"}
          </button>
          {[1, 2, 3].map(d => (
            <button key={d} onClick={() => setForecastDays(d)} style={styles.toggle(forecastDays === d)}>
              {d}D
            </button>
          ))}
        </div>
        <ForecastChart hourly={hourly} pollutantId={selectedPollutant} showConfidence={showConfidence} />
      </div>

      {/* Daily Summary */}
      <div style={styles.grid3}>
        {daily.map((day, i) => (
          <div key={i} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 600 }}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : day.date.toLocaleDateString("en", { weekday: "long" })}</div>
              <span style={styles.badge(day.category.color)}>{day.category.icon} {day.category.label}</span>
            </div>
            <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>AVG</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: day.category.color }}>{day.avgAqi}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>HIGH</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444" }}>{day.maxAqi}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>LOW</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#22c55e" }}>{day.minAqi}</div>
              </div>
            </div>
            <Sparkline data={day.entries.map(e => e.aqi)} color={day.category.color} width={200} height={35} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginTop: "8px" }}>
              <span>Confidence: {Math.round(day.confidence * 100)}%</span>
              <span>{day.entries.length} readings</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>🚨</span> Forecast Alerts</div>
          {alerts.map((a, i) => (
            <div key={i} style={styles.insightCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={styles.badge(a.type === "warning" ? "#eab308" : "#ef4444")}>
                  {a.type === "warning" ? "⚠️ Warning" : "🔴 Alert"}
                </span>
                <span style={{ fontSize: "0.85rem" }}>{a.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHourly = () => {
    const hours = hourly.slice(0, forecastDays * 24);
    return (
      <div>
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>🕐</span> Hourly Forecast ({hours.length} hours)</div>
          <div style={styles.hourlyScroll}>
            {hours.map((h, i) => {
              const cat = getAqiCategory(h.aqi);
              return (
                <div key={i} style={{ ...styles.hourCard, borderColor: cat.color + "40" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    {i === 0 ? "Now" : `+${i}h`}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                    {h.time.toLocaleTimeString([], { hour: "2-digit" })}
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: cat.color }}>{h.aqi}</div>
                  <div style={{ fontSize: "0.65rem", color: cat.color }}>{cat.label}</div>
                  <div style={{ marginTop: "4px" }}>{h.weather.icon}</div>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>{h.windSpeed}m/s {h.windDir}</div>
                  <div style={{ ...styles.progressTrack, marginTop: "6px" }}>
                    <div style={styles.progressFill(h.confidence * 100, "#a78bfa")} />
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#64748b" }}>{Math.round(h.confidence * 100)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>🗺️</span> 72-Hour AQI Heatmap</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px" }}>
            Rows = days · Columns = hours (0–23)
          </div>
          {[0, 1, 2].map(day => (
            <div key={day}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                {day === 0 ? "Today" : day === 1 ? "Tomorrow" : `Day ${day + 1}`}
              </div>
              <div style={styles.grid24}>
                {Array.from({ length: 24 }, (_, h) => {
                  const hr = hourly[day * 24 + h];
                  return hr ? (
                    <div key={h} title={`${hr.time.toLocaleTimeString([], { hour: "2-digit" })}: AQI ${hr.aqi}`} style={styles.heatmapCell(hr.aqi)}>
                      {hr.aqi}
                    </div>
                  ) : <div key={h} style={{ background: "#1e293b", borderRadius: "4px" }} />;
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
            {AQI_CATEGORIES.map(c => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: c.color + "90" }} />
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Detail Table */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>📋</span> Detailed Hourly Data</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #334155" }}>
                  {["Time", "AQI", "PM2.5", "PM10", "O₃", "NO₂", "Temp", "Humidity", "Wind", "Conf"].map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.slice(0, 24).map((h, i) => {
                  const cat = getAqiCategory(h.aqi);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "6px", color: "#94a3b8" }}>{h.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ padding: "6px" }}><span style={styles.badge(cat.color)}>{h.aqi}</span></td>
                      <td style={{ padding: "6px", color: "#ef4444" }}>{h.pm25}</td>
                      <td style={{ padding: "6px", color: "#f97316" }}>{h.pm10}</td>
                      <td style={{ padding: "6px", color: "#8b5cf6" }}>{h.o3}</td>
                      <td style={{ padding: "6px", color: "#06b6d4" }}>{h.no2}</td>
                      <td style={{ padding: "6px", color: "#94a3b8" }}>{h.temp}°C</td>
                      <td style={{ padding: "6px", color: "#94a3b8" }}>{h.humidity}%</td>
                      <td style={{ padding: "6px", color: "#94a3b8" }}>{h.windSpeed} {h.windDir}</td>
                      <td style={{ padding: "6px", color: "#a78bfa" }}>{Math.round(h.confidence * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDaily = () => (
    <div>
      {daily.map((day, i) => (
        <div key={i} style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {i === 0 ? "📅 Today" : i === 1 ? "📅 Tomorrow" : `📅 ${day.date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}`}
              </span>
            </div>
            <span style={styles.badge(day.category.color)}>{day.category.icon} {day.category.label}</span>
          </div>

          {/* Hourly bars for the day */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "80px", marginBottom: "16px" }}>
            {day.entries.map((h, j) => {
              const cat = getAqiCategory(h.aqi);
              const pct = (h.aqi / 300) * 100;
              return (
                <div key={j} title={`${h.hour}:00 — AQI ${h.aqi}`} style={{
                  flex: 1,
                  height: `${Math.min(100, pct)}%`,
                  background: cat.color + "cc",
                  borderRadius: "3px 3px 0 0",
                  minHeight: "4px",
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginBottom: "12px" }}>
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
            {[
              { label: "Average", value: day.avgAqi, color: day.category.color },
              { label: "Peak", value: day.maxAqi, color: "#ef4444" },
              { label: "Best", value: day.minAqi, color: "#22c55e" },
              { label: "Range", value: day.maxAqi - day.minAqi, color: "#eab308" },
              { label: "Confidence", value: `${Math.round(day.confidence * 100)}%`, color: "#a78bfa" },
            ].map((s, j) => (
              <div key={j} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{s.label}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPollutants = () => (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}><span>🧪</span> Pollutant Forecast Comparison</div>
        <svg viewBox="0 0 800 300" style={{ width: "100%", height: "320px" }}>
          {POLLUTANTS.map((p, pi) => {
            const data = hourly.slice(0, 48).map(h => (h[p.id] / p.max) * 100);
            const step = 760 / (data.length - 1);
            const pts = data.map((v, i) => `${40 + i * step},${260 - v * 2.2}`).join(" ");
            return (
              <g key={p.id}>
                <polyline points={pts} fill="none" stroke={p.color} strokeWidth="2" opacity="0.8" />
                <text x={780} y={260 - data[data.length - 1] * 2.2 + 4} fill={p.color} fontSize="10" fontWeight="600">{p.name}</text>
              </g>
            );
          })}
          {/* Now line */}
          <line x1={40 + 24 * (760 / 47)} y1="20" x2={40 + 24 * (760 / 47)} y2="260" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" />
          <text x={40 + 24 * (760 / 47)} y="16" fill="#60a5fa" fontSize="9" textAnchor="middle">Now</text>
          {/* X axis */}
          {[0, 12, 24, 36, 48].map(h => (
            <text key={h} x={40 + (h / 47) * 760} y="280" fill="#64748b" fontSize="9" textAnchor="middle">+{h}h</text>
          ))}
        </svg>
      </div>

      <div style={styles.grid3}>
        {POLLUTANTS.map(p => {
          const currentVal = hourly[0]?.[p.id] || 0;
          const avg48 = Math.round(hourly.slice(0, 48).reduce((s, h) => s + (h[p.id] || 0), 0) / 48);
          const max48 = Math.max(...hourly.slice(0, 48).map(h => h[p.id] || 0));
          const pctOfMax = (currentVal / p.max) * 100;
          const isSafe = currentVal <= p.safe;
          return (
            <div key={p.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontWeight: 700, color: p.color }}>{p.name}</div>
                <span style={styles.badge(isSafe ? "#22c55e" : "#ef4444")}>{isSafe ? "✅ Safe" : "⚠️ Exceeds"}</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: p.color }}>{currentVal} <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{p.unit}</span></div>
              <div style={styles.progressTrack}>
                <div style={styles.progressFill(pctOfMax, p.color)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginTop: "8px" }}>
                <span>Safe: {p.safe}</span>
                <span>Max: {p.max}</span>
              </div>
              <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Avg 48h</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: p.color }}>{avg48}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Peak 48h</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ef4444" }}>{max48}</div>
                </div>
              </div>
              <Sparkline data={hourly.slice(0, 48).map(h => h[p.id] || 0)} color={p.color} width={200} height={30} />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSources = () => (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}><span>🏭</span> Pollution Sources & Contributions</div>
        {sources.map((s, i) => (
          <div key={i} style={styles.sourceRow}>
            <span style={{ fontSize: "1.2rem" }}>{s.icon}</span>
            <div style={styles.sourceName}>{s.name}</div>
            <div style={{ flex: 1 }}>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill(s.contribution, i < 2 ? "#ef4444" : i < 4 ? "#eab308" : "#22c55e"),
                  borderRadius: "12px",
                }} />
              </div>
            </div>
            <div style={{ width: "40px", textAlign: "right", fontWeight: 700, color: i < 2 ? "#ef4444" : i < 4 ? "#eab308" : "#22c55e" }}>
              {s.contribution}%
            </div>
            <div style={styles.sourceTrend(s.trend)}>
              {s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "●"} {s.change > 0 ? "+" : ""}{s.change}%
            </div>
          </div>
        ))}
      </div>

      {/* Source Breakdown Pie */}
      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>📊</span> Contribution Distribution</div>
          <svg viewBox="0 0 200 200" style={{ width: "200px", height: "200px", margin: "0 auto", display: "block" }}>
            {(() => {
              let acc = 0;
              const colors = ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#06b6d4", "#22c55e"];
              return sources.map((s, i) => {
                const start = acc;
                acc += s.contribution;
                const startAngle = (start / 100) * 2 * Math.PI - Math.PI / 2;
                const endAngle = (acc / 100) * 2 * Math.PI - Math.PI / 2;
                const x1 = 100 + 80 * Math.cos(startAngle);
                const y1 = 100 + 80 * Math.sin(startAngle);
                const x2 = 100 + 80 * Math.cos(endAngle);
                const y2 = 100 + 80 * Math.sin(endAngle);
                const large = s.contribution > 50 ? 1 : 0;
                return (
                  <path key={i} d={`M100,100 L${x1},${y1} A80,80 0 ${large},1 ${x2},${y2} Z`} fill={colors[i]} opacity="0.8" />
                );
              });
            })()}
            <circle cx="100" cy="100" r="40" fill="#1e293b" />
            <text x="100" y="105" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">6</text>
            <text x="100" y="118" textAnchor="middle" fill="#94a3b8" fontSize="8">sources</text>
          </svg>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
            {sources.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#06b6d4", "#22c55e"][i] }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}><span>📈</span> Source Trends</div>
          <svg viewBox="0 0 300 200" style={{ width: "100%", height: "200px" }}>
            {sources.map((s, i) => {
              const colors = ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#06b6d4", "#22c55e"];
              const baseY = 20 + i * 30;
              return (
                <g key={i}>
                  <text x="5" y={baseY + 4} fill="#94a3b8" fontSize="8">{s.name.slice(0, 12)}</text>
                  <rect x="100" y={baseY - 6} width={s.contribution * 1.8} height="12" rx="6" fill={colors[i]} opacity="0.7" />
                  <text x={100 + s.contribution * 1.8 + 5} y={baseY + 4} fill={colors[i]} fontSize="9" fontWeight="600">
                    {s.contribution}%
                  </text>
                  <text x={280} y={baseY + 4} fill={s.trend === "up" ? "#ef4444" : s.trend === "down" ? "#22c55e" : "#64748b"} fontSize="9">
                    {s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "●"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );

  const renderWeather = () => (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}><span>🌤️</span> Weather Impact on Air Quality</div>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "16px" }}>
          Weather conditions significantly affect pollutant dispersion. Select a condition to see its impact on forecast.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
          {WEATHER_CONDITIONS.map((w, i) => (
            <SelectionButton
              key={i}
              selected={selectedWeather === i}
              onSelect={() => setSelectedWeather(selectedWeather === i ? null : i)}
              label={`Weather condition: ${w.label}, dispersal ${w.dispersal.toFixed(1)}x`}
              style={styles.weatherTile(selectedWeather === i)}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{w.icon}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0" }}>{w.label}</div>
              <div style={{ fontSize: "0.7rem", color: w.dispersal > 1 ? "#22c55e" : w.dispersal > 0.5 ? "#eab308" : "#ef4444", marginTop: "4px" }}>
                Dispersal: {w.dispersal.toFixed(1)}x
              </div>
            </SelectionButton>
          ))}
        </div>
      </div>

      {selectedWeather !== null && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{WEATHER_CONDITIONS[selectedWeather].icon}</span>
            {WEATHER_CONDITIONS[selectedWeather].label} — Impact Analysis
          </div>
          <div style={styles.grid2}>
            <div>
              <h4 style={{ color: "#e2e8f0", marginBottom: "8px" }}>Effect on Pollutants</h4>
              {POLLUTANTS.map(p => {
                const impact = WEATHER_CONDITIONS[selectedWeather].dispersal;
                const adjusted = Math.round(p.max * 0.4 / impact);
                return (
                  <div key={p.id} style={styles.comparisonRow}>
                    <span style={{ width: "60px", fontWeight: 600, color: p.color, fontSize: "0.85rem" }}>{p.name}</span>
                    <div style={{ flex: 1 }}>
                      <div style={styles.progressTrack}>
                        <div style={styles.progressFill((adjusted / p.max) * 100, p.color)} />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8", width: "60px", textAlign: "right" }}>{adjusted} {p.unit}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <h4 style={{ color: "#e2e8f0", marginBottom: "8px" }}>Dispersion Factors</h4>
              {[
                { label: "Wind Speed", value: WEATHER_CONDITIONS[selectedWeather].dispersal > 1 ? "Strong" : "Weak", icon: "💨" },
                { label: "Temperature", value: "Inversion risk", icon: "🌡️" },
                { label: "Rain Washout", value: WEATHER_CONDITIONS[selectedWeather].label.includes("Rain") ? "Active" : "None", icon: "🌧️" },
                { label: "Mixing Height", value: WEATHER_CONDITIONS[selectedWeather].dispersal > 0.7 ? "High" : "Low", icon: "📏" },
                { label: "Ventilation", value: WEATHER_CONDITIONS[selectedWeather].dispersal > 1 ? "Good" : "Poor", icon: "🌀" },
              ].map((f, i) => (
                <div key={i} style={styles.comparisonRow}>
                  <span style={{ fontSize: "1.1rem" }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>{f.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Conditions */}
      <div style={styles.card}>
        <div style={styles.cardTitle}><span>📍</span> Current Conditions</div>
        <div style={styles.kpiRow}>
          {[
            { label: "Temperature", value: `${hourly[0]?.temp}°C`, icon: "🌡️" },
            { label: "Humidity", value: `${hourly[0]?.humidity}%`, icon: "💧" },
            { label: "Wind", value: `${hourly[0]?.windSpeed} m/s`, icon: "💨" },
            { label: "Direction", value: hourly[0]?.windDir, icon: "🧭" },
            { label: "Weather", value: hourly[0]?.weather.label, icon: hourly[0]?.weather.icon },
            { label: "Dispersal", value: `${hourly[0]?.weather.dispersal.toFixed(1)}x`, icon: "🌀" },
          ].map((c, i) => (
            <div key={i} style={styles.kpi}>
              <div style={{ fontSize: "1.3rem" }}>{c.icon}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0" }}>{c.value}</div>
              <div style={styles.kpiLabel}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    const insights = [
      {
        icon: "🔬",
        title: "Peak Pollution Window",
        body: `AQI is expected to peak at ${peakHour.aqi} around ${peakHour.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on ${peakHour.time.toLocaleDateString("en", { weekday: "long" })}. Consider avoiding outdoor activities during this period. Traffic emissions and atmospheric conditions combine to create higher pollutant concentrations.`,
        color: "#ef4444",
      },
      {
        icon: "🌬️",
        title: "Best Air Quality Window",
        body: `Cleanest air predicted at ${cleanestHour.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} with AQI ${cleanestHour.aqi}. This is the optimal time for outdoor exercise, running, or any activities that require extended time outside.`,
        color: "#22c55e",
      },
      {
        icon: "📅",
        title: "3-Day Trend Analysis",
        body: `The forecast shows ${daily[0]?.avgAqi > daily[2]?.avgAqi ? "improving" : "worsening"} air quality over the next 3 days. Average AQI shifts from ${daily[0]?.avgAqi} today to ${daily[2]?.avgAqi} on ${daily[2]?.date.toLocaleDateString("en", { weekday: "long" })}. ${daily[0]?.avgAqi > daily[2]?.avgAqi ? "Weather patterns suggest better pollutant dispersion ahead." : "Atmospheric conditions may trap pollutants closer to ground level."}`,
        color: "#60a5fa",
      },
      {
        icon: "⚠️",
        title: "Vulnerable Population Advisory",
        body: currentAqi > 100
          ? `Current AQI of ${currentAqi} exceeds safe levels for sensitive groups. Children under 14, adults over 65, and individuals with respiratory or cardiovascular conditions should limit outdoor exposure to under 30 minutes. Keep windows closed and use air filtration if available.`
          : `Current air quality is acceptable for most people. Sensitive individuals should monitor conditions as AQI may fluctuate. Standard precautions are sufficient for outdoor activities.`,
        color: "#eab308",
      },
      {
        icon: "🏭",
        title: "Dominant Source Analysis",
        body: `${sources[0].name} remains the largest contributor at ${sources[0].contribution}%, followed by ${sources[1].name} at ${sources[1].contribution}%. ${sources[0].trend === "up" ? "Traffic emissions are trending upward, likely due to rush-hour congestion patterns." : "Primary sources show stable or declining trends."} Policy interventions targeting these sources would have the greatest impact on improving air quality.`,
        color: "#8b5cf6",
      },
      {
        icon: "🧠",
        title: "AI Model Confidence",
        body: `Forecast confidence starts at ${Math.round(avgConfidence * 100)}% for the first 24 hours and decreases with time. Short-term predictions (0-12h) are highly reliable. For multi-day forecasts, confidence drops to ~60% due to weather uncertainty. Weather-dependent pollutant dispersion models are the primary source of uncertainty.`,
        color: "#06b6d4",
      },
    ];

    return (
      <div>
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>💡</span> AI-Powered Insights</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ ...styles.insightCard, borderLeft: `4px solid ${ins.color}` }}>
              <div style={styles.insightHeader}>
                <span>{ins.icon}</span>
                <span style={{ color: ins.color }}>{ins.title}</span>
              </div>
              <div style={styles.insightBody}>{ins.body}</div>
            </div>
          ))}
        </div>

        {/* Health Recommendations */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><span>🏥</span> Health Recommendations</div>
          <div style={styles.grid2}>
            {[
              {
                activity: "Outdoor Exercise",
                icon: "🏃",
                current: currentAqi <= 50 ? "Green Light" : currentAqi <= 100 ? "Moderate" : "Not Recommended",
                color: currentAqi <= 50 ? "#22c55e" : currentAqi <= 100 ? "#eab308" : "#ef4444",
                tip: currentAqi <= 50 ? "Great conditions for outdoor workouts!" : currentAqi <= 100 ? "Consider reducing intensity. Take breaks." : "Switch to indoor exercise today.",
              },
              {
                activity: "Children Playing",
                icon: "👶",
                current: currentAqi <= 75 ? "Safe" : "Caution",
                color: currentAqi <= 75 ? "#22c55e" : "#eab308",
                tip: currentAqi <= 75 ? "Safe for outdoor play." : "Limit prolonged outdoor play. Watch for symptoms.",
              },
              {
                activity: "Elderly Walking",
                icon: "👴",
                current: currentAqi <= 50 ? "Safe" : currentAqi <= 100 ? "Limit Time" : "Avoid",
                color: currentAqi <= 50 ? "#22c55e" : currentAqi <= 100 ? "#eab308" : "#ef4444",
                tip: currentAqi <= 50 ? "Good conditions for walking." : "Walk during cleaner hours (early morning).",
              },
              {
                activity: "Window Ventilation",
                icon: "🪟",
                current: currentAqi <= 75 ? "Recommended" : "Keep Closed",
                color: currentAqi <= 75 ? "#22c55e" : "#ef4444",
                tip: currentAqi <= 75 ? "Open windows for fresh air circulation." : "Keep windows closed. Use air purifier.",
              },
            ].map((r, i) => (
              <div key={i} style={{ ...styles.insightCard, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>{r.icon}</span>
                  <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.activity}</span>
                  <span style={styles.badge(r.color)}>{r.current}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{r.tip}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 AI Pollution Forecast</h1>
        <p style={styles.subtitle}>
          Predictive air quality forecasting powered by AI · {forecastDays * 24}-hour predictions with confidence intervals
        </p>
      </div>

      <div style={styles.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={styles.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "hourly" && renderHourly()}
      {activeTab === "daily" && renderDaily()}
      {activeTab === "pollutants" && renderPollutants()}
      {activeTab === "sources" && renderSources()}
      {activeTab === "weather" && renderWeather()}
      {activeTab === "insights" && renderInsights()}

      <div style={{ textAlign: "center", padding: "24px 0", color: "#475569", fontSize: "0.75rem" }}>
        🤖 AI Pollution Forecast · Model v2.4 · Data refreshes hourly · Confidence intervals indicate prediction reliability
      </div>
    </div>
  );
}
