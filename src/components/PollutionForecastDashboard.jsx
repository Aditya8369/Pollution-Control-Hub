import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const AQI_LEVELS = [
  { min: 0, max: 50, label: "Good", color: "#00e400", bg: "rgba(0,228,0,0.1)", icon: "😊", health: "Air quality is satisfactory" },
  { min: 51, max: 100, label: "Moderate", color: "#ffff00", bg: "rgba(255,255,0,0.1)", icon: "😐", health: "Acceptable; moderate concern for sensitive groups" },
  { min: 101, max: 150, label: "Unhealthy (SG)", color: "#ff7e00", bg: "rgba(255,126,0,0.1)", icon: "😷", health: "Sensitive groups may experience health effects" },
  { min: 151, max: 200, label: "Unhealthy", color: "#ff0000", bg: "rgba(255,0,0,0.1)", icon: "🤢", health: "Everyone may begin to experience health effects" },
  { min: 201, max: 300, label: "Very Unhealthy", color: "#8f3f97", bg: "rgba(143,63,151,0.1)", icon: "🚨", health: "Health alert: everyone may experience serious effects" },
  { min: 301, max: 500, label: "Hazardous", color: "#7e0023", bg: "rgba(126,0,35,0.1)", icon: "☠️", health: "Emergency conditions; entire population affected" },
];

const POLLUTANTS = ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"];

const FORECAST_HOURS = [1, 2, 3, 6, 12, 24, 48, 72];

const WEATHER_ICONS = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  stormy: "⛈️",
  windy: "💨",
  foggy: "🌫️",
  snowy: "❄️",
};

const ADVISORY_LEVELS = {
  safe: { label: "Safe to Go Outside", color: "#10b981", icon: "✅", bg: "rgba(16,185,129,0.1)" },
  moderate: { label: "Moderate Caution", color: "#f59e0b", icon: "⚠️", bg: "rgba(245,158,11,0.1)" },
  unhealthy: { label: "Limit Outdoor Activity", color: "#ef4444", icon: "🛑", bg: "rgba(239,68,68,0.1)" },
  hazardous: { label: "Stay Indoors", color: "#7e0023", icon: "🚨", bg: "rgba(126,0,35,0.1)" },
};

// ─── Sample Data ────────────────────────────────────────────────────────────

function generateForecastData() {
  const baseAQI = 85;
  const data = [];
  const now = new Date("2026-08-30T12:00:00");

  for (let h = 0; h <= 72; h++) {
    const time = new Date(now.getTime() + h * 3600 * 1000);
    const hour = time.getHours();
    const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isNight = hour >= 21 || hour <= 5;
    const dayNightFactor = isNight ? -15 : isRush ? 20 : 5;
    const dailyVariation = Math.sin((h / 24) * Math.PI * 2 - Math.PI / 2) * 12;
    const noise = (Math.random() - 0.5) * 10;
    const trend = h > 48 ? -3 : h > 24 ? 2 : 0;
    const aqi = Math.max(10, Math.min(300, Math.round(baseAQI + dayNightFactor + dailyVariation + noise + trend)));

    const pm25 = Math.round(aqi * 0.45 + (Math.random() - 0.5) * 8);
    const pm10 = Math.round(pm25 * 1.8 + (Math.random() - 0.5) * 10);
    const o3 = Math.round(aqi * 0.35 + (Math.random() - 0.5) * 6);
    const no2 = Math.round(aqi * 0.25 + (Math.random() - 0.5) * 5);
    const so2 = Math.round(aqi * 0.08 + (Math.random() - 0.5) * 2);
    const co = +(aqi * 0.015 + (Math.random() - 0.5) * 0.3).toFixed(1);

    const weathers = ["sunny", "cloudy", "windy", "rainy", "foggy"];
    const weather = weathers[Math.floor((Math.sin(h / 12) + 1) / 2 * weathers.length)];
    const temp = Math.round(28 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 6 + (Math.random() - 0.5) * 2);
    const humidity = Math.round(65 + Math.sin((hour - 14) / 24 * Math.PI * 2) * 15 + (Math.random() - 0.5) * 5);
    const windSpeed = +(5 + Math.sin(h / 8) * 3 + (Math.random() - 0.5) * 2).toFixed(1);
    const windDir = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)];
    const pressure = Math.round(1013 + Math.sin(h / 36) * 5);
    const visibility = Math.round(10 - (aqi / 300) * 8 + (Math.random() - 0.5) * 2);

    data.push({
      hour: h,
      time: time.toISOString(),
      timeLabel: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      dateLabel: time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      aqi,
      pm25, pm10, o3, no2, so2, co,
      weather,
      temp, humidity, windSpeed, windDir, pressure, visibility,
      confidence: Math.max(50, 98 - h * 0.7),
    });
  }
  return data;
}

const FORECAST_DATA = generateForecastData();

const HIGHLIGHT_HOURS = [0, 6, 12, 18, 24, 36, 48, 60, 72];

const HOURLY_INSIGHTS = [
  { hour: 0, title: "Night-time Dip", desc: "AQI typically drops 15-20 points after midnight as traffic decreases", icon: "🌙" },
  { hour: 6, title: "Morning Rush Begins", desc: "Traffic emissions start rising — expect PM2.5 and NO2 to climb", icon: "🌅" },
  { hour: 12, title: "Peak Ozone Hours", desc: "UV-driven photochemistry peaks midday, elevating ground-level ozone", icon: "☀️" },
  { hour: 18, title: "Evening Commute Peak", desc: "Second traffic rush pushes AQI up 15-25 points in urban areas", icon: "🌆" },
  { hour: 24, title: "Next-Day Outlook", desc: "Forecast confidence drops to ~82% — meteorological shifts may alter predictions", icon: "📅" },
  { hour: 48, title: "Two-Day Trend", desc: "Longer-range forecast showing gradual improvement with incoming fresh air", icon: "📈" },
  { hour: 72, title: "Three-Day Window", desc: "Extended forecast with ~50% confidence — plan outdoor activities accordingly", icon: "🗓️" },
];

const HEALTH_RECOMMENDATIONS = [
  { aqiRange: [0, 50], icon: "🏃", title: "Enjoy Outdoor Activities", tips: ["Perfect for jogging, cycling, outdoor sports", "Windows can stay open for ventilation", "No health precautions needed", "Great day for outdoor events"] },
  { aqiRange: [51, 100], icon: "🚶", title: "Moderate Outdoor Activity", tips: ["Unusually sensitive people should reduce prolonged outdoor exertion", "Consider indoor exercise if you're sensitive to air pollution", "Close windows during rush hours", "Monitor children's outdoor play time"] },
  { aqiRange: [101, 150], icon: "🏠", title: "Limit Strenuous Outdoor Activity", tips: ["Sensitive groups: reduce prolonged outdoor exertion", "Move intense workouts indoors", "Use air purifiers in living spaces", "Keep windows closed; use recirculated air in cars"] },
  { aqiRange: [151, 200], icon: "😷", title: "Avoid Outdoor Exertion", tips: ["Everyone: reduce prolonged outdoor exertion", "Wear N95 masks if going outside", "Run air purifiers at highest setting", "Avoid exercising near busy roads"] },
  { aqiRange: [201, 500], icon: "🚨", title: "Stay Indoors", tips: ["Avoid all outdoor physical activities", "Keep all windows and doors closed", "Set HVAC to recirculate mode", "Monitor emergency broadcasts for updates"] },
];

const SOURCES_DATA = [
  { name: "Traffic Emissions", pct: 35, color: "#ef4444", icon: "🚗", trend: "up" },
  { name: "Industrial", pct: 25, color: "#f59e0b", icon: "🏭", trend: "stable" },
  { name: "Construction", pct: 15, color: "#8b5cf6", icon: "🏗️", trend: "down" },
  { name: "Residential", pct: 12, color: "#3b82f6", icon: "🏠", trend: "stable" },
  { name: "Natural/Dust", pct: 8, color: "#06b6d4", icon: "🌍", trend: "up" },
  { name: "Agricultural", pct: 5, color: "#10b981", icon: "🌾", trend: "down" },
];

const ZONE_COMPARISONS = [
  { name: "Residential", aqi: 62, trend: -5, icon: "🏘️" },
  { name: "Commercial", aqi: 98, trend: 3, icon: "🏢" },
  { name: "Industrial", aqi: 145, trend: 8, icon: "🏭" },
  { name: "Traffic Corridor", aqi: 112, trend: 5, icon: "🛣️" },
  { name: "Park/Green", aqi: 45, trend: -2, icon: "🌳" },
  { name: "Downtown", aqi: 108, trend: 2, icon: "🏙️" },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

function getAqiLevel(aqi) {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

function getAdvisory(aqi) {
  if (aqi <= 50) return ADVISORY_LEVELS.safe;
  if (aqi <= 100) return ADVISORY_LEVELS.moderate;
  if (aqi <= 200) return ADVISORY_LEVELS.unhealthy;
  return ADVISORY_LEVELS.hazardous;
}

function formatHour(h) {
  if (h === 0) return "Now";
  if (h < 24) return `+${h}h`;
  return `+${Math.round(h / 24)}d`;
}

// ─── Chart Components ───────────────────────────────────────────────────────

function AQITrendChart({ data, highlight, width = 800, height = 220 }) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxAQI = Math.max(...data.map((d) => d.aqi), 200);
  const getX = (i) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v) => padding.top + chartH - (v / maxAQI) * chartH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.aqi)}`).join(" ");

  const areaD = `${pathD} L ${getX(data.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {/* AQI zone backgrounds */}
      {AQI_LEVELS.slice(0, 4).map((level) => {
        const y1 = getY(Math.min(level.max, maxAQI));
        const y2 = getY(level.min);
        return (
          <rect key={level.label} x={padding.left} y={y1} width={chartW} height={Math.max(0, y2 - y1)} fill={level.color} opacity={0.05} />
        );
      })}

      {/* Grid lines */}
      {[0, 50, 100, 150, 200].map((v) => (
        <g key={v}>
          <line x1={padding.left} y1={getY(v)} x2={padding.left + chartW} y2={getY(v)} stroke="rgba(255,255,255,0.06)" />
          <text x={padding.left - 8} y={getY(v) + 4} textAnchor="end" fill="rgba(148,163,184,0.6)" fontSize="10">
            {v}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#aqiGradient)" opacity={0.3} />
      <defs>
        <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* AQI line */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points for highlighted hours */}
      {data.map(
        (d, i) =>
          highlight.includes(d.hour) && (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.aqi)} r="5" fill={getAqiLevel(d.aqi).color} stroke="#0f172a" strokeWidth="2" />
              <text x={getX(i)} y={getY(d.aqi) - 10} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">
                {d.aqi}
              </text>
            </g>
          )
      )}

      {/* X-axis labels */}
      {data.map(
        (d, i) =>
          i % 6 === 0 && (
            <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="9">
              {d.timeLabel}
            </text>
          )
      )}

      {/* Confidence decay zone */}
      <rect x={getX(data.length - 24)} y={padding.top} width={getX(24)} height={chartH} fill="rgba(255,255,255,0.02)" />
      <text x={getX(data.length - 12)} y={padding.top + 12} textAnchor="middle" fill="rgba(148,163,184,0.3)" fontSize="9">
        Lower confidence →
      </text>
    </svg>
  );
}

function PollutantChart({ data, pollutant, color, height = 120 }) {
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const chartW = 300 - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const points = data.slice(0, 25);
  const maxVal = Math.max(...points.map((d) => d[pollutant])) * 1.2;

  const getX = (i) => padding.left + (i / (points.length - 1)) * chartW;
  const getY = (v) => padding.top + chartH - (v / maxVal) * chartH;

  const pathD = points.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[pollutant])}`).join(" ");

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color }}>{pollutant}</span>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          Current: <strong style={{ color }}>{points[0][pollutant]}</strong>
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 300 ${height}`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={getX(0)} cy={getY(points[0][pollutant])} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
      </svg>
    </div>
  );
}

function SourceDonutChart({ sources, size = 160 }) {
  const center = size / 2;
  const radius = (size - 20) / 2;
  const strokeWidth = 16;
  let cumulativeAngle = -90;

  return (
    <svg width={size} height={size}>
      {sources.map((source) => {
        const angle = (source.pct / 100) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;
        cumulativeAngle = endAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        return <path key={source.name} d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke={source.color} strokeWidth={strokeWidth} strokeLinecap="round" />;
      })}
      <text x={center} y={center - 6} textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="800">
        100%
      </text>
      <text x={center} y={center + 12} textAnchor="middle" fill="#94a3b8" fontSize="10">
        Total Sources
      </text>
    </svg>
  );
}

function ConfidenceMeter({ confidence }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${confidence}%`,
            background: confidence > 80 ? "#10b981" : confidence > 60 ? "#f59e0b" : "#ef4444",
            borderRadius: "3px",
          }}
        />
      </div>
      <span style={{ fontSize: "10px", color: confidence > 80 ? "#10b981" : confidence > 60 ? "#f59e0b" : "#ef4444", fontWeight: "600", minWidth: "32px" }}>
        {Math.round(confidence)}%
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PollutionForecastDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedHour, setSelectedHour] = useState(0);
  const [hoveredSource, setHoveredSource] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey((k) => k + 1);
  }, [activeTab]);

  const currentData = FORECAST_DATA[selectedHour];
  const aqiLevel = getAqiLevel(currentData.aqi);
  const advisory = getAdvisory(currentData.aqi);

  const next24h = FORECAST_DATA.filter((d) => d.hour <= 24);
  const next72h = FORECAST_DATA;
  const peakAQI = useMemo(() => Math.max(...FORECAST_DATA.map((d) => d.aqi)), []);
  const avgAQI = useMemo(() => Math.round(FORECAST_DATA.reduce((s, d) => s + d.aqi, 0) / FORECAST_DATA.length), []);
  const minAQI = useMemo(() => Math.min(...FORECAST_DATA.map((d) => d.aqi)), []);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "hourly", label: "Hourly Detail", icon: "⏰" },
    { id: "pollutants", label: "Pollutants", icon: "🔬" },
    { id: "sources", label: "Sources & Zones", icon: "🏭" },
    { id: "health", label: "Health Advisory", icon: "❤️" },
  ];

  const cardStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "16px",
    padding: "20px",
  };

  const btnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "10px",
    border: active ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
    background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
    color: active ? "#3b82f6" : "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "24px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "800",
              margin: "0 0 8px",
              background: "linear-gradient(135deg, #3b82f6, #10b981)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🌍 Pollution Forecast Dashboard
          </h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>24–72 hour air quality predictions with AI-powered insights</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ padding: "8px 16px", borderRadius: "12px", background: aqiLevel.bg, border: `1px solid ${aqiLevel.color}40` }}>
            <span style={{ fontSize: "20px" }}>{aqiLevel.icon}</span>
            <span style={{ marginLeft: "6px", fontSize: "14px", fontWeight: "700", color: aqiLevel.color }}>{aqiLevel.label}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button key={tab.id} style={{ ...btnStyle(activeTab === tab.id), padding: "10px 20px" }} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          {/* Main AQI Chart */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>📈 72-Hour AQI Forecast</h3>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Confidence decays beyond 24h</span>
            </div>
            <AQITrendChart data={next72h} highlight={HIGHLIGHT_HOURS} />
          </div>

          {/* Sidebar Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Current AQI */}
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: "48px", fontWeight: "900", color: aqiLevel.color }}>{currentData.aqi}</div>
              <div style={{ fontSize: "14px", color: aqiLevel.color, fontWeight: "600" }}>{aqiLevel.label}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{aqiLevel.health}</div>
              <div style={{ marginTop: "12px" }}>
                <span style={{ fontSize: "24px" }}>{WEATHER_ICONS[currentData.weather]}</span>
                <span style={{ marginLeft: "8px", fontSize: "14px" }}>{currentData.temp}°C</span>
                <span style={{ marginLeft: "8px", fontSize: "12px", color: "#94a3b8" }}>{currentData.humidity}% 💧</span>
              </div>
            </div>

            {/* Advisory */}
            <div style={{ ...cardStyle, background: advisory.bg, border: `1px solid ${advisory.color}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px" }}>{advisory.icon}</span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: advisory.color }}>{advisory.label}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                {advisory === ADVISORY_LEVELS.safe && "Great time for outdoor activities!"}
                {advisory === ADVISORY_LEVELS.moderate && "Sensitive groups should take precautions"}
                {advisory === ADVISORY_LEVELS.unhealthy && "Reduce prolonged outdoor exertion"}
                {advisory === ADVISORY_LEVELS.hazardous && "Stay indoors with windows closed"}
              </div>
            </div>

            {/* Key Metrics */}
            <div style={cardStyle}>
              <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "#94a3b8" }}>📊 Key Metrics (72h)</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Peak AQI", value: peakAQI, color: getAqiLevel(peakAQI).color },
                  { label: "Average AQI", value: avgAQI, color: getAqiLevel(avgAQI).color },
                  { label: "Minimum AQI", value: minAQI, color: getAqiLevel(minAQI).color },
                  { label: "PM2.5 Now", value: currentData.pm25, color: "#ef4444" },
                  { label: "Visibility", value: `${currentData.visibility}km`, color: "#3b82f6" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#94a3b8" }}>{m.label}</span>
                    <span style={{ fontWeight: "700", color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div style={cardStyle}>
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: "#94a3b8" }}>🎯 Forecast Confidence</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[1, 6, 12, 24, 48, 72].map((h) => (
                  <div key={h} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                    <span style={{ width: "30px", color: "#94a3b8" }}>+{h}h</span>
                    <ConfidenceMeter confidence={FORECAST_DATA[h]?.confidence || 50} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HOURLY DETAIL TAB ═══ */}
      {activeTab === "hourly" && (
        <div>
          {/* Hour selector */}
          <div style={{ ...cardStyle, marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {FORECAST_HOURS.map((h) => (
                <button
                  key={h}
                  style={{
                    ...btnStyle(selectedHour === h),
                    padding: "8px 14px",
                  }}
                  onClick={() => setSelectedHour(h)}
                >
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {/* Selected Hour Detail */}
            <div style={cardStyle}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{selectedHour === 0 ? "Current Time" : `+${selectedHour} hours`}</div>
                <div style={{ fontSize: "56px", fontWeight: "900", color: aqiLevel.color }}>{currentData.aqi}</div>
                <div style={{ fontSize: "16px", color: aqiLevel.color, fontWeight: "700" }}>{aqiLevel.label}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{currentData.timeLabel} • {currentData.dateLabel}</div>
              </div>

              {/* Weather */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Temp", value: `${currentData.temp}°C`, icon: "🌡️" },
                  { label: "Humidity", value: `${currentData.humidity}%`, icon: "💧" },
                  { label: "Wind", value: `${currentData.windSpeed} km/h ${currentData.windDir}`, icon: "💨" },
                  { label: "Pressure", value: `${currentData.pressure} hPa`, icon: "🔵" },
                ].map((w, i) => (
                  <div key={i} style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "11px" }}>
                    <span>{w.icon} </span>
                    <span style={{ color: "#94a3b8" }}>{w.label}: </span>
                    <span style={{ fontWeight: "600" }}>{w.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Insights */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>💡 Timeline Insights</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {HOURLY_INSIGHTS.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      background: insight.hour === selectedHour ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                      border: insight.hour === selectedHour ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedHour(insight.hour <= 72 ? insight.hour : 72)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span>{insight.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: "700" }}>{insight.title}</span>
                      <span style={{ marginLeft: "auto", fontSize: "10px", color: "#6b7280" }}>{formatHour(insight.hour)}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{insight.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wind Rose */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>💨 Wind & Visibility</h3>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <svg width="150" height="150" viewBox="0 0 150 150">
                  {/* Compass */}
                  <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <circle cx="75" cy="75" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <circle cx="75" cy="75" r="25" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  {/* Direction labels */}
                  {["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((dir, i) => {
                    const angle = (i * 45 - 90) * (Math.PI / 180);
                    return (
                      <text key={dir} x={75 + 72 * Math.cos(angle)} y={75 + 72 * Math.sin(angle) + 4} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="9" fontWeight="600">
                        {dir}
                      </text>
                    );
                  })}
                  {/* Wind arrow */}
                  {(() => {
                    const dirIdx = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].indexOf(currentData.windDir);
                    const angle = (dirIdx * 45 - 90) * (Math.PI / 180);
                    const len = 20 + currentData.windSpeed * 2;
                    return <line x1="75" y1="75" x2={75 + len * Math.cos(angle)} y2={75 + len * Math.sin(angle)} stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />;
                  })()}
                  <circle cx="75" cy="75" r="4" fill="#3b82f6" />
                </svg>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>{currentData.windSpeed}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>km/h</div>
                </div>
                <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700" }}>{currentData.visibility}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>km vis</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ POLLUTANTS TAB ═══ */}
      {activeTab === "pollutants" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
            {POLLUTANTS.map((p) => {
              const colors = { "PM2.5": "#ef4444", PM10: "#f59e0b", O3: "#8b5cf6", NO2: "#3b82f6", SO2: "#06b6d4", CO: "#10b981" };
              return <PollutantChart key={p} data={next24h} pollutant={p} color={colors[p]} />;
            })}
          </div>

          <div style={{ ...cardStyle, marginTop: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>🔬 Pollutant Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { name: "PM2.5", value: currentData.pm25, unit: "μg/m³", limit: 25, desc: "Fine particulate matter — penetrates deep into lungs", icon: "🔴" },
                { name: "PM10", value: currentData.pm10, unit: "μg/m³", limit: 50, desc: "Coarse particulate — irritates upper airways", icon: "🟡" },
                { name: "O3", value: currentData.o3, unit: "ppb", limit: 70, desc: "Ground-level ozone — triggers asthma and breathing issues", icon: "🟣" },
                { name: "NO2", value: currentData.no2, unit: "ppb", limit: 53, desc: "Nitrogen dioxide — from vehicle exhaust and combustion", icon: "🔵" },
                { name: "SO2", value: currentData.so2, unit: "ppb", limit: 35, desc: "Sulfur dioxide — from industrial processes and power plants", icon: "🔷" },
                { name: "CO", value: currentData.co, unit: "ppm", limit: 9, desc: "Carbon monoxide — odorless gas from incomplete combustion", icon: "🟢" },
              ].map((p) => (
                <div key={p.name} style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>
                      {p.icon} {p.name}
                    </span>
                    <span style={{ fontSize: "12px", color: p.value > p.limit ? "#ef4444" : "#10b981", fontWeight: "700" }}>
                      {p.value} {p.unit}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginBottom: "6px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (p.value / (p.limit * 2)) * 100)}%`,
                        background: p.value > p.limit ? "#ef4444" : "#10b981",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "10px", color: "#6b7280" }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SOURCES & ZONES TAB ═══ */}
      {activeTab === "sources" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Sources */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>🏭 Pollution Sources</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <SourceDonutChart sources={SOURCES_DATA} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {SOURCES_DATA.map((source) => (
                  <div key={source.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderRadius: "8px", background: hoveredSource === source.name ? `${source.color}15` : "transparent", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={() => setHoveredSource(source.name)} onMouseLeave={() => setHoveredSource(null)}>
                    <span style={{ fontSize: "16px" }}>{source.icon}</span>
                    <span style={{ flex: 1, fontSize: "12px" }}>{source.name}</span>
                    <div style={{ width: "60px", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${source.pct}%`, background: source.color, borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: source.color, width: "30px", textAlign: "right" }}>{source.pct}%</span>
                    <span style={{ fontSize: "10px", color: source.trend === "up" ? "#ef4444" : source.trend === "down" ? "#10b981" : "#94a3b8" }}>
                      {source.trend === "up" ? "↑" : source.trend === "down" ? "↓" : "→"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zone Comparisons */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>📍 Zone Comparison</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ZONE_COMPARISONS.map((zone) => {
                const level = getAqiLevel(zone.aqi);
                return (
                  <div key={zone.name} style={{ padding: "12px", borderRadius: "10px", background: level.bg, border: `1px solid ${level.color}20` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>{zone.icon}</span>
                        <span style={{ fontWeight: "700", fontSize: "13px" }}>{zone.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "800", color: level.color }}>{zone.aqi}</span>
                        <span style={{ fontSize: "11px", color: zone.trend > 0 ? "#ef4444" : "#10b981" }}>
                          {zone.trend > 0 ? `+${zone.trend}` : zone.trend}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(zone.aqi / 200) * 100}%`, background: level.color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEALTH ADVISORY TAB ═══ */}
      {activeTab === "health" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Current Advisory */}
          <div style={{ ...cardStyle, marginBottom: "20px", background: advisory.bg, border: `1px solid ${advisory.color}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "36px" }}>{advisory.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", color: advisory.color }}>{advisory.label}</h3>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>Based on current AQI of {currentData.aqi}</div>
              </div>
            </div>
          </div>

          {/* Recommendations by AQI Level */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            {HEALTH_RECOMMENDATIONS.map((rec, i) => {
              const isActive = currentData.aqi >= rec.aqiRange[0] && currentData.aqi <= rec.aqiRange[1];
              return (
                <div
                  key={i}
                  style={{
                    ...cardStyle,
                    border: isActive ? `2px solid ${getAqiLevel(rec.aqiRange[0]).color}` : "1px solid rgba(255,255,255,0.06)",
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>{rec.icon}</span>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "13px" }}>{rec.title}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>AQI {rec.aqiRange[0]}–{rec.aqiRange[1]}</div>
                    </div>
                    {isActive && (
                      <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: "10px", fontWeight: "700" }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px" }}>
                    {rec.tips.map((tip, j) => (
                      <li key={j} style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Vulnerable Groups */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>⚠️ Vulnerable Groups Advisory</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { group: "Children", icon: "👶", risk: "Higher breathing rate, developing lungs", threshold: currentData.aqi > 75 ? "Avoid outdoor play" : "Normal activities OK", thresholdColor: currentData.aqi > 75 ? "#ef4444" : "#10b981" },
                { group: "Elderly", icon: "👴", risk: "Pre-existing conditions worsen", threshold: currentData.aqi > 50 ? "Limit outdoor exposure" : "Generally safe", thresholdColor: currentData.aqi > 50 ? "#f59e0b" : "#10b981" },
                { group: "Pregnant", icon: "🤰", risk: "Fetal development affected by pollution", threshold: currentData.aqi > 100 ? "Stay indoors" : "Moderate outdoor time", thresholdColor: currentData.aqi > 100 ? "#ef4444" : currentData.aqi > 50 ? "#f59e0b" : "#10b981" },
                { group: "Asthma", icon: "🫁", risk: "Triggers attacks and inflammation", threshold: currentData.aqi > 50 ? "Carry inhaler, avoid triggers" : "Monitor symptoms", thresholdColor: currentData.aqi > 50 ? "#ef4444" : "#10b981" },
                { group: "Heart Disease", icon: "❤️", risk: "Pollution increases cardiac events", threshold: currentData.aqi > 100 ? "Avoid all outdoor exertion" : "Light activity OK", thresholdColor: currentData.aqi > 100 ? "#ef4444" : "#10b981" },
                { group: "Outdoor Workers", icon: "👷", risk: "Extended exposure periods", threshold: currentData.aqi > 100 ? "N95 masks required" : currentData.aqi > 50 ? "Take frequent breaks" : "Standard precautions", thresholdColor: currentData.aqi > 100 ? "#ef4444" : currentData.aqi > 50 ? "#f59e0b" : "#10b981" },
              ].map((g) => (
                <div key={g.group} style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{g.icon}</span>
                    <span style={{ fontWeight: "700", fontSize: "13px" }}>{g.group}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>{g.risk}</div>
                  <div style={{ padding: "6px 10px", borderRadius: "6px", background: `${g.thresholdColor}15`, fontSize: "11px", color: g.thresholdColor, fontWeight: "600" }}>
                    {g.threshold}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
