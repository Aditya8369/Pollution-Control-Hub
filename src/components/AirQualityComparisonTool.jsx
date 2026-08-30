import { useState, useMemo, useCallback } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const AQI_LEVELS = [
  { min: 0, max: 50, label: "Good", color: "#00e400", icon: "😊" },
  { min: 51, max: 100, label: "Moderate", color: "#ffff00", icon: "😐" },
  { min: 101, max: 150, label: "Unhealthy (SG)", color: "#ff7e00", icon: "😷" },
  { min: 151, max: 200, label: "Unhealthy", color: "#ff0000", icon: "🤢" },
  { min: 201, max: 300, label: "Very Unhealthy", color: "#8f3f97", icon: "🚨" },
  { min: 301, max: 500, label: "Hazardous", color: "#7e0023", icon: "☠️" },
];

const REGIONS = ["North America", "Europe", "Asia", "South America", "Africa", "Oceania"];

const SORT_OPTIONS = [
  { id: "aqi", label: "AQI (Worst)" },
  { id: "aqi-asc", label: "AQI (Best)" },
  { id: "name", label: "City Name" },
  { id: "pm25", label: "PM2.5" },
  { id: "trend", label: "Trend" },
  { id: "population", label: "Population" },
];

// ─── Sample Data ────────────────────────────────────────────────────────────

const CITIES_DATA = [
  { name: "Delhi", country: "India", region: "Asia", lat: 28.61, lng: 77.23, aqi: 285, pm25: 185, pm10: 245, o3: 42, no2: 68, so2: 18, co: 2.8, temp: 34, humidity: 65, wind: 8, population: 32900000, trend: 12, sources: ["Traffic", "Industrial", "Construction", "Crop burning"], topPollutant: "PM2.5" },
  { name: "Beijing", country: "China", region: "Asia", lat: 39.90, lng: 116.40, aqi: 168, pm25: 112, pm10: 155, o3: 55, no2: 52, so2: 22, co: 1.9, temp: 28, humidity: 55, wind: 12, population: 21500000, trend: -8, sources: ["Industrial", "Traffic", "Coal heating"], topPollutant: "PM2.5" },
  { name: "Los Angeles", country: "USA", region: "North America", lat: 34.05, lng: -118.24, aqi: 82, pm25: 32, pm10: 48, o3: 78, no2: 38, so2: 5, co: 0.8, temp: 30, humidity: 45, wind: 15, population: 13200000, trend: 3, sources: ["Traffic", "Ozone", "Wildfires"], topPollutant: "O3" },
  { name: "London", country: "UK", region: "Europe", lat: 51.51, lng: -0.13, aqi: 55, pm25: 18, pm10: 32, o3: 45, no2: 42, so2: 3, co: 0.4, temp: 18, humidity: 72, wind: 18, population: 9000000, trend: -5, sources: ["Traffic", "Heating"], topPollutant: "NO2" },
  { name: "Tokyo", country: "Japan", region: "Asia", lat: 35.68, lng: 139.69, aqi: 48, pm25: 14, pm10: 28, o3: 52, no2: 28, so2: 4, co: 0.3, temp: 26, humidity: 68, wind: 10, population: 14000000, trend: -2, sources: ["Traffic", "Industrial"], topPollutant: "O3" },
  { name: "Paris", country: "France", region: "Europe", lat: 48.86, lng: 2.35, aqi: 62, pm25: 22, pm10: 38, o3: 58, no2: 35, so2: 4, co: 0.5, temp: 20, humidity: 65, wind: 14, population: 11000000, trend: -3, sources: ["Traffic", "Heating"], topPollutant: "NO2" },
  { name: "Mumbai", country: "India", region: "Asia", lat: 19.08, lng: 72.88, aqi: 195, pm25: 128, pm10: 175, o3: 35, no2: 55, so2: 15, co: 2.1, temp: 30, humidity: 80, wind: 12, population: 20700000, trend: 8, sources: ["Traffic", "Industrial", "Construction"], topPollutant: "PM2.5" },
  { name: "São Paulo", country: "Brazil", region: "South America", lat: -23.55, lng: -46.63, aqi: 78, pm25: 28, pm10: 42, o3: 62, no2: 32, so2: 6, co: 0.7, temp: 22, humidity: 60, wind: 10, population: 22000000, trend: -1, sources: ["Traffic", "Industrial"], topPollutant: "O3" },
  { name: "Cairo", country: "Egypt", region: "Africa", lat: 30.04, lng: 31.24, aqi: 142, pm25: 92, pm10: 135, o3: 38, no2: 48, so2: 12, co: 1.5, temp: 35, humidity: 35, wind: 15, population: 21300000, trend: 5, sources: ["Traffic", "Industrial", "Desert dust"], topPollutant: "PM10" },
  { name: "Sydney", country: "Australia", region: "Oceania", lat: -33.87, lng: 151.21, aqi: 35, pm25: 10, pm10: 22, o3: 42, no2: 18, so2: 2, co: 0.2, temp: 16, humidity: 55, wind: 20, population: 5300000, trend: -4, sources: ["Traffic"], topPollutant: "O3" },
  { name: "Lagos", country: "Nigeria", region: "Africa", lat: 6.52, lng: 3.38, aqi: 158, pm25: 105, pm10: 148, o3: 30, no2: 45, so2: 8, co: 1.8, temp: 28, humidity: 85, wind: 8, population: 15900000, trend: 10, sources: ["Generators", "Traffic", "Waste burning"], topPollutant: "PM2.5" },
  { name: "Berlin", country: "Germany", region: "Europe", lat: 52.52, lng: 13.41, aqi: 42, pm25: 12, pm10: 25, o3: 48, no2: 25, so2: 3, co: 0.3, temp: 17, humidity: 62, wind: 16, population: 3700000, trend: -6, sources: ["Traffic", "Heating"], topPollutant: "O3" },
  { name: "Bangkok", country: "Thailand", region: "Asia", lat: 13.76, lng: 100.50, aqi: 112, pm25: 68, pm10: 95, o3: 45, no2: 42, so2: 8, co: 1.1, temp: 32, humidity: 70, wind: 6, population: 10700000, trend: 4, sources: ["Traffic", "Construction", "Burning"], topPollutant: "PM2.5" },
  { name: "Mexico City", country: "Mexico", region: "North America", lat: 19.43, lng: -99.13, aqi: 95, pm25: 38, pm10: 62, o3: 72, no2: 45, so2: 8, co: 1.2, temp: 22, humidity: 50, wind: 8, population: 21800000, trend: -2, sources: ["Traffic", "Industrial"], topPollutant: "O3" },
  { name: "Jakarta", country: "Indonesia", region: "Asia", lat: -6.21, lng: 106.85, aqi: 135, pm25: 88, pm10: 118, o3: 38, no2: 52, so2: 12, co: 1.4, temp: 30, humidity: 78, wind: 5, population: 10600000, trend: 6, sources: ["Traffic", "Industrial", "Construction"], topPollutant: "PM2.5" },
  { name: "Singapore", country: "Singapore", region: "Asia", lat: 1.35, lng: 103.82, aqi: 45, pm25: 15, pm10: 28, o3: 48, no2: 22, so2: 5, co: 0.3, temp: 30, humidity: 82, wind: 10, population: 5900000, trend: 0, sources: ["Traffic", "Industrial"], topPollutant: "O3" },
  { name: "Seoul", country: "South Korea", region: "Asia", lat: 37.57, lng: 126.98, aqi: 78, pm25: 35, pm10: 52, o3: 58, no2: 38, so2: 8, co: 0.6, temp: 25, humidity: 60, wind: 12, population: 9700000, trend: -4, sources: ["Traffic", "Industrial", "Yellow dust"], topPollutant: "PM2.5" },
  { name: "New York", country: "USA", region: "North America", lat: 40.71, lng: -74.01, aqi: 68, pm25: 25, pm10: 42, o3: 65, no2: 35, so2: 4, co: 0.5, temp: 24, humidity: 58, wind: 14, population: 18800000, trend: -2, sources: ["Traffic", "Heating"], topPollutant: "O3" },
  { name: "Dhaka", country: "Bangladesh", region: "Asia", lat: 23.81, lng: 90.41, aqi: 248, pm25: 168, pm10: 218, o3: 28, no2: 62, so2: 18, co: 2.5, temp: 32, humidity: 78, wind: 5, population: 22000000, trend: 15, sources: ["Traffic", "Brick kilns", "Construction", "Waste burning"], topPollutant: "PM2.5" },
  { name: "Lima", country: "Peru", region: "South America", lat: -12.05, lng: -77.04, aqi: 88, pm25: 35, pm10: 58, o3: 52, no2: 38, so2: 8, co: 0.9, temp: 18, humidity: 72, wind: 10, population: 10700000, trend: 2, sources: ["Traffic", "Industry"], topPollutant: "PM2.5" },
  { name: "Nairobi", country: "Kenya", region: "Africa", lat: -1.29, lng: 36.82, aqi: 52, pm25: 18, pm10: 35, o3: 45, no2: 22, so2: 5, co: 0.4, temp: 20, humidity: 50, wind: 12, population: 4700000, trend: 3, sources: ["Traffic", "Generators"], topPollutant: "PM10" },
  { name: "Toronto", country: "Canada", region: "North America", lat: 43.65, lng: -79.38, aqi: 38, pm25: 12, pm10: 22, o3: 48, no2: 20, so2: 2, co: 0.3, temp: 20, humidity: 55, wind: 16, population: 6200000, trend: -3, sources: ["Traffic"], topPollutant: "O3" },
  { name: "Amsterdam", country: "Netherlands", region: "Europe", lat: 52.37, lng: 4.90, aqi: 40, pm25: 11, pm10: 22, o3: 52, no2: 22, so2: 2, co: 0.2, temp: 16, humidity: 68, wind: 18, population: 870000, trend: -5, sources: ["Traffic"], topPollutant: "O3" },
  { name: "Melbourne", country: "Australia", region: "Oceania", lat: -37.81, lng: 144.96, aqi: 32, pm25: 9, pm10: 20, o3: 38, no2: 15, so2: 2, co: 0.2, temp: 14, humidity: 58, wind: 22, population: 5100000, trend: -3, sources: ["Traffic"], topPollutant: "O3" },
  { name: "Karachi", country: "Pakistan", region: "Asia", lat: 24.86, lng: 67.01, aqi: 212, pm25: 142, pm10: 188, o3: 32, no2: 58, so2: 15, co: 2.2, temp: 33, humidity: 62, wind: 10, population: 16100000, trend: 8, sources: ["Traffic", "Industrial", "Waste burning"], topPollutant: "PM2.5" },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

function getAqiLevel(aqi) {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

function formatPopulation(pop) {
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${(pop / 1000).toFixed(0)}K`;
  return pop.toString();
}

// ─── Chart Components ───────────────────────────────────────────────────────

function AQIComparisonBar({ cities, maxAQI = 300, height = 400 }) {
  const barWidth = Math.max(20, Math.min(40, 600 / cities.length));
  const chartWidth = cities.length * (barWidth + 8) + 60;
  const chartH = height - 60;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} style={{ overflow: "visible" }}>
      {/* AQI zones */}
      {AQI_LEVELS.slice(0, 4).map((level) => {
        const y1 = 40 + chartH - (Math.min(level.max, maxAQI) / maxAQI) * chartH;
        const y2 = 40 + chartH - (level.min / maxAQI) * chartH;
        return (
          <g key={level.label}>
            <rect x="50" y={y1} width={chartWidth - 60} height={Math.max(0, y2 - y1)} fill={level.color} opacity={0.04} />
            <text x="45" y={(y1 + y2) / 2 + 4} textAnchor="end" fill={level.color} fontSize="8" opacity={0.5}>
              {level.label}
            </text>
          </g>
        );
      })}

      {/* Grid lines */}
      {[0, 50, 100, 150, 200, 250, 300].map((v) => {
        const y = 40 + chartH - (v / maxAQI) * chartH;
        return (
          <g key={v}>
            <line x1="50" y1={y} x2={chartWidth - 10} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x="45" y={y + 4} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="9">
              {v}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {cities.map((city, i) => {
        const level = getAqiLevel(city.aqi);
        const barH = (city.aqi / maxAQI) * chartH;
        const x = 55 + i * (barWidth + 8);
        const y = 40 + chartH - barH;

        return (
          <g key={city.name}>
            <rect x={x} y={y} width={barWidth} height={barH} rx="3" fill={level.color} opacity={0.8} />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">
              {city.aqi}
            </text>
            <text x={x + barWidth / 2} y={40 + chartH + 14} textAnchor="middle" fill="#94a3b8" fontSize="8" transform={`rotate(-35, ${x + barWidth / 2}, ${40 + chartH + 14})`}>
              {city.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CityComparisonRadar({ city, size = 200 }) {
  const metrics = [
    { label: "AQI", value: Math.min(100, (city.aqi / 300) * 100), color: getAqiLevel(city.aqi).color },
    { label: "PM2.5", value: Math.min(100, (city.pm25 / 200) * 100), color: "#ef4444" },
    { label: "O3", value: Math.min(100, (city.o3 / 100) * 100), color: "#8b5cf6" },
    { label: "Traffic", value: Math.min(100, (city.no2 / 80) * 100), color: "#3b82f6" },
    { label: "Wind", value: Math.min(100, (city.wind / 25) * 100), color: "#10b981" },
  ];

  const center = size / 2;
  const maxRadius = (size / 2) - 30;
  const angleStep = (2 * Math.PI) / metrics.length;

  const getPoint = (index, value) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygonPoints = metrics.map((m, i) => {
    const p = getPoint(i, m.value);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid levels */}
      {[25, 50, 75, 100].map((level) => {
        const pts = metrics.map((_, i) => {
          const p = getPoint(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}

      {/* Axis lines */}
      {metrics.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}

      {/* Data polygon */}
      <polygon points={polygonPoints} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />

      {/* Data points and labels */}
      {metrics.map((m, i) => {
        const p = getPoint(i, m.value);
        const labelP = getPoint(i, 115);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={m.color} stroke="#0f172a" strokeWidth="2" />
            <text x={labelP.x} y={labelP.y + 3} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendSparkline({ values, color = "#3b82f6", width = 80, height = 24 }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const getX = (i) => (i / (values.length - 1)) * width;
  const getY = (v) => height - ((v - min) / range) * (height - 4) - 2;

  const pathD = values.map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(v)}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={getX(values.length - 1)} cy={getY(values[values.length - 1])} r="2" fill={color} />
    </svg>
  );
}

function WorldMapDots({ cities, onCityClick, selectedCity }) {
  const mapW = 500;
  const mapH = 260;

  const getX = (lng) => ((lng + 180) / 360) * mapW;
  const getY = (lat) => ((90 - lat) / 180) * mapH;

  return (
    <svg width="100%" height={mapH} viewBox={`0 0 ${mapW} ${mapH}`}>
      {/* Simple world outline */}
      <rect x="0" y="0" width={mapW} height={mapH} fill="rgba(255,255,255,0.02)" rx="12" />

      {/* Grid lines */}
      {[0, 60, 120, 180, 240, 300, 360].map((lng) => (
        <line key={lng} x1={getX(lng - 180)} y1="0" x2={getX(lng - 180)} y2={mapH} stroke="rgba(255,255,255,0.03)" />
      ))}
      {[-60, -30, 0, 30, 60].map((lat) => (
        <line key={lat} x1="0" y1={getY(lat)} x2={mapW} y2={getY(lat)} stroke="rgba(255,255,255,0.03)" />
      ))}

      {/* City dots */}
      {cities.map((city) => {
        const x = getX(city.lng);
        const y = getY(city.lat);
        const level = getAqiLevel(city.aqi);
        const isSelected = selectedCity?.name === city.name;
        const r = isSelected ? 8 : 5;

        return (
          <g key={city.name} style={{ cursor: "pointer" }} onClick={() => onCityClick(city)}>
            <circle cx={x} cy={y} r={r + 4} fill={level.color} opacity={0.15} />
            <circle cx={x} cy={y} r={r} fill={level.color} stroke={isSelected ? "#fff" : "#0f172a"} strokeWidth={isSelected ? 2 : 1.5} />
            {isSelected && (
              <text x={x} y={y - 12} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">
                {city.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AirQualityComparisonTool() {
  const [activeTab, setActiveTab] = useState("global");
  const [selectedCities, setSelectedCities] = useState(["Delhi", "Beijing", "Los Angeles", "London", "Tokyo"]);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [sortBy, setSortBy] = useState("aqi");
  const [searchQuery, setSearchQuery] = useState("");
  const [compareCity, setCompareCity] = useState(null);
  const [showMap, setShowMap] = useState(true);

  const allCities = useMemo(() => CITIES_DATA, []);

  const filteredCities = useMemo(() => {
    let filtered = allCities;
    if (selectedRegion !== "all") {
      filtered = filtered.filter((c) => c.region === selectedRegion);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "aqi": return b.aqi - a.aqi;
        case "aqi-asc": return a.aqi - b.aqi;
        case "name": return a.name.localeCompare(b.name);
        case "pm25": return b.pm25 - a.pm25;
        case "trend": return b.trend - a.trend;
        case "population": return b.population - a.population;
        default: return 0;
      }
    });
  }, [allCities, selectedRegion, searchQuery, sortBy]);

  const selectedCityData = useMemo(() => {
    return allCities.filter((c) => selectedCities.includes(c.name));
  }, [allCities, selectedCities]);

  const stats = useMemo(() => {
    const avgAQI = Math.round(allCities.reduce((s, c) => s + c.aqi, 0) / allCities.length);
    const worstCity = allCities.reduce((w, c) => (c.aqi > w.aqi ? c : w));
    const bestCity = allCities.reduce((b, c) => (c.aqi < b.aqi ? c : b));
    const avgTrend = (allCities.reduce((s, c) => s + c.trend, 0) / allCities.length).toFixed(1);
    return { avgAQI, worstCity, bestCity, avgTrend };
  }, [allCities]);

  const toggleCity = useCallback((name) => {
    setSelectedCities((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 8) return [...prev.slice(1), name];
      return [...prev, name];
    });
  }, []);

  const tabs = [
    { id: "global", label: "Global Overview", icon: "🌍" },
    { id: "compare", label: "City Compare", icon: "📊" },
    { id: "ranking", label: "Rankings", icon: "🏆" },
    { id: "pollutants", label: "Pollutant Analysis", icon: "🔬" },
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
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: "24px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 8px", background: "linear-gradient(135deg, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🌍 Air Quality Comparison Tool
          </h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Compare air quality across {allCities.length} cities worldwide with real-time rankings</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: getAqiLevel(stats.avgAQI).color }}>{stats.avgAQI}</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Global Avg</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#ef4444" }}>{stats.worstCity.aqi}</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Worst</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#10b981" }}>{stats.bestCity.aqi}</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Best</div>
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

      {/* ═══ GLOBAL OVERVIEW TAB ═══ */}
      {activeTab === "global" && (
        <div>
          {/* World Map */}
          <div style={{ ...cardStyle, marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>🗺️ Global Air Quality Map</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {AQI_LEVELS.slice(0, 5).map((l) => (
                  <span key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: l.color }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <WorldMapDots cities={allCities} onCityClick={(city) => { setCompareCity(city); setActiveTab("compare"); }} selectedCity={compareCity} />
          </div>

          {/* Bar Chart */}
          <div style={{ ...cardStyle, marginBottom: "20px", overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>📊 AQI Comparison — All Cities</h3>
            <AQIComparisonBar cities={[...allCities].sort((a, b) => b.aqi - a.aqi)} />
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "4px" }}>🏭</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#ef4444" }}>{stats.worstCity.name}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Most Polluted (AQI {stats.worstCity.aqi})</div>
            </div>
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "4px" }}>🌿</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#10b981" }}>{stats.bestCity.name}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cleanest Air (AQI {stats.bestCity.aqi})</div>
            </div>
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "4px" }}>📈</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: parseFloat(stats.avgTrend) > 0 ? "#ef4444" : "#10b981" }}>
                {parseFloat(stats.avgTrend) > 0 ? "+" : ""}{stats.avgTrend}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Avg Trend (24h)</div>
            </div>
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "4px" }}>🏙️</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#3b82f6" }}>{allCities.length}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cities Tracked</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CITY COMPARE TAB ═══ */}
      {activeTab === "compare" && (
        <div>
          {/* City Selector */}
          <div style={{ ...cardStyle, marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              {allCities.map((city) => {
                const isSelected = selectedCities.includes(city.name);
                const level = getAqiLevel(city.aqi);
                return (
                  <button
                    key={city.name}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: isSelected ? `1px solid ${level.color}50` : "1px solid rgba(255,255,255,0.06)",
                      background: isSelected ? `${level.color}15` : "rgba(255,255,255,0.03)",
                      color: isSelected ? level.color : "#94a3b8",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                    onClick={() => toggleCity(city.name)}
                  >
                    {city.name} ({city.aqi})
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>
              Select up to 8 cities to compare • {selectedCities.length}/8 selected
            </div>
          </div>

          {/* Comparison Cards */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedCityData.length, 4)}, 1fr)`, gap: "16px" }}>
            {selectedCityData.map((city) => {
              const level = getAqiLevel(city.aqi);
              return (
                <div key={city.name} style={{ ...cardStyle, borderTop: `3px solid ${level.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "16px" }}>{city.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{city.country} • {city.region}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "28px", fontWeight: "900", color: level.color }}>{city.aqi}</div>
                      <div style={{ fontSize: "10px", color: level.color }}>{level.label}</div>
                    </div>
                  </div>

                  {/* Radar */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                    <CityComparisonRadar city={city} size={160} />
                  </div>

                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                    {[
                      { label: "PM2.5", value: city.pm25, color: "#ef4444" },
                      { label: "O3", value: city.o3, color: "#8b5cf6" },
                      { label: "Temp", value: `${city.temp}°C`, color: "#f59e0b" },
                      { label: "Humidity", value: `${city.humidity}%`, color: "#3b82f6" },
                      { label: "Wind", value: `${city.wind} km/h`, color: "#10b981" },
                      { label: "Trend", value: `${city.trend > 0 ? "+" : ""}${city.trend}`, color: city.trend > 0 ? "#ef4444" : "#10b981" },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>{s.label}</span>
                        <span style={{ color: s.color, fontWeight: "600" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Top Pollutant */}
                  <div style={{ marginTop: "10px", padding: "6px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", fontSize: "10px", color: "#94a3b8" }}>
                    Top pollutant: <strong style={{ color: "#ef4444" }}>{city.topPollutant}</strong>
                  </div>

                  {/* Sources */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                    {city.sources.map((s) => (
                      <span key={s} style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", fontSize: "9px", color: "#6b7280" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RANKINGS TAB ═══ */}
      {activeTab === "ranking" && (
        <div>
          {/* Filters */}
          <div style={{ ...cardStyle, marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <input type="text" placeholder="🔍 Search cities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "13px", outline: "none" }} />
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={btnStyle(selectedRegion === "all")} onClick={() => setSelectedRegion("all")}>All</button>
              {REGIONS.map((r) => (
                <button key={r} style={btnStyle(selectedRegion === r)} onClick={() => setSelectedRegion(r)}>
                  {r.split(" ")[0]}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "12px" }}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Ranking Table */}
          <div style={cardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Rank", "City", "Country", "AQI", "PM2.5", "O3", "Trend", "Pop.", "Status"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#94a3b8", fontWeight: "600", fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.map((city, i) => {
                    const level = getAqiLevel(city.aqi);
                    return (
                      <tr key={city.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                        onClick={() => { toggleCity(city.name); setActiveTab("compare"); }}>
                        <td style={{ padding: "10px 12px", fontWeight: "700", color: i < 3 ? "#f59e0b" : "#94a3b8" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: "600" }}>{city.name}</td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{city.country}</td>
                        <td style={{ padding: "10px 12px", fontWeight: "700", color: level.color }}>{city.aqi}</td>
                        <td style={{ padding: "10px 12px", color: "#ef4444" }}>{city.pm25}</td>
                        <td style={{ padding: "10px 12px", color: "#8b5cf6" }}>{city.o3}</td>
                        <td style={{ padding: "10px 12px", color: city.trend > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                          {city.trend > 0 ? "↑" : city.trend < 0 ? "↓" : "→"} {Math.abs(city.trend)}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{formatPopulation(city.population)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", background: `${level.color}20`, color: level.color, fontSize: "10px", fontWeight: "700" }}>
                            {level.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ POLLUTANT ANALYSIS TAB ═══ */}
      {activeTab === "pollutants" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* PM2.5 Ranking */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>🔴 PM2.5 Ranking</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...allCities].sort((a, b) => b.pm25 - a.pm25).slice(0, 10).map((city, i) => (
                  <div key={city.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "20px", textAlign: "center", fontSize: "10px", color: i < 3 ? "#f59e0b" : "#94a3b8", fontWeight: "700" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span style={{ flex: 1, fontSize: "12px" }}>{city.name}</span>
                    <div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(city.pm25 / 200) * 100}%`, background: "#ef4444", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444", width: "40px", textAlign: "right" }}>{city.pm25}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* O3 Ranking */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>🟣 Ozone (O3) Ranking</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...allCities].sort((a, b) => b.o3 - a.o3).slice(0, 10).map((city, i) => (
                  <div key={city.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "20px", textAlign: "center", fontSize: "10px", color: i < 3 ? "#f59e0b" : "#94a3b8", fontWeight: "700" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span style={{ flex: 1, fontSize: "12px" }}>{city.name}</span>
                    <div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(city.o3 / 100) * 100}%`, background: "#8b5cf6", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#8b5cf6", width: "40px", textAlign: "right" }}>{city.o3}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Improved */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>📈 Most Improved (24h)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...allCities].filter((c) => c.trend < 0).sort((a, b) => a.trend - b.trend).slice(0, 8).map((city, i) => (
                  <div key={city.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "20px", textAlign: "center", fontSize: "10px", color: "#10b981", fontWeight: "700" }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: "12px" }}>{city.name}</span>
                    <TrendSparkline values={[city.aqi + Math.abs(city.trend) * 3, city.aqi + Math.abs(city.trend) * 2, city.aqi + Math.abs(city.trend), city.aqi]} color="#10b981" />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>{city.trend}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Worsened */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>📉 Most Worsened (24h)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...allCities].filter((c) => c.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 8).map((city, i) => (
                  <div key={city.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "20px", textAlign: "center", fontSize: "10px", color: "#ef4444", fontWeight: "700" }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: "12px" }}>{city.name}</span>
                    <TrendSparkline values={[city.aqi - city.trend * 3, city.aqi - city.trend * 2, city.aqi - city.trend, city.aqi]} color="#ef4444" />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444" }}>+{city.trend}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Pollutant Distribution */}
            <div style={{ ...cardStyle, gridColumn: "span 2" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>🎯 Top Pollutant Distribution by City</h3>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {Object.entries(allCities.reduce((acc, c) => { acc[c.topPollutant] = (acc[c.topPollutant] || 0) + 1; return acc; }, {}))
                  .sort(([, a], [, b]) => b - a)
                  .map(([pollutant, count]) => {
                    const colors = { "PM2.5": "#ef4444", "PM10": "#f59e0b", "O3": "#8b5cf6", "NO2": "#3b82f6" };
                    const pct = Math.round((count / allCities.length) * 100);
                    return (
                      <div key={pollutant} style={{ padding: "12px 16px", borderRadius: "12px", background: `${colors[pollutant] || "#6b7280"}10`, border: `1px solid ${colors[pollutant] || "#6b7280"}20`, textAlign: "center", minWidth: "120px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "800", color: colors[pollutant] || "#6b7280" }}>{count}</div>
                        <div style={{ fontSize: "12px", fontWeight: "600" }}>{pollutant}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{pct}% of cities</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
