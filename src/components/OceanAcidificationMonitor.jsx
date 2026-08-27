import React, { useState, useMemo } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────
const OCEAN_REGIONS = [
  { id: "north-atlantic", name: "North Atlantic", lat: 45, lon: -30, avgPh: 8.08, trend: -0.0017, temp: 12, depth: 3400, co2Flux: 2.1 },
  { id: "south-atlantic", name: "South Atlantic", lat: -25, lon: -15, avgPh: 8.11, trend: -0.0015, temp: 18, depth: 3800, co2Flux: 1.8 },
  { id: "north-pacific", name: "North Pacific", lat: 40, lon: -170, avgPh: 8.06, trend: -0.0019, temp: 10, depth: 4200, co2Flux: 2.4 },
  { id: "south-pacific", name: "South Pacific", lat: -20, lon: -150, avgPh: 8.10, trend: -0.0014, temp: 22, depth: 4000, co2Flux: 1.6 },
  { id: "indian-ocean", name: "Indian Ocean", lat: -10, lon: 70, avgPh: 8.09, trend: -0.0016, temp: 26, depth: 3700, co2Flux: 1.9 },
  { id: "arctic", name: "Arctic Ocean", lat: 80, lon: 0, avgPh: 8.05, trend: -0.0021, temp: -1, depth: 1200, co2Flux: 0.8 },
  { id: "southern-ocean", name: "Southern Ocean", lat: -65, lon: 0, avgPh: 8.04, trend: -0.0020, temp: 2, depth: 3200, co2Flux: 2.8 },
  { id: "mediterranean", name: "Mediterranean", lat: 38, lon: 18, avgPh: 8.10, trend: -0.0013, temp: 20, depth: 1500, co2Flux: 1.5 },
];

const pH_SCALE = [
  { min: 0, max: 6.5, label: "Acidic", color: "#ef4444", desc: "Dangerous to most marine life" },
  { min: 6.5, max: 7.5, label: "Slightly Acidic", color: "#f97316", desc: "Stressful for coral and shellfish" },
  { min: 7.5, max: 8.0, label: "Mild", color: "#eab308", desc: "Below pre-industrial levels" },
  { min: 8.0, max: 8.2, label: "Normal", color: "#22c55e", desc: "Healthy ocean range" },
  { min: 8.2, max: 8.5, label: "Alkaline", color: "#06b6d4", desc: "Above average alkalinity" },
];

const MARINE_SPECIES = [
  { name: "Staghorn Coral", type: "coral", phSensitivity: "high", criticalPh: 8.0, declineRate: 14, population: 42, icon: "🪸", habitat: "Tropical reefs", status: "critically-endangered" },
  { name: "Brain Coral", type: "coral", phSensitivity: "high", criticalPh: 7.95, declineRate: 11, population: 55, icon: "🪸", habitat: "Caribbean reefs", status: "endangered" },
  { name: "Blue Coral", type: "coral", phSensitivity: "medium", criticalPh: 7.9, declineRate: 8, population: 68, icon: "🪸", habitat: "Indo-Pacific", status: "vulnerable" },
  { name: "Pacific Oyster", type: "shellfish", phSensitivity: "high", criticalPh: 7.8, declineRate: 16, population: 48, icon: "🦪", habitat: "Coastal waters", status: "endangered" },
  { name: "Blue Mussel", type: "shellfish", phSensitivity: "medium", criticalPh: 7.7, declineRate: 9, population: 62, icon: "🦪", habitat: "North Atlantic", status: "vulnerable" },
  { name: "King Crab", type: "crustacean", phSensitivity: "medium", criticalPh: 7.85, declineRate: 7, population: 71, icon: "🦀", habitat: "Bering Sea", status: "vulnerable" },
  { name: "Pteropod", type: "plankton", phSensitivity: "high", criticalPh: 7.9, declineRate: 18, population: 35, icon: "🐚", habitat: "Open ocean", status: "endangered" },
  { name: "Coccolithophore", type: "plankton", phSensitivity: "low", criticalPh: 7.5, declineRate: 4, population: 82, icon: "🦠", habitat: "Global oceans", status: "least-concern" },
  { name: "Atlantic Cod", type: "fish", phSensitivity: "low", criticalPh: 7.6, declineRate: 3, population: 75, icon: "🐟", habitat: "North Atlantic", status: "vulnerable" },
  { name: "Clownfish", type: "fish", phSensitivity: "medium", criticalPh: 7.8, declineRate: 6, population: 65, icon: "🐠", habitat: "Coral reefs", status: "vulnerable" },
  { name: "Sea Urchin", type: "echinoderm", phSensitivity: "medium", criticalPh: 7.7, declineRate: 8, population: 58, icon: "🦔", habitat: "Kelp forests", status: "vulnerable" },
  { name: "Abalone", type: "mollusk", phSensitivity: "high", criticalPh: 7.85, declineRate: 13, population: 38, icon: "🐌", habitat: "Coastal reefs", status: "endangered" },
];

const CO2_SCENARIOS = [
  { id: "rcp26", name: "RCP 2.6 (Paris Agreement)", peakYear: 2040, peakPpm: 440, endPpm: 420, color: "#22c55e" },
  { id: "rcp45", name: "RCP 4.5 (Moderate Action)", peakYear: 2080, peakPpm: 540, endPpm: 530, color: "#eab308" },
  { id: "rcp60", name: "RCP 6.0 (Delayed Action)", peakYear: 2100, peakPpm: 620, endPpm: 615, color: "#f97316" },
  { id: "rcp85", name: "RCP 8.5 (Business as Usual)", peakYear: 2100, peakPpm: 940, endPpm: 935, color: "#ef4444" },
];

const DEPTH_ZONES = [
  { name: "Epipelagic", range: "0–200m", light: "Full sunlight", phRange: [8.05, 8.15], color: "#06b6d4", organisms: "Phytoplankton, coral, fish" },
  { name: "Mesopelagic", range: "200–1,000m", light: "Twilight", phRange: [7.95, 8.05], color: "#8b5cf6", organisms: "Squid, jellyfish, sea birds" },
  { name: "Bathypelagic", range: "1,000–4,000m", light: "No light", phRange: [7.85, 7.95], color: "#3b82f6", organisms: "Deep-sea fish, giant squid" },
  { name: "Abyssopelagic", range: "4,000–6,000m", light: "None", phRange: [7.80, 7.90], color: "#1e40af", organisms: "Sea cucumbers, worms" },
];

const HISTORICAL_PH = [];
for (let y = 1850; y <= 2025; y += 5) {
  const yearsSince1850 = y - 1850;
  const ph = 8.25 - yearsSince1850 * 0.0011 - (yearsSince1850 > 100 ? (yearsSince1850 - 100) * 0.0006 : 0);
  const co2 = 280 + yearsSince1850 * 0.8 + (yearsSince1850 > 120 ? (yearsSince1850 - 120) * 2.5 : 0);
  HISTORICAL_PH.push({ year: y, ph: +ph.toFixed(3), co2: Math.round(co2) });
}

function generateDecadalData() {
  const data = [];
  for (let y = 2025; y <= 2100; y += 5) {
    const years = y - 2025;
    data.push({
      year: y,
      rcp26: +(8.07 - years * 0.0005 + (years > 15 ? 0.001 * (years - 15) : 0)).toFixed(3),
      rcp45: +(8.07 - years * 0.0012).toFixed(3),
      rcp60: +(8.07 - years * 0.0018).toFixed(3),
      rcp85: +(8.07 - years * 0.003).toFixed(3),
    });
  }
  return data;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = {
  container: { padding: "20px", fontFamily: "'Inter', -apple-system, sans-serif", background: "linear-gradient(135deg, #0c1220 0%, #0a1628 50%, #061020 100%)", color: "#e2e8f0", minHeight: "100vh" },
  header: { textAlign: "center", marginBottom: "32px" },
  title: { fontSize: "2.2rem", fontWeight: 800, background: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" },
  subtitle: { color: "#94a3b8", fontSize: "1rem" },
  tabs: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" },
  tab: (active) => ({ padding: "10px 20px", borderRadius: "12px", border: active ? "2px solid #06b6d4" : "2px solid #1e3a5f", background: active ? "rgba(6,182,212,0.15)" : "#0f1e32", color: active ? "#06b6d4" : "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.3s" }),
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" },
  kpi: { background: "rgba(15,30,50,0.8)", borderRadius: "16px", padding: "20px", border: "1px solid #1e3a5f", textAlign: "center" },
  kpiVal: (c) => ({ fontSize: "2rem", fontWeight: 800, color: c || "#06b6d4" }),
  kpiLabel: { color: "#64748b", fontSize: "0.8rem", marginTop: "4px" },
  card: { background: "rgba(15,30,50,0.8)", borderRadius: "16px", padding: "24px", border: "1px solid #1e3a5f", marginBottom: "20px" },
  cardTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, background: `${color}25`, color, border: `1px solid ${color}40` }),
  progressTrack: { width: "100%", height: "6px", borderRadius: "3px", background: "#1e3a5f", marginTop: "6px" },
  progressFill: (pct, color) => ({ height: "100%", width: `${pct}%`, borderRadius: "3px", background: color, transition: "width 0.5s ease" }),
  alertBanner: (level) => ({
    padding: "16px 24px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", fontWeight: 600,
    background: level === "good" ? "rgba(34,197,94,0.12)" : level === "moderate" ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)",
    borderLeft: `4px solid ${level === "good" ? "#22c55e" : level === "moderate" ? "#eab308" : "#ef4444"}`,
  }),
  speciesCard: { padding: "16px", borderRadius: "12px", background: "rgba(10,22,40,0.6)", border: "1px solid #1e3a5f", marginBottom: "12px" },
  depthBar: (pct, color) => ({ height: "40px", borderRadius: "8px", background: `${color}30`, border: `1px solid ${color}50`, display: "flex", alignItems: "center", padding: "0 12px", marginBottom: "8px", position: "relative" }),
  depthFill: (pct, color) => ({ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: "8px", background: `${color}40`, transition: "width 0.5s" }),
  regionRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", background: "rgba(10,22,40,0.4)", marginBottom: "8px", cursor: "pointer", transition: "all 0.3s" },
  svgContainer: { width: "100%", overflow: "visible" },
  select: { padding: "8px 16px", borderRadius: "8px", border: "1px solid #1e3a5f", background: "#0f1e32", color: "#e2e8f0", fontSize: "0.9rem", cursor: "pointer" },
  toggle: (active) => ({ padding: "6px 14px", borderRadius: "20px", border: active ? "2px solid #06b6d4" : "1px solid #1e3a5f", background: active ? "rgba(6,182,212,0.15)" : "transparent", color: active ? "#06b6d4" : "#64748b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }),
  toggleRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  insightCard: { padding: "16px", borderRadius: "12px", background: "rgba(10,22,40,0.6)", border: "1px solid #1e3a5f", marginBottom: "12px" },
  statusDot: (color) => ({ width: "10px", height: "10px", borderRadius: "50%", background: color, display: "inline-block", marginRight: "6px" }),
  waveAnimation: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", overflow: "hidden", opacity: 0.15,
  },
};

// ─── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#06b6d4", width = 120, height = 36 }) {
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height}>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`${color}15`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── pH Gauge ───────────────────────────────────────────────────────────────
function PhGauge({ ph, size = 180 }) {
  const r = size / 2 - 15;
  const cx = size / 2, cy = size / 2 + 10;
  const startAngle = Math.PI;
  const endAngle = 0;
  const phRange = [6.0, 9.0];
  const pct = Math.max(0, Math.min(1, (ph - phRange[0]) / (phRange[1] - phRange[0])));
  const angle = startAngle - pct * Math.PI;
  const needleX = cx + r * 0.7 * Math.cos(angle);
  const needleY = cy - r * 0.7 * Math.sin(angle);

  const cat = pH_SCALE.find(c => ph >= c.min && ph < c.max) || pH_SCALE[4];

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <defs>
        <linearGradient id="phGrad" x1="0%" y1="0%" x2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#f97316" />
          <stop offset="45%" stopColor="#eab308" />
          <stop offset="65%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* Arc background */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e3a5f" strokeWidth="18" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#phGrad)" strokeWidth="18" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="#e2e8f0" />
      {/* Value */}
      <text x={cx} y={cy + 30} textAnchor="middle" fill={cat.color} fontSize="22" fontWeight="800">{ph.toFixed(3)}</text>
      <text x={cx} y={cy + 45} textAnchor="middle" fill="#94a3b8" fontSize="10">{cat.label}</text>
      {/* Scale labels */}
      <text x={cx - r - 5} y={cy + 15} fill="#64748b" fontSize="9" textAnchor="end">6.0</text>
      <text x={cx + r + 5} y={cy + 15} fill="#64748b" fontSize="9" textAnchor="start">9.0</text>
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function OceanAcidificationMonitor() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState("rcp45");
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  const region = OCEAN_REGIONS[selectedRegion];
  const decadal = useMemo(() => generateDecadalData(), []);
  const scenario = CO2_SCENARIOS.find(sc => sc.id === selectedScenario);

  const globalAvgPh = +(OCEAN_REGIONS.reduce((s, r) => s + r.avgPh, 0) / OCEAN_REGIONS.length).toFixed(3);
  const totalCo2Absorbed = +(OCEAN_REGIONS.reduce((s, r) => s + r.co2Flux, 0)).toFixed(1);
  const avgTrend = +(OCEAN_REGIONS.reduce((s, r) => s + r.trend, 0) / OCEAN_REGIONS.length).toFixed(4);
  const criticalSpecies = MARINE_SPECIES.filter(sp => sp.phSensitivity === "high");
  const phCat = pH_SCALE.find(c => region.avgPh >= c.min && c.max > region.avgPh) || pH_SCALE[4];

  const tabs = [
    { id: "overview", label: "🌊 Overview" },
    { id: "regions", label: "🗺️ Regions" },
    { id: "species", label: "🐚 Species" },
    { id: "depth", label: "📏 Depth Zones" },
    { id: "projections", label: "📈 Projections" },
    { id: "historical", label: "🕰️ Historical" },
    { id: "insights", label: "💡 Insights" },
  ];

  const renderOverview = () => (
    <div>
      <div style={s.alertBanner(globalAvgPh > 8.1 ? "good" : globalAvgPh > 8.0 ? "moderate" : "critical")}>
        <span style={{ fontSize: "1.5rem" }}>🌊</span>
        <div>
          <div>Global Average Ocean pH: <strong style={{ color: phCat.color }}>{globalAvgPh}</strong></div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Ocean acidity has increased {Math.round((8.25 - globalAvgPh) / 0.01)}% since pre-industrial times (pH 8.25)
          </div>
        </div>
      </div>

      <div style={s.kpiRow}>
        <div style={s.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🌊</div>
          <div style={s.kpiVal("#06b6d4")}>{globalAvgPh}</div>
          <div style={s.kpiLabel}>Global Avg pH</div>
          <Sparkline data={HISTORICAL_PH.map(h => h.ph)} color="#06b6d4" />
        </div>
        <div style={s.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🏭</div>
          <div style={s.kpiVal("#f97316")}>{totalCo2Absorbed} Gt</div>
          <div style={s.kpiLabel}>CO₂ Absorbed/Year</div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>~30% of emissions</div>
        </div>
        <div style={s.kpi}>
          <div style={{ fontSize: "1.3rem" }}>📉</div>
          <div style={s.kpiVal("#ef4444")}>{avgTrend}</div>
          <div style={s.kpiLabel}>pH Trend/Year</div>
          <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: "4px" }}>Accelerating decline</div>
        </div>
        <div style={s.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🐚</div>
          <div style={s.kpiVal("#a78bfa")}>{criticalSpecies.length}</div>
          <div style={s.kpiLabel}>Critical Species</div>
          <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: "4px" }}>At risk from pH drop</div>
        </div>
        <div style={s.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🌡️</div>
          <div style={s.kpiVal("#22c55e")}>420 ppm</div>
          <div style={s.kpiLabel}>Current CO₂</div>
          <div style={{ fontSize: "0.7rem", color: "#eab308", marginTop: "4px" }}>Pre-industrial: 280 ppm</div>
        </div>
      </div>

      {/* pH Trend Chart */}
      <div style={s.card}>
        <div style={s.cardTitle}><span>📉</span> Historical Ocean pH Decline</div>
        <svg viewBox="0 0 800 250" style={{ width: "100%", height: "260px" }}>
          {(() => {
            const pad = 50, w = 800, h = 250;
            const phMin = 7.9, phMax = 8.3;
            const step = (w - pad * 2) / (HISTORICAL_PH.length - 1);
            const pts = HISTORICAL_PH.map((d, i) => ({
              x: pad + i * step,
              y: h - pad - ((d.ph - phMin) / (phMax - phMin)) * (h - pad * 2),
              ph: d.ph, co2: d.co2, year: d.year,
            }));
            const line = pts.map(p => `${p.x},${p.y}`).join(" ");
            const area = `0,${h - pad} ${line} ${w - pad},${h - pad}`;
            return (
              <>
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={i}>
                    <line x1={pad} y1={h - pad - pct * (h - pad * 2)} x2={w - pad} y2={h - pad - pct * (h - pad * 2)} stroke="#1e3a5f" strokeWidth="0.5" />
                    <text x={pad - 8} y={h - pad - pct * (h - pad * 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">{(phMax - pct * (phMax - phMin)).toFixed(2)}</text>
                  </g>
                ))}
                {/* Pre-industrial line */}
                <line x1={pad} y1={h - pad - ((8.25 - phMin) / (phMax - phMin)) * (h - pad * 2)} x2={w - pad} y2={h - pad - ((8.25 - phMin) / (phMax - phMin)) * (h - pad * 2)} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 4" />
                <text x={w - pad + 5} y={h - pad - ((8.25 - phMin) / (phMax - phMin)) * (h - pad * 2) + 4} fill="#22c55e" fontSize="9">Pre-industrial</text>
                <polygon points={area} fill="url(#phGrad2)" />
                <polyline points={line} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Year labels */}
                {pts.filter((_, i) => i % 7 === 0).map((p, i) => (
                  <text key={i} x={p.x} y={h - pad + 16} fill="#64748b" fontSize="9" textAnchor="middle">{p.year}</text>
                ))}
                <defs>
                  <linearGradient id="phGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </>
            );
          })()}
        </svg>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
            <div style={{ width: "20px", height: "2px", background: "#06b6d4" }} /> Ocean pH
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
            <div style={{ width: "20px", height: "2px", background: "#22c55e", borderTop: "1px dashed #22c55e" }} /> Pre-industrial level
          </div>
        </div>
      </div>

      {/* CO2 vs pH Correlation */}
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}><span>🏭</span> CO₂ vs pH Correlation</div>
          <svg viewBox="0 0 350 250" style={{ width: "100%", height: "240px" }}>
            {(() => {
              const pad = 40, w = 350, h = 250;
              const co2Min = 250, co2Max = 1000;
              const phMin = 7.9, phMax = 8.3;
              const pts = HISTORICAL_PH.map(d => ({
                x: pad + ((d.co2 - co2Min) / (co2Max - co2Min)) * (w - pad * 2),
                y: h - pad - ((d.ph - phMin) / (phMax - phMin)) * (h - pad * 2),
                co2: d.co2, ph: d.ph, year: d.year,
              }));
              return (
                <>
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#06b6d4" opacity="0.8" />
                      {i % 3 === 0 && <text x={p.x + 8} y={p.y - 5} fill="#64748b" fontSize="7">{p.year}</text>}
                    </g>
                  ))}
                  <text x={w / 2} y={h - 5} fill="#64748b" fontSize="9" textAnchor="middle">CO₂ (ppm)</text>
                  <text x="12" y={h / 2} fill="#64748b" fontSize="9" textAnchor="middle" transform={`rotate(-90, 12, ${h / 2})`}>pH</text>
                </>
              );
            })()}
          </svg>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}><span>⚡</span> Carbonate Chemistry</div>
          <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(6,182,212,0.08)", border: "1px solid #06b6d430", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#06b6d4", marginBottom: "8px", fontFamily: "monospace" }}>
              CO₂ + H₂O → H₂CO₃ → H⁺ + HCO₃⁻
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              Dissolved CO₂ forms carbonic acid, releasing hydrogen ions that lower pH and reduce carbonate availability for shell-building organisms.
            </div>
          </div>
          {[
            { label: "Carbonate (CO₃²⁻)", value: "declining", pct: 35, color: "#ef4444" },
            { label: "Bicarbonate (HCO₃⁻)", value: "increasing", pct: 78, color: "#eab308" },
            { label: "Dissolved CO₂", value: "increasing", pct: 85, color: "#f97316" },
            { label: "Saturation State (Ω)", value: "declining", pct: 42, color: "#ef4444" },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "#cbd5e1" }}>{item.label}</span>
                <span style={s.badge(item.color)}>{item.value}</span>
              </div>
              <div style={s.progressTrack}>
                <div style={s.progressFill(item.pct, item.color)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRegions = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}><span>🗺️</span> Ocean Region pH Levels</div>
        <div style={s.grid2}>
          <div>
            {OCEAN_REGIONS.map((r, i) => {
              const cat = pH_SCALE.find(c => r.avgPh >= c.min && c.max > r.avgPh) || pH_SCALE[4];
              return (
                <div key={i} style={{ ...s.regionRow, borderColor: selectedRegion === i ? cat.color : "#1e3a5f", background: selectedRegion === i ? `${cat.color}10` : undefined }}
                  onClick={() => setSelectedRegion(i)}>
                  <span style={{ width: "24px", textAlign: "center" }}>{i === selectedRegion ? "🔵" : "⚪"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{r.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.lat > 0 ? `${r.lat}°N` : `${Math.abs(r.lat)}°S`} · {Math.abs(r.lon)}°{r.lon > 0 ? "E" : "W"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: cat.color, fontSize: "1.1rem" }}>{r.avgPh}</div>
                    <div style={{ fontSize: "0.7rem", color: "#ef4444" }}>{r.trend}/yr</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div style={s.card}>
              <div style={s.cardTitle}><span>📍</span> {region.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
                <PhGauge ph={region.avgPh} />
              </div>
              {[
                { label: "Temperature", value: `${region.temp}°C`, icon: "🌡️" },
                { label: "Avg Depth", value: `${region.depth.toLocaleString()}m`, icon: "📏" },
                { label: "CO₂ Flux", value: `${region.co2Flux} Gt/yr`, icon: "🏭" },
                { label: "pH Trend", value: `${region.trend}/yr`, icon: "📉" },
                { label: "Lat / Lon", value: `${region.lat}°, ${region.lon}°`, icon: "📍" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e3a5f20" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{item.icon} {item.label}</span>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.85rem" }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Severity</div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {pH_SCALE.map((sc, i) => (
                    <div key={i} style={{ flex: 1, height: "8px", borderRadius: "4px", background: region.avgPh >= sc.min && region.avgPh < sc.max ? sc.color : `${sc.color}30` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Region comparison chart */}
            <div style={s.card}>
              <div style={s.cardTitle}><span>📊</span> Regional pH Comparison</div>
              {OCEAN_REGIONS.map((r, i) => {
                const cat = pH_SCALE.find(c => r.avgPh >= c.min && c.max > r.avgPh) || pH_SCALE[4];
                const pct = ((r.avgPh - 7.9) / 0.35) * 100;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ width: "100px", fontSize: "0.7rem", color: "#94a3b8", textAlign: "right" }}>{r.name.split(" ")[0]}</span>
                    <div style={{ flex: 1, height: "14px", borderRadius: "7px", background: "#1e3a5f30", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: "7px", background: `${cat.color}70` }} />
                    </div>
                    <span style={{ width: "40px", fontSize: "0.75rem", fontWeight: 600, color: cat.color }}>{r.avgPh}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSpecies = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}><span>🐚</span> Marine Species Impact Assessment</div>
        <div style={s.toggleRow}>
          {["all", "coral", "shellfish", "fish", "plankton"].map(f => (
            <button key={f} style={s.toggle(selectedSpecies === f)}
              onClick={() => setSelectedSpecies(selectedSpecies === f ? null : f)}>
              {f === "all" ? "All Species" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {MARINE_SPECIES
          .filter(sp => !selectedSpecies || selectedSpecies === "all" || sp.type === selectedSpecies)
          .map((sp, i) => {
            const riskPct = Math.max(0, Math.min(100, 100 - sp.population));
            const statusColors = { "critically-endangered": "#ef4444", endangered: "#f97316", vulnerable: "#eab308", "least-concern": "#22c55e" };
            return (
              <div key={i} style={s.speciesCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "1.5rem" }}>{sp.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{sp.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{sp.habitat} · {sp.type}</div>
                    </div>
                  </div>
                  <span style={s.badge(statusColors[sp.status])}>{sp.status.replace("-", " ")}</span>
                </div>
                <div style={s.grid2}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                      <span style={{ color: "#94a3b8" }}>Population Health</span>
                      <span style={{ fontWeight: 600, color: sp.population > 60 ? "#22c55e" : sp.population > 40 ? "#eab308" : "#ef4444" }}>{sp.population}%</span>
                    </div>
                    <div style={s.progressTrack}>
                      <div style={s.progressFill(sp.population, sp.population > 60 ? "#22c55e" : sp.population > 40 ? "#eab308" : "#ef4444")} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                      <span style={{ color: "#94a3b8" }}>Decline Rate</span>
                      <span style={{ fontWeight: 600, color: "#ef4444" }}>-{sp.declineRate}%/decade</span>
                    </div>
                    <div style={s.progressTrack}>
                      <div style={s.progressFill(sp.declineRate * 5, "#ef4444")} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "0.75rem" }}>
                  <span style={{ color: "#64748b" }}>Sensitivity: <span style={{ color: sp.phSensitivity === "high" ? "#ef4444" : sp.phSensitivity === "medium" ? "#eab308" : "#22c55e", fontWeight: 600 }}>{sp.phSensitivity}</span></span>
                  <span style={{ color: "#64748b" }}>Critical pH: <span style={{ color: "#06b6d4", fontWeight: 600 }}>{sp.criticalPh}</span></span>
                  <span style={{ color: "#64748b" }}>Risk at Current: <span style={{ color: region.avgPh <= sp.criticalPh ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{region.avgPh <= sp.criticalPh ? "AT RISK" : "Below threshold"}</span></span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const renderDepth = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}><span>📏</span> pH by Ocean Depth Zone</div>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "20px" }}>
          Ocean pH varies by depth due to pressure, temperature, biological activity, and dissolved CO₂ concentration.
        </p>
        {DEPTH_ZONES.map((zone, i) => {
          const phMid = (zone.phRange[0] + zone.phRange[1]) / 2;
          const width = ((phMid - 7.75) / 0.45) * 100;
          return (
            <div key={i} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div>
                  <span style={{ fontWeight: 700, color: zone.color, marginRight: "8px" }}>{zone.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{zone.range}</span>
                </div>
                <span style={s.badge(zone.color)}>pH {zone.phRange[0]}–{zone.phRange[1]}</span>
              </div>
              <div style={s.depthBar(width, zone.color)}>
                <div style={s.depthFill(width, zone.color)} />
                <span style={{ position: "relative", zIndex: 1, fontSize: "0.8rem", color: "#e2e8f0", fontWeight: 600 }}>
                  ☀️ {zone.light} · {zone.organisms}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}><span>🔬</span> Pressure & pH Relationship</div>
        <svg viewBox="0 0 800 250" style={{ width: "100%", height: "260px" }}>
          {(() => {
            const pad = 50, w = 800, h = 250;
            const depths = [0, 200, 500, 1000, 2000, 4000, 6000];
            const phVals = [8.12, 8.08, 8.03, 7.98, 7.92, 7.87, 7.82];
            const stepX = (w - pad * 2) / (depths.length - 1);
            const pts = depths.map((d, i) => ({
              x: pad + i * stepX,
              y: pad + (d / 6000) * (h - pad * 2),
              ph: phVals[i],
            }));
            return (
              <>
                {/* Grid */}
                {depths.map((d, i) => (
                  <g key={i}>
                    <line x1={pad} y1={pts[i].y} x2={w - pad} y2={pts[i].y} stroke="#1e3a5f" strokeWidth="0.5" />
                    <text x={pad - 8} y={pts[i].y + 4} fill="#64748b" fontSize="9" textAnchor="end">{d}m</text>
                  </g>
                ))}
                {/* Line */}
                <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#06b6d4" stroke="#0a1628" strokeWidth="2" />
                    <text x={p.x} y={p.y - 10} fill="#06b6d4" fontSize="9" textAnchor="middle" fontWeight="600">{p.ph}</text>
                  </g>
                ))}
                <text x={w / 2} y={h - 5} fill="#64748b" fontSize="10" textAnchor="middle">pH Value</text>
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );

  const renderProjections = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}><span>📈</span> pH Projections by Emission Scenario</div>
        <div style={s.toggleRow}>
          {CO2_SCENARIOS.map(sc => (
            <button key={sc.id} style={s.toggle(selectedScenario === sc.id)}
              onClick={() => setSelectedScenario(sc.id)}>
              {sc.name}
            </button>
          ))}
        </div>

        <svg viewBox="0 0 800 300" style={{ width: "100%", height: "320px" }}>
          {(() => {
            const pad = 50, w = 800, h = 300;
            const phMin = 7.4, phMax = 8.2;
            const stepX = (w - pad * 2) / (decadal.length - 1);
            return (
              <>
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={i}>
                    <line x1={pad} y1={h - pad - pct * (h - pad * 2)} x2={w - pad} y2={h - pad - pct * (h - pad * 2)} stroke="#1e3a5f" strokeWidth="0.5" />
                    <text x={pad - 8} y={h - pad - pct * (h - pad * 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">{(phMax - pct * (phMax - phMin)).toFixed(2)}</text>
                  </g>
                ))}
                {/* Coral bleaching threshold */}
                <line x1={pad} y1={h - pad - ((8.0 - phMin) / (phMax - phMin)) * (h - pad * 2)} x2={w - pad} y2={h - pad - ((8.0 - phMin) / (phMax - phMin)) * (h - pad * 2)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" />
                <text x={w - pad + 5} y={h - pad - ((8.0 - phMin) / (phMax - phMin)) * (h - pad * 2)} fill="#ef4444" fontSize="8">Coral threshold</text>
                {/* Now line */}
                <line x1={pad} y1={h - pad} x2={pad} y2={pad} stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                {/* Scenario lines */}
                {CO2_SCENARIOS.map(sc => {
                  const key = sc.id.replace("rcp", "rcp");
                  const vals = decadal.map(d => d[key] || d.rcp45);
                  const pts = vals.map((v, i) => ({
                    x: pad + i * stepX,
                    y: h - pad - ((v - phMin) / (phMax - phMin)) * (h - pad * 2),
                  }));
                  return (
                    <g key={sc.id} opacity={selectedScenario === sc.id ? 1 : 0.3}>
                      <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={sc.color} strokeWidth={selectedScenario === sc.id ? 3 : 1.5} strokeLinejoin="round" />
                      {selectedScenario === sc.id && pts.map((p, i) => i % 3 === 0 && (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill={sc.color} />
                      ))}
                    </g>
                  );
                })}
                {/* Year labels */}
                {decadal.filter((_, i) => i % 3 === 0).map((d, i) => (
                  <text key={i} x={pad + (i * 3) * stepX} y={h - pad + 16} fill="#64748b" fontSize="9" textAnchor="middle">{d.year}</text>
                ))}
              </>
            );
          })()}
        </svg>

        {/* Scenario details */}
        <div style={s.grid2}>
          {CO2_SCENARIOS.map(sc => (
            <div key={sc.id} style={{ ...s.insightCard, borderLeft: `4px solid ${sc.color}`, cursor: "pointer", opacity: selectedScenario === sc.id ? 1 : 0.6 }}
              onClick={() => setSelectedScenario(sc.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: sc.color }}>{sc.name}</span>
                {selectedScenario === sc.id && <span style={s.badge(sc.color)}>Active</span>}
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
                <span>Peak: {sc.peakPpm} ppm ({sc.peakYear})</span>
                <span>End: {sc.endPpm} ppm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHistorical = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}><span>🕰️</span> Historical Data (1850–2025)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1e3a5f" }}>
                {["Year", "Ocean pH", "CO₂ (ppm)", "pH Change", "CO₂ Change", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_PH.map((d, i) => {
                const prev = HISTORICAL_PH[i - 1];
                const phDelta = prev ? (d.ph - prev.ph).toFixed(4) : "—";
                const co2Delta = prev ? d.co2 - prev.co2 : 0;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #1e3a5f20" }}>
                    <td style={{ padding: "8px", fontWeight: 600, color: "#e2e8f0" }}>{d.year}</td>
                    <td style={{ padding: "8px", color: "#06b6d4" }}>{d.ph}</td>
                    <td style={{ padding: "8px", color: "#f97316" }}>{d.co2}</td>
                    <td style={{ padding: "8px", color: typeof phDelta === "string" ? "#64748b" : phDelta < 0 ? "#ef4444" : "#22c55e" }}>{typeof phDelta === "string" ? phDelta : `${phDelta > 0 ? "+" : ""}${phDelta}`}</td>
                    <td style={{ padding: "8px", color: co2Delta > 0 ? "#ef4444" : "#22c55e" }}>{co2Delta > 0 ? `+${co2Delta}` : co2Delta}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={s.badge(d.ph > 8.15 ? "#22c55e" : d.ph > 8.05 ? "#eab308" : "#ef4444")}>
                        {d.ph > 8.15 ? "Healthy" : d.ph > 8.05 ? "Declining" : "Critical"}
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
  );

  const renderInsights = () => {
    const insights = [
      { icon: "🔬", title: "The Chemistry of Acidification", color: "#06b6d4", body: `Since pre-industrial times, ocean pH has dropped from 8.25 to ${globalAvgPh} — a ${Math.round(((8.25 - globalAvgPh) / 8.25) * 10000) / 100}% increase in acidity (remember pH is logarithmic). The ocean absorbs roughly 30% of human CO₂ emissions, creating carbonic acid that releases hydrogen ions and reduces carbonate ion availability.` },
      { icon: "🪸", title: "Coral Reef Crisis", color: "#ef4444", body: `At current pH levels, ${criticalSpecies.filter(sp => region.avgPh <= sp.criticalPh).length} of ${criticalSpecies.length} critical species face direct risk. Coral reefs, which support 25% of marine biodiversity, face mass bleaching when pH drops below 8.0. The Great Barrier Reef has experienced 5 mass bleaching events since 2016.` },
      { icon: "📊", title: "The Logarithmic Truth", color: "#eab308", body: `A pH drop from 8.25 to 8.05 seems small but represents a 58% increase in hydrogen ion concentration. Each 0.1 pH unit decrease roughly doubles acidity. By 2100 under business-as-usual (RCP 8.5), ocean acidity could increase 150% from pre-industrial levels.` },
      { icon: "🌊", title: "Ocean as Carbon Sink", color: "#8b5cf6", body: `The world's oceans absorb approximately ${totalCo2Absorbed} gigatons of CO₂ annually — a critical service that slows atmospheric warming. However, this absorption comes at a cost: the Southern Ocean alone absorbs 2.8 Gt/yr but faces the steepest pH decline at ${OCEAN_REGIONS.find(r => r.id === "southern-ocean")?.trend}/yr.` },
      { icon: "🐚", title: "Shell Dissolution Risk", color: "#f97316", body: `Pteropods (sea butterflies) — tiny marine snails at the base of polar food webs — show shell dissolution rates 18% per decade. At pH below 7.9, aragonite (the mineral in shells) becomes thermodynamically unstable, meaning shells literally dissolve in seawater.` },
      { icon: "💡", title: "Action Required", color: "#22c55e", body: `Meeting Paris Agreement targets (RCP 2.6) could stabilize ocean pH by 2050. Current national pledges put us closer to RCP 4.5. Local actions like reducing coastal pollution, protecting seagrass meadows (which locally raise pH through photosynthesis), and supporting marine protected areas can build resilience.` },
    ];

    return (
      <div>
        <div style={s.card}>
          <div style={s.cardTitle}><span>💡</span> AI-Powered Analysis</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ ...s.insightCard, borderLeft: `4px solid ${ins.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontWeight: 600 }}>
                <span>{ins.icon}</span>
                <span style={{ color: ins.color }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>{ins.body}</div>
            </div>
          ))}
        </div>

        {/* Mitigation Strategies */}
        <div style={s.card}>
          <div style={s.cardTitle}><span>🛡️</span> Mitigation & Adaptation Strategies</div>
          <div style={s.grid3}>
            {[
              { title: "CO₂ Emissions Reduction", icon: "🏭", desc: "Transition to renewable energy, improve efficiency, electrify transport. The most impactful lever for ocean pH.", impact: "Critical", color: "#ef4444" },
              { title: "Blue Carbon Ecosystems", icon: "🌿", desc: "Protect and restore mangroves, seagrass beds, salt marshes. These ecosystems locally raise pH through photosynthesis.", impact: "High", color: "#22c55e" },
              { title: "Marine Protected Areas", icon: "🏝️", desc: "MPAs reduce local stressors (overfishing, pollution), building ecosystem resilience to pH changes.", impact: "High", color: "#22c55e" },
              { title: "Alkalinity Enhancement", icon: "⚗️", desc: "Adding alkaline minerals to seawater to buffer pH. Experimental but promising for coral reef protection.", impact: "Medium", color: "#eab308" },
              { title: "Sustainable Fishing", icon: "🎣", desc: "Reduce bycatch and destructive fishing. Healthy fish populations maintain ecosystem balance.", impact: "Medium", color: "#eab308" },
              { title: "Monitoring & Research", icon: "📡", desc: "Expand ocean observing networks. Better data improves predictions and intervention targeting.", impact: "Ongoing", color: "#06b6d4" },
            ].map((st, i) => (
              <div key={i} style={{ ...s.insightCard, borderLeft: `4px solid ${st.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{st.icon}</span>
                  <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{st.title}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "8px" }}>{st.desc}</div>
                <span style={s.badge(st.color)}>Impact: {st.impact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>🌊 Ocean Acidification Monitor</h1>
        <p style={s.subtitle}>Real-time pH tracking, marine ecosystem impact, and predictive modeling across world oceans</p>
      </div>

      <div style={s.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={s.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "regions" && renderRegions()}
      {activeTab === "species" && renderSpecies()}
      {activeTab === "depth" && renderDepth()}
      {activeTab === "projections" && renderProjections()}
      {activeTab === "historical" && renderHistorical()}
      {activeTab === "insights" && renderInsights()}

      <div style={{ textAlign: "center", padding: "24px 0", color: "#1e3a5f", fontSize: "0.75rem" }}>
        🌊 Ocean Acidification Monitor · Based on NOAA & SOCAT Data · Updated hourly
      </div>
    </div>
  );
}
