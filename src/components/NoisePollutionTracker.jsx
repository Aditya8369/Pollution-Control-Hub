import React, { useState, useMemo } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────
const DECIBEL_LEVELS = [
  { min: 0, max: 30, label: "Silent", color: "#22c55e", icon: "🤫", hearing: "No risk", desc: "Whisper, rustling leaves" },
  { min: 31, max: 50, label: "Quiet", color: "#86efac", icon: "🍃", hearing: "No risk", desc: "Quiet conversation, birdsong" },
  { min: 51, max: 70, label: "Moderate", color: "#eab308", icon: "🗣️", hearing: "Low risk", desc: "Normal conversation, office" },
  { min: 71, max: 85, label: "Loud", color: "#f97316", icon: "🔊", hearing: "Moderate risk", desc: "Vacuum, busy traffic" },
  { min: 86, max: 100, label: "Very Loud", color: "#ef4444", icon: "📢", hearing: "High risk", desc: "Power tools, motorcycle" },
  { min: 101, max: 120, label: "Dangerous", color: "#dc2626", icon: "⚠️", hearing: "Severe risk", desc: "Jackhammer, chainsaw" },
  { min: 121, max: 140, label: "Painful", color: "#991b1b", icon: "🚨", hearing: "Immediate damage", desc: "Jet engine, gunshot" },
  { min: 141, max: 200, label: "Fatal", color: "#450a0a", icon: "☠️", hearing: "Instant damage", desc: "Rocket launch, explosion" },
];

const NOISE_SOURCES = [
  { id: "traffic", name: "Traffic", icon: "🚗", baseDecibel: 78, peak: 92, category: "transport", indoor: 65, outdoor: 82 },
  { id: "construction", name: "Construction", icon: "🏗️", baseDecibel: 95, peak: 115, category: "industrial", indoor: 80, outdoor: 105 },
  { id: "aircraft", name: "Aircraft", icon: "✈️", baseDecibel: 105, peak: 135, category: "transport", indoor: 85, outdoor: 130 },
  { id: "music", name: "Live Music", icon: "🎵", baseDecibel: 100, peak: 120, category: "entertainment", indoor: 110, outdoor: 95 },
  { id: "factories", name: "Factories", icon: "🏭", baseDecibel: 85, peak: 105, category: "industrial", indoor: 90, outdoor: 88 },
  { id: "neighborhood", name: "Neighborhood", icon: "🏘️", baseDecibel: 55, peak: 75, category: "residential", indoor: 45, outdoor: 60 },
  { id: "sports", name: "Sports Events", icon: "🏟️", baseDecibel: 90, peak: 115, category: "entertainment", indoor: 95, outdoor: 100 },
  { id: "pets", name: "Barking Dogs", icon: "🐕", baseDecibel: 70, peak: 95, category: "residential", indoor: 75, outdoor: 80 },
  { id: "sirens", name: "Emergency Sirens", icon: "🚑", baseDecibel: 110, peak: 130, category: "transport", indoor: 80, outdoor: 120 },
  { id: "lawn", name: "Lawn Equipment", icon: "🌿", baseDecibel: 85, peak: 100, category: "residential", indoor: 65, outdoor: 92 },
  { id: "trains", name: "Rail Traffic", icon: "🚂", baseDecibel: 88, peak: 105, category: "transport", indoor: 75, outdoor: 95 },
  { id: "clubs", name: "Nightclubs/Bars", icon: "🎶", baseDecibel: 105, peak: 125, category: "entertainment", indoor: 115, outdoor: 85 },
];

const ZONES = [
  { id: "residential", name: "Residential", limit: 55, nightLimit: 45, color: "#22c55e", icon: "🏠" },
  { id: "commercial", name: "Commercial", limit: 70, nightLimit: 60, color: "#eab308", icon: "🏬" },
  { id: "industrial", name: "Industrial", limit: 80, nightLimit: 70, color: "#f97316", icon: "🏭" },
  { id: "hospital", name: "Hospital Zone", limit: 45, nightLimit: 40, color: "#06b6d4", icon: "🏥" },
  { id: "school", name: "School Zone", limit: 55, nightLimit: 50, color: "#8b5cf6", icon: "🏫" },
  { id: "park", name: "Park/Recreation", limit: 50, nightLimit: 45, color: "#22c55e", icon: "🌳" },
];

const DAY_PARTS = [
  { id: "morning", label: "Morning (6-10)", hours: [6, 7, 8, 9] },
  { id: "midday", label: "Midday (10-14)", hours: [10, 11, 12, 13] },
  { id: "afternoon", label: "Afternoon (14-18)", hours: [14, 15, 16, 17] },
  { id: "evening", label: "Evening (18-22)", hours: [18, 19, 20, 21] },
  { id: "night", label: "Night (22-6)", hours: [22, 23, 0, 1, 2, 3, 4, 5] },
];

function generateHourlyNoise(base = 65) {
  const hours = [];
  const now = new Date();
  for (let h = 0; h < 168; h++) {
    const time = new Date(now.getTime() + h * 3600000);
    const hour = time.getHours();
    const dayOfWeek = time.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    // Traffic patterns
    const rushFactor = !isWeekend ? ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.25 : 1.0) : 0.85;
    const nightFactor = hour >= 22 || hour <= 5 ? 0.7 : 1.0;
    const weekendFactor = isWeekend ? 0.9 : 1.0;
    const noise = base * rushFactor * nightFactor * weekendFactor + (Math.random() * 15 - 7);
    hours.push({
      time,
      hour,
      dayOfWeek,
      db: Math.max(25, Math.min(130, Math.round(noise))),
      sources: NOISE_SOURCES.filter(() => Math.random() > 0.85).map(s => s.id),
    });
  }
  return hours;
}

function generateWeekdayPattern() {
  return DAY_PARTS.map(dp => {
    const base = dp.id === "night" ? 42 : dp.id === "morning" ? 72 : dp.id === "midday" ? 68 : dp.id === "afternoon" ? 75 : 60;
    return {
      ...dp,
      avgDb: Math.round(base + Math.random() * 8),
      maxDb: Math.round(base + 15 + Math.random() * 10),
      sources: NOISE_SOURCES.filter(() => Math.random() > 0.6).slice(0, 3),
    };
  });
}

function generateCityData() {
  const cities = [
    { name: "Mumbai", country: "India", avgDb: 82, peakDb: 118, topSource: "Traffic", trend: "up" },
    { name: "Delhi", country: "India", avgDb: 85, peakDb: 122, topSource: "Construction", trend: "up" },
    { name: "New York", country: "USA", avgDb: 78, peakDb: 110, topSource: "Traffic", trend: "stable" },
    { name: "London", country: "UK", avgDb: 72, peakDb: 105, topSource: "Traffic", trend: "down" },
    { name: "Tokyo", country: "Japan", avgDb: 74, peakDb: 100, topSource: "Traffic", trend: "down" },
    { name: "Beijing", country: "China", avgDb: 80, peakDb: 115, topSource: "Construction", trend: "stable" },
    { name: "Istanbul", country: "Turkey", avgDb: 76, peakDb: 108, topSource: "Traffic", trend: "up" },
    { name: "Cairo", country: "Egypt", avgDb: 79, peakDb: 112, topSource: "Traffic", trend: "up" },
    { name: "Los Angeles", country: "USA", avgDb: 70, peakDb: 98, topSource: "Traffic", trend: "stable" },
    { name: "Berlin", country: "Germany", avgDb: 65, peakDb: 92, topSource: "Nightlife", trend: "down" },
  ];
  return cities;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const st = {
  container: { padding: "20px", fontFamily: "'Inter', -apple-system, sans-serif", background: "linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0520 100%)", color: "#e2e8f0", minHeight: "100vh" },
  header: { textAlign: "center", marginBottom: "32px" },
  title: { fontSize: "2.2rem", fontWeight: 800, background: "linear-gradient(135deg, #a855f7, #ec4899, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" },
  subtitle: { color: "#94a3b8", fontSize: "1rem" },
  tabs: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" },
  tab: (active) => ({ padding: "10px 20px", borderRadius: "12px", border: active ? "2px solid #a855f7" : "2px solid #2d1b4e", background: active ? "rgba(168,85,247,0.15)" : "#1a0a2e", color: active ? "#a855f7" : "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.3s" }),
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" },
  kpi: { background: "rgba(26,10,46,0.8)", borderRadius: "16px", padding: "20px", border: "1px solid #2d1b4e", textAlign: "center" },
  kpiVal: (c) => ({ fontSize: "2rem", fontWeight: 800, color: c || "#a855f7" }),
  kpiLabel: { color: "#64748b", fontSize: "0.8rem", marginTop: "4px" },
  card: { background: "rgba(26,10,46,0.8)", borderRadius: "16px", padding: "24px", border: "1px solid #2d1b4e", marginBottom: "20px" },
  cardTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, background: `${color}25`, color, border: `1px solid ${color}40` }),
  progressTrack: { width: "100%", height: "8px", borderRadius: "4px", background: "#2d1b4e", marginTop: "6px" },
  progressFill: (pct, color) => ({ height: "100%", width: `${pct}%`, borderRadius: "4px", background: color, transition: "width 0.5s" }),
  alertBanner: (level) => ({
    padding: "16px 24px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", fontWeight: 600,
    background: level === "safe" ? "rgba(34,197,94,0.12)" : level === "caution" ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)",
    borderLeft: `4px solid ${level === "safe" ? "#22c55e" : level === "caution" ? "#eab308" : "#ef4444"}`,
  }),
  sourceCard: { padding: "16px", borderRadius: "12px", background: "rgba(13,5,32,0.6)", border: "1px solid #2d1b4e", marginBottom: "12px" },
  toggleRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  toggle: (active) => ({ padding: "6px 14px", borderRadius: "20px", border: active ? "2px solid #a855f7" : "1px solid #2d1b4e", background: active ? "rgba(168,85,247,0.15)" : "transparent", color: active ? "#a855f7" : "#64748b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }),
  svgContainer: { width: "100%", overflow: "visible" },
  select: { padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d1b4e", background: "#1a0a2e", color: "#e2e8f0", fontSize: "0.9rem", cursor: "pointer" },
  zoneRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", background: "rgba(13,5,32,0.4)", marginBottom: "8px" },
  heatmapCell: (db) => {
    const lvl = DECIBEL_LEVELS.find(l => db >= l.min && db <= l.max) || DECIBEL_LEVELS[0];
    return { aspectRatio: "1", borderRadius: "4px", background: lvl.color + "aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: db > 90 ? "#fff" : "#1a0a2e", fontWeight: 700, cursor: "pointer" };
  },
  ringGauge: (pct, color) => ({
    width: "120px", height: "120px", borderRadius: "50%",
    background: `conic-gradient(${color} ${pct * 3.6}deg, #2d1b4e ${pct * 3.6}deg)`,
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative", margin: "0 auto",
  }),
  ringInner: { width: "96px", height: "96px", borderRadius: "50%", background: "#1a0a2e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
};

// ─── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#a855f7", width = 120, height = 36 }) {
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NoisePollutionTracker() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedZone, setSelectedZone] = useState("residential");
  const [selectedSource, setSelectedSource] = useState(null);
  const [timeRange, setTimeRange] = useState("24h");

  const hourly = useMemo(() => generateHourlyNoise(), []);
  const weekdayPattern = useMemo(() => generateWeekdayPattern(), []);
  const cities = useMemo(() => generateCityData(), []);

  const currentDb = hourly[0]?.db || 68;
  const currentLvl = DECIBEL_LEVELS.find(l => currentDb >= l.min && l.currentDb <= l.max) || DECIBEL_LEVELS[3];
  const zone = ZONES.find(z => z.id === selectedZone);
  const isNight = new Date().getHours() >= 22 || new Date().getHours() <= 5;
  const limit = isNight ? zone.nightLimit : zone.limit;
  const isOverLimit = currentDb > limit;
  const alertLevel = currentDb < 50 ? "safe" : currentDb < 85 ? "caution" : "danger";

  const avgDb = Math.round(hourly.slice(0, 24).reduce((s, h) => s + h.db, 0) / 24);
  const maxDb = Math.max(...hourly.slice(0, 24).map(h => h.db));
  const quietestHour = hourly.slice(0, 24).reduce((min, h) => h.db < min.db ? h : min, hourly[0]);
  const loudestHour = hourly.slice(0, 24).reduce((max, h) => h.db > max.db ? h : max, hourly[0]);

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "heatmap", label: "🗓️ Weekly Map" },
    { id: "sources", label: "🔊 Sources" },
    { id: "zones", label: "🗺️ Zones" },
    { id: "health", label: "🏥 Health" },
    { id: "global", label: "🌍 Global" },
    { id: "insights", label: "💡 Insights" },
  ];

  const renderOverview = () => (
    <div>
      <div style={st.alertBanner(alertLevel)}>
        <span style={{ fontSize: "1.5rem" }}>{currentLvl.icon}</span>
        <div>
          <div>Current Noise Level: <strong style={{ color: currentLvl.color }}>{currentDb} dB</strong> — {currentLvl.label}</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{currentLvl.desc} · {isOverLimit ? `⚠️ Exceeds ${zone.name} limit of ${limit} dB` : `✅ Within ${zone.name} limit of ${limit} dB`}</div>
        </div>
      </div>

      <div style={st.kpiRow}>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🔊</div>
          <div style={st.kpiVal(currentLvl.color)}>{currentDb} dB</div>
          <div style={st.kpiLabel}>Current Level</div>
          <Sparkline data={hourly.slice(0, 24).map(h => h.db)} color={currentLvl.color} />
        </div>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>📊</div>
          <div style={st.kpiVal("#eab308")}>{avgDb} dB</div>
          <div style={st.kpiLabel}>24h Average</div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>{DECIBEL_LEVELS.find(l => avgDb >= l.min && avgDb <= l.max)?.label}</div>
        </div>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>⬆️</div>
          <div style={st.kpiVal("#ef4444")}>{maxDb} dB</div>
          <div style={st.kpiLabel}>Peak (24h)</div>
          <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: "4px" }}>at {loudestHour.time?.toLocaleTimeString([], { hour: "2-digit" })}</div>
        </div>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>⬇️</div>
          <div style={st.kpiVal("#22c55e")}>{quietestHour.db} dB</div>
          <div style={st.kpiLabel}>Quietest (24h)</div>
          <div style={{ fontSize: "0.7rem", color: "#22c55e", marginTop: "4px" }}>at {quietestHour.time?.toLocaleTimeString([], { hour: "2-digit" })}</div>
        </div>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>{isNight ? "🌙" : "☀️"}</div>
          <div style={st.kpiVal(isOverLimit ? "#ef4444" : "#22c55e")}>{isOverLimit ? "EXCEED" : "OK"}</div>
          <div style={st.kpiLabel}>{isNight ? "Night" : "Day"} Limit</div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>Limit: {limit} dB</div>
        </div>
        <div style={st.kpi}>
          <div style={{ fontSize: "1.3rem" }}>⏱️</div>
          <div style={st.kpiVal("#a855f7")}>{Math.round(hourly.slice(0, 24).filter(h => h.db > 85).length / 24 * 100)}%</div>
          <div style={st.kpiLabel}>Hours Above 85 dB</div>
          <div style={st.progressTrack}>
            <div style={st.progressFill(Math.round(hourly.slice(0, 24).filter(h => h.db > 85).length / 24 * 100), "#ef4444")} />
          </div>
        </div>
      </div>

      {/* 24h dB Chart */}
      <div style={st.card}>
        <div style={st.cardTitle}><span>📈</span> 24-Hour Noise Profile</div>
        <svg viewBox="0 0 800 250" style={{ width: "100%", height: "260px" }}>
          {(() => {
            const pad = 50, w = 800, h = 250;
            const data = hourly.slice(0, 24);
            const max = 130, min = 20;
            const step = (w - pad * 2) / (data.length - 1);
            const pts = data.map((d, i) => ({
              x: pad + i * step,
              y: h - pad - ((d.db - min) / (max - min)) * (h - pad * 2),
              db: d.db,
            }));
            const line = pts.map(p => `${p.x},${p.y}`).join(" ");
            const area = `0,${h - pad} ${line} ${w - pad},${h - pad}`;
            return (
              <>
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={i}>
                    <line x1={pad} y1={h - pad - pct * (h - pad * 2)} x2={w - pad} y2={h - pad - pct * (h - pad * 2)} stroke="#2d1b4e" strokeWidth="0.5" />
                    <text x={pad - 8} y={h - pad - pct * (h - pad * 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">{Math.round(max - pct * (max - min))}</text>
                  </g>
                ))}
                {/* Danger zone */}
                <rect x={pad} y={h - pad - ((85 - min) / (max - min)) * (h - pad * 2)} width={w - pad * 2} height={((85 - min) / (max - min)) * (h - pad * 2) - (h - pad - (h - pad))} fill="#ef444410" />
                <line x1={pad} y1={h - pad - ((85 - min) / (max - min)) * (h - pad * 2)} x2={w - pad} y2={h - pad - ((85 - min) / (max - min)) * (h - pad * 2)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" />
                <text x={w - pad + 5} y={h - pad - ((85 - min) / (max - min)) * (h - pad * 2) + 4} fill="#ef4444" fontSize="9">Hearing Risk</text>
                {/* Zone limit */}
                <line x1={pad} y1={h - pad - ((limit - min) / (max - min)) * (h - pad * 2)} x2={w - pad} y2={h - pad - ((limit - min) / (max - min)) * (h - pad * 2)} stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={pad - 5} y={h - pad - ((limit - min) / (max - min)) * (h - pad * 2) + 4} fill="#eab308" fontSize="9" textAnchor="end">Zone Limit ({limit} dB)</text>
                <polygon points={area} fill="url(#noiseGrad)" />
                <polyline points={line} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinejoin="round" />
                {pts.map((p, i) => {
                  const lvl = DECIBEL_LEVELS.find(l => p.db >= l.min && p.db <= l.max) || DECIBEL_LEVELS[0];
                  return <circle key={i} cx={p.x} cy={p.y} r="3" fill={lvl.color} />;
                })}
                {pts.filter((_, i) => i % 3 === 0).map((p, i) => (
                  <text key={i} x={p.x} y={h - pad + 16} fill="#64748b" fontSize="9" textAnchor="middle">
                    {data[Math.round(i * 3)]?.time?.toLocaleTimeString([], { hour: "2-digit" })}
                  </text>
                ))}
                <defs>
                  <linearGradient id="noiseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Decibel Scale Reference */}
      <div style={st.card}>
        <div style={st.cardTitle}><span>📏</span> Decibel Scale Reference</div>
        {DECIBEL_LEVELS.map((lvl, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: "1px solid #2d1b4e20" }}>
            <span style={{ fontSize: "1.2rem", width: "30px", textAlign: "center" }}>{lvl.icon}</span>
            <div style={{ width: "100px", fontSize: "0.85rem", fontWeight: 600, color: lvl.color }}>{lvl.label}</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: "14px", borderRadius: "7px", background: "#2d1b4e", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(lvl.max / 160) * 100}%`, borderRadius: "7px", background: `${lvl.color}70` }} />
                {currentDb >= lvl.min && currentDb <= lvl.max && (
                  <div style={{ position: "absolute", left: `${(currentDb / 160) * 100}%`, top: "-2px", width: "3px", height: "18px", background: "#fff", borderRadius: "2px" }} />
                )}
              </div>
            </div>
            <div style={{ width: "80px", fontSize: "0.75rem", color: "#94a3b8" }}>{lvl.min}–{lvl.max} dB</div>
            <div style={{ width: "120px", fontSize: "0.7rem", color: "#64748b" }}>{lvl.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHeatmap = () => {
    const weekData = [];
    for (let d = 0; d < 7; d++) {
      const dayHours = [];
      for (let h = 0; h < 24; h++) {
        const idx = d * 24 + h;
        dayHours.push(hourly[idx % hourly.length]?.db || 60);
      }
      weekData.push(dayHours);
    }
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div>
        <div style={st.card}>
          <div style={st.cardTitle}><span>🗓️</span> Weekly Noise Heatmap</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px" }}>Each cell shows the average noise level (dB) for that hour</div>
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(24, 1fr)", gap: "3px" }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ textAlign: "center", fontSize: "0.6rem", color: "#64748b" }}>{h}</div>
            ))}
            {weekData.map((dayData, d) => (
              <>
                <div key={`label-${d}`} style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>{days[d]}</div>
                {dayData.map((db, h) => (
                  <div key={`${d}-${h}`} title={`${days[d]} ${h}:00 — ${db} dB`} style={st.heatmapCell(db)}>
                    {db}
                  </div>
                ))}
              </>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
            {DECIBEL_LEVELS.filter(l => l.max <= 140).map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: l.color + "aa" }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Day/night comparison */}
        <div style={st.grid2}>
          <div style={st.card}>
            <div style={st.cardTitle}><span>☀️</span> Daytime (6 AM – 10 PM)</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#eab308", textAlign: "center", marginBottom: "12px" }}>
              {Math.round(hourly.filter(h => h.hour >= 6 && h.hour <= 22).reduce((s, h) => s + h.db, 0) / hourly.filter(h => h.hour >= 6 && h.hour <= 22).length)} dB
            </div>
            <Sparkline data={hourly.filter(h => h.hour >= 6 && h.hour <= 22).map(h => h.db)} color="#eab308" width={300} height={60} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px", fontSize: "0.8rem" }}>
              <span style={{ color: "#94a3b8" }}>Peak: <strong style={{ color: "#ef4444" }}>{maxDb} dB</strong></span>
              <span style={{ color: "#94a3b8" }}>Sources: <strong style={{ color: "#a855f7" }}>{NOISE_SOURCES.filter(s => s.baseDecibel > 70).length}</strong></span>
            </div>
          </div>
          <div style={st.card}>
            <div style={st.cardTitle}><span>🌙</span> Nighttime (10 PM – 6 AM)</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#8b5cf6", textAlign: "center", marginBottom: "12px" }}>
              {Math.round(hourly.filter(h => h.hour >= 22 || h.hour < 6).reduce((s, h) => s + h.db, 0) / hourly.filter(h => h.hour >= 22 || h.hour < 6).length)} dB
            </div>
            <Sparkline data={hourly.filter(h => h.hour >= 22 || h.hour < 6).map(h => h.db)} color="#8b5cf6" width={300} height={60} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px", fontSize: "0.8rem" }}>
              <span style={{ color: "#94a3b8" }}>Peak: <strong style={{ color: "#ef4444" }}>{Math.max(...hourly.filter(h => h.hour >= 22 || h.hour < 6).map(h => h.db))} dB</strong></span>
              <span style={{ color: "#94a3b8" }}>Night limit: <strong style={{ color: "#eab308" }}>{zone.nightLimit} dB</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSources = () => (
    <div>
      <div style={st.card}>
        <div style={st.cardTitle}><span>🔊</span> Noise Sources & Impact</div>
        {NOISE_SOURCES.map((src, i) => {
          const lvl = DECIBEL_LEVELS.find(l => src.baseDecibel >= l.min && src.baseDecibel <= l.max) || DECIBEL_LEVELS[0];
          return (
            <div key={i} style={st.sourceCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>{src.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{src.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{src.category} · Indoor: {src.indoor} dB · Outdoor: {src.outdoor} dB</div>
                </div>
                <span style={st.badge(lvl.color)}>{lvl.icon} {src.baseDecibel} dB avg</span>
                <span style={st.badge("#ef4444")}>Peak: {src.peak} dB</span>
              </div>
              <div style={st.progressTrack}>
                <div style={st.progressFill((src.baseDecibel / 140) * 100, lvl.color)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.75rem" }}>
                <span style={{ color: "#64748b" }}>Indoor: {src.indoor} dB</span>
                <span style={{ color: "#64748b" }}>Outdoor: {src.outdoor} dB</span>
                <span style={{ color: "#64748b" }}>Exposure risk: {src.baseDecibel > 85 ? "⚠️ High" : src.baseDecibel > 70 ? "⚡ Moderate" : "✅ Low"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderZones = () => (
    <div>
      <div style={st.card}>
        <div style={st.cardTitle}><span>🗺️</span> Noise Zone Regulations</div>
        {ZONES.map((z, i) => {
          const active = selectedZone === z.id;
          return (
            <div key={i} style={{ ...st.zoneRow, borderColor: active ? z.color : "#2d1b4e", background: active ? `${z.color}10` : undefined, cursor: "pointer" }}
              onClick={() => setSelectedZone(z.id)}>
              <span style={{ fontSize: "1.3rem" }}>{z.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: active ? z.color : "#e2e8f0" }}>{z.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Day limit: {z.limit} dB · Night limit: {z.nightLimit} dB</div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Day</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: z.color }}>{z.limit}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Night</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: z.color }}>{z.nightLimit}</div>
                </div>
                <span style={st.badge(z.color)}>Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance chart */}
      <div style={st.card}>
        <div style={st.cardTitle}><span>✅</span> Compliance Status — {zone.name}</div>
        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <div style={{ ...st.kpi, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "4px" }}>Day Compliance</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: currentDb <= zone.limit ? "#22c55e" : "#ef4444" }}>
              {Math.round(hourly.filter(h => h.hour >= 6 && h.hour <= 22 && h.db <= zone.limit).length / hourly.filter(h => h.hour >= 6 && h.hour <= 22).length * 100)}%
            </div>
            <div style={st.progressTrack}>
              <div style={st.progressFill(Math.round(hourly.filter(h => h.hour >= 6 && h.hour <= 22 && h.db <= zone.limit).length / hourly.filter(h => h.hour >= 6 && h.hour <= 22).length * 100), "#22c55e")} />
            </div>
          </div>
          <div style={{ ...st.kpi, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "4px" }}>Night Compliance</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color={hourly.filter(h => (h.hour >= 22 || h.hour < 6) && h.db > zone.nightLimit).length === 0 ? "#22c55e" : "#ef4444"}>
              {Math.round(hourly.filter(h => (h.hour >= 22 || h.hour < 6) && h.db <= zone.nightLimit).length / hourly.filter(h => h.hour >= 22 || h.hour < 6).length * 100)}%
            </div>
            <div style={st.progressTrack}>
              <div style={st.progressFill(Math.round(hourly.filter(h => (h.hour >= 22 || h.hour < 6) && h.db <= zone.nightLimit).length / hourly.filter(h => h.hour >= 22 || h.hour < 6).length * 100), "#22c55e")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHealth = () => {
    const exposureHours = hourly.slice(0, 24).filter(h => h.db > 85).length;
    const dailyDose = Math.round(hourly.slice(0, 24).reduce((s, h) => s + (h.db > 40 ? Math.pow(10, h.db / 10) : 0), 0));
    const leq8h = Math.round(10 * Math.log10(dailyDose / 8));

    return (
      <div>
        <div style={st.card}>
          <div style={st.cardTitle}><span>🏥</span> Hearing Health Assessment</div>
          <div style={st.grid2}>
            <div>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={st.ringGauge(Math.min(100, (currentDb / 140) * 100), currentLvl.color)}>
                  <div style={st.ringInner}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: currentLvl.color }}>{currentDb}</div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>dB</div>
                  </div>
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.85rem", color: currentLvl.color, fontWeight: 600 }}>{currentLvl.hearing}</div>
              </div>
              <div style={st.kpiRow}>
                <div style={{ ...st.kpi, flex: 1 }}>
                  <div style={st.kpiVal("#f97316")}>{leq8h} dB</div>
                  <div style={st.kpiLabel}>Leq(8h) Noise Dose</div>
                </div>
                <div style={{ ...st.kpi, flex: 1 }}>
                  <div style={st.kpiVal("#ef4444")}>{exposureHours}h</div>
                  <div style={st.kpiLabel}>Hours Above 85 dB</div>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ color: "#e2e8f0", marginBottom: "12px" }}>Risk by Exposure Duration</h4>
              {[
                { duration: "Continuous (8h+)", limit: "85 dB", risk: "High", color: "#ef4444", icon: "⏰" },
                { duration: "Short burst", limit: "100 dB", risk: "Moderate", color: "#eab308", icon: "💥" },
                { duration: "Impulse (gunshot)", limit: "140 dB", risk: "Immediate", color: "#dc2626", icon: "🔫" },
                { duration: "Chronic daily", limit: "70 dB", risk: "Cumulative", color: "#f97316", icon: "📅" },
                { duration: "Nighttime exposure", limit: "55 dB", risk: "Sleep disturb", color: "#8b5cf6", icon: "🌙" },
              ].map((exp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", borderRadius: "8px", background: "rgba(13,5,32,0.4)", marginBottom: "6px" }}>
                  <span>{exp.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0" }}>{exp.duration}</div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Limit: {exp.limit}</div>
                  </div>
                  <span style={st.badge(exp.color)}>{exp.risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Effects */}
        <div style={st.card}>
          <div style={st.cardTitle}><span>🩺</span> Health Effects by Noise Level</div>
          <div style={st.grid3}>
            {[
              { level: "< 50 dB", effects: "No physical harm, may aid concentration and sleep", color: "#22c55e", icon: "😴" },
              { level: "50–70 dB", effects: "Annoyance possible, conversation unaffected, no hearing damage", color: "#eab308", icon: "🗣️" },
              { level: "70–85 dB", effects: "Communication difficulty, stress, cardiovascular effects with chronic exposure", color: "#f97316", icon: "😰" },
              { level: "85–100 dB", effects: "Hearing loss risk after 2+ hours, tinnitus, temporary threshold shift", color: "#ef4444", icon: "👂" },
              { level: "100–120 dB", effects: "Pain threshold, permanent damage within 30 minutes, severe tinnitus", color: "#dc2626", icon: "🚨" },
              { level: "> 120 dB", effects: "Immediate pain, instant hearing damage, eardrum rupture possible", color: "#991b1b", icon: "💀" },
            ].map((fx, i) => (
              <div key={i} style={{ ...st.sourceCard, borderLeft: `4px solid ${fx.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>{fx.icon}</span>
                  <span style={{ fontWeight: 700, color: fx.color }}>{fx.level}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5 }}>{fx.effects}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGlobal = () => (
    <div>
      <div style={st.card}>
        <div style={st.cardTitle}><span>🌍</span> Global City Noise Comparison</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2d1b4e" }}>
                {["City", "Country", "Avg dB", "Peak dB", "Top Source", "Trend", "Risk Level"].map(h => (
                  <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cities.sort((a, b) => b.avgDb - a.avgDb).map((city, i) => {
                const lvl = DECIBEL_LEVELS.find(l => city.avgDb >= l.min && city.avgDb <= l.max) || DECIBEL_LEVELS[0];
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #2d1b4e20" }}>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#e2e8f0" }}>{city.name}</td>
                    <td style={{ padding: "10px", color: "#94a3b8" }}>{city.country}</td>
                    <td style={{ padding: "10px" }}><span style={st.badge(lvl.color)}>{city.avgDb} dB</span></td>
                    <td style={{ padding: "10px", color: "#ef4444" }}>{city.peakDb} dB</td>
                    <td style={{ padding: "10px", color: "#94a3b8" }}>{city.topSource}</td>
                    <td style={{ padding: "10px", color: city.trend === "up" ? "#ef4444" : city.trend === "down" ? "#22c55e" : "#94a3b8" }}>
                      {city.trend === "up" ? "▲ Worsening" : city.trend === "down" ? "▼ Improving" : "● Stable"}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span style={st.badge(city.avgDb > 80 ? "#ef4444" : city.avgDb > 70 ? "#eab308" : "#22c55e")}>
                        {city.avgDb > 80 ? "High" : city.avgDb > 70 ? "Moderate" : "Low"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* City bar chart */}
      <div style={st.card}>
        <div style={st.cardTitle}><span>📊</span> Average Noise Levels</div>
        {cities.sort((a, b) => b.avgDb - a.avgDb).map((city, i) => {
          const lvl = DECIBEL_LEVELS.find(l => city.avgDb >= l.min && city.avgDb <= l.max) || DECIBEL_LEVELS[0];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ width: "80px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "right" }}>{city.name}</span>
              <div style={{ flex: 1, height: "20px", borderRadius: "10px", background: "#2d1b4e30", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(city.avgDb / 130) * 100}%`, borderRadius: "10px", background: `${lvl.color}70` }} />
                <span style={{ position: "absolute", right: "8px", top: "2px", fontSize: "0.75rem", fontWeight: 700, color: lvl.color }}>{city.avgDb} dB</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderInsights = () => {
    const insights = [
      { icon: "🔊", title: "Chronic Exposure Alert", color: "#ef4444", body: `At ${currentDb} dB (current), hearing damage begins after ${currentDb > 100 ? "15 minutes" : currentDb > 85 ? "2 hours" : currentDb > 70 ? "8 hours" : "no significant risk"}. ${exposureHours > 2 ? `You've experienced ${exposureHours} hours above 85 dB in the last 24h — well above safe daily limits.` : "Daily exposure is within safe limits for most hearing health standards."}` },
      { icon: "🚗", title: "Primary Noise Contributor", color: "#f97316", body: `Traffic noise is the dominant environmental noise source, contributing an average of 78–92 dB. WHO recommends ≤53 dB for roads to avoid health effects. Current urban levels typically exceed this by 20–40 dB, causing annoyance, sleep disturbance, and cardiovascular risk.` },
      { icon: "🌙", title: "Sleep Impact Assessment", color: "#8b55f7", body: `Nighttime noise above 45 dB disturbs sleep for 10% of people; above 55 dB disturbs 25%. The WHO recommends ≤40 dB indoors for bedrooms. ${avgDb > 55 ? "Current average levels significantly exceed sleep-friendly thresholds." : "Current nighttime levels are within acceptable ranges."}` },
      { icon: "📊", title: "Cumulative Noise Dose", color: "#06b6d4", body: `Your estimated 8-hour equivalent continuous sound level (Leq) is ${leq8h} dB. OSHA allows ${leq8h > 90 ? "⚠️ 8 hours at this level — maximum safe exposure" : leq8h > 85 ? "a maximum of 8 hours — you're near the limit" : "up to 8 hours at this level — currently safe"}. The NIOSH recommended limit is 85 dB for 8 hours.` },
      { icon: "🏗️", title: "Construction Noise Window", color: "#eab308", body: "Most municipalities restrict construction noise to 7 AM–7 PM on weekdays. Weekend restrictions vary. Noise from construction (85–115 dB) causes temporary hearing shift and chronic annoyance. Ear protection recommended for anyone within 50 meters." },
      { icon: "💡", title: "Personal Protection", color: "#22c55e", body: currentDb > 85 ? "Consider wearing hearing protection. Ear plugs (NRR 20-33) or earmuffs (NRR 22-31) can reduce effective exposure to safe levels. Avoid headphones at high volume in noisy environments." : "Current levels don't require hearing protection for most people. However, if you're in a noisy area for extended periods, consider bringing ear plugs as a precaution." },
    ];

    return (
      <div>
        <div style={st.card}>
          <div style={st.cardTitle}><span>💡</span> AI-Powered Noise Analysis</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ ...st.sourceCard, borderLeft: `4px solid ${ins.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontWeight: 600 }}>
                <span>{ins.icon}</span>
                <span style={{ color: ins.color }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>{ins.body}</div>
            </div>
          ))}
        </div>

        {/* Reduction Tips */}
        <div style={st.card}>
          <div style={st.cardTitle}><span>🛡️</span> Noise Reduction Strategies</div>
          <div style={st.grid3}>
            {[
              { title: "Sound Barriers", icon: "🧱", desc: "Physical barriers (walls, berms, vegetation) can reduce traffic noise by 5-15 dB.", impact: "High", color: "#22c55e" },
              { title: "Quiet Pavement", icon: "🛣️", desc: "Rubberized asphalt and open-graded friction courses reduce tire-road noise by 3-5 dB.", impact: "Medium", color: "#eab308" },
              { title: "Building Insulation", icon: "🏠", desc: "Double/triple glazing windows reduce indoor noise by 25-40 dB. Mass-loaded vinyl walls add 10-20 dB.", impact: "High", color: "#22c55e" },
              { title: "Traffic Calming", icon: "🚦", desc: "Speed reduction, roundabouts, and traffic divertors reduce community noise exposure.", impact: "Medium", color: "#eab308" },
              { title: "Ear Protection", icon: "🎧", desc: "Foam plugs (NRR 20-33), custom molds, active noise cancellation headphones.", impact: "Immediate", color: "#06b6d4" },
              { title: "Urban Planning", icon: "📐", desc: "Zoning separation, green corridors, and mixed-use planning minimize noise conflict.", impact: "Long-term", color: "#8b5cf6" },
            ].map((tip, i) => (
              <div key={i} style={{ ...st.sourceCard, borderLeft: `4px solid ${tip.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{tip.icon}</span>
                  <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{tip.title}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "8px" }}>{tip.desc}</div>
                <span style={st.badge(tip.color)}>Impact: {tip.impact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={st.container}>
      <div style={st.header}>
        <h1 style={st.title}>🔊 Noise Pollution Tracker</h1>
        <p style={st.subtitle}>Real-time decibel monitoring, hearing risk assessment, and urban noise mapping</p>
      </div>

      <div style={st.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={st.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "heatmap" && renderHeatmap()}
      {activeTab === "sources" && renderSources()}
      {activeTab === "zones" && renderZones()}
      {activeTab === "health" && renderHealth()}
      {activeTab === "global" && renderGlobal()}
      {activeTab === "insights" && renderInsights()}

      <div style={{ textAlign: "center", padding: "24px 0", color: "#2d1b4e", fontSize: "0.75rem" }}>
        🔊 Noise Pollution Tracker · WHO & OSHA Standards · Updated hourly
      </div>
    </div>
  );
}
