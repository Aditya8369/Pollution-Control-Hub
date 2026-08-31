import React, { useState, useMemo } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────
const BORTLE_SCALE = [
  { class: 1, label: "Excellent Dark Sky", mag: 22.0, skyBrg: 21.6, stars: "∞", color: "#0a0a2e", textColor: "#fff", desc: "Zodiacal light, gegenschein visible. Milky Way casts obvious shadow.", naked: "7,600+", binocular: "15,000+", scope: "Unlimited", sites: "Truly pristine dark sites" },
  { class: 2, label: "Typical Dark Sky", mag: 21.5, skyBrg: 20.5, stars: "~5,000", color: "#0d1140", textColor: "#ddd", desc: "Light domes on horizon, Milky Way still impressive. Airglow visible.", naked: "4,000–5,500", binocular: "10,000+", scope: "Excellent", sites: "Desert, remote ocean areas" },
  { class: 3, label: "Rural Sky", mag: 21.0, skyBrg: 19.5, stars: "3,400", color: "#1a1a50", textColor: "#ccc", desc: "Some light domes, Milky Way washed out near horizon. M33 visible naked eye.", naked: "2,500–3,000", binocular: "8,000+", scope: "Very good", sites: "Small towns, agricultural areas" },
  { class: 4, label: "Rural/Suburban", mag: 20.5, skyBrg: 18.5, stars: "2,000", color: "#252560", textColor: "#bbb", desc: "Light domes several directions, Milky Way barely visible overhead.", naked: "1,500–2,500", binocular: "6,000+", scope: "Good", sites: "Suburban-rural fringe" },
  { class: 5, label: "Suburban Sky", mag: 20.0, skyBrg: 17.5, stars: "1,000", color: "#353570", textColor: "#aaa", desc: "Light domes in many directions, Milky Way only visible overhead.", naked: "700–1,500", binocular: "4,000+", scope: "Moderate", sites: "Inner suburbs" },
  { class: 6, label: "Bright Suburban", mag: 19.5, skyBrg: 16.5, stars: "500", color: "#454580", textColor: "#999", desc: "Sky washed out, Milky Way invisible. Only bright clusters & double stars.", naked: "300–700", binocular: "2,000+", scope: "Moderate", sites: "Outer cities" },
  { class: 7, label: "Suburban/Urban", mag: 19.0, skyBrg: 15.5, stars: "200", color: "#555590", textColor: "#888", desc: "Entire sky grayish-white. Zodiacal light impossible.", naked: "100–300", binocular: "1,000+", scope: "Poor", sites: "City suburbs" },
  { class: 8, label: "City Sky", mag: 18.0, skyBrg: 14.5, stars: "50", color: "#666695", textColor: "#777", desc: "Sky bright orange/white. Only planets, bright stars, and a few clusters.", naked: "25–50", binocular: "500+", scope: "Poor", sites: "City centers" },
  { class: 9, label: "Inner City Sky", mag: 17.0, skyBrg: 13.0, stars: "< 10", color: "#777799", textColor: "#666", desc: "Sky brilliantly lit. Only Sun, Moon, planets, and a few brightest stars.", naked: "< 20", binocular: "100+", scope: "Terrible", sites: "Downtown cores" },
];

const SKY_OBJECTS = [
  { name: "Andromeda Galaxy (M31)", type: "galaxy", mag: 3.4, bortleRequired: 6, size: "3°×1°", bestMonth: "Oct–Nov" },
  { name: "Orion Nebula (M42)", type: "nebula", mag: 4.0, bortleRequired: 6, size: "65'×60'", bestMonth: "Dec–Feb" },
  { name: "Pleiades (M45)", type: "cluster", mag: 1.6, bortleRequired: 7, size: "110'", bestMonth: "Oct–Mar" },
  { name: "Milky Way Core", type: "band", mag: -1.0, bortleRequired: 4, size: "Full sky", bestMonth: "Jun–Aug" },
  { name: "Zodiacal Light", type: "phenomenon", mag: -2.0, bortleRequired: 2, size: "30°+", bestMonth: "Sep–Oct" },
  { name: "Beehive Cluster (M44)", type: "cluster", mag: 3.1, bortleRequired: 7, size: "95'", bestMonth: "Jan–May" },
  { name: "Hercules Cluster (M13)", type: "cluster", mag: 5.8, bortleRequired: 5, size: "20'", bestMonth: "May–Aug" },
  { name: "Ring Nebula (M57)", type: "nebula", mag: 8.8, bortleRequired: 5, size: "2.5'", bestMonth: "Jun–Sep" },
  { name: "Whirlpool Galaxy (M51)", type: "galaxy", mag: 8.4, bortleRequired: 4, size: "11'×7'", bestMonth: "Apr–Jul" },
  { name: "Double Cluster (NGC 869/884)", type: "cluster", mag: 3.7, bortleRequired: 6, size: "30'", bestMonth: "Sep–Jan" },
  { name: "Omega Centauri (NGC 5139)", type: "cluster", mag: 3.9, bortleRequired: 5, size: "36'", bestMonth: "Mar–Jul" },
  { name: "Triangulum Galaxy (M33)", type: "galaxy", mag: 5.7, bortleRequired: 3, size: "73'×45'", bestMonth: "Oct–Dec" },
  { name: "Andromeda (M33) Alternative", type: "galaxy", mag: 5.7, bortleRequired: 4, size: "73'×45'", bestMonth: "Oct–Dec" },
  { name: "Veil Nebula", type: "nebula", mag: 7.0, bortleRequired: 4, size: "200'", bestMonth: "Jun–Sep" },
  { name: "Crab Nebula (M1)", type: "nebula", mag: 8.4, bortleRequired: 5, size: "7'×5'", bestMonth: "Nov–Feb" },
];

const LIGHT_TYPES = [
  { id: "led", name: "LED White", color: "#8ec5fc", spectrum: "440nm peak", colorTemp: "4000K", efficiency: 100, blueLight: "High", wildlife: "High impact", icon: "💡" },
  { id: "hps", name: "High-Pressure Sodium", color: "#f5a623", spectrum: "590nm peak", colorTemp: "2100K", efficiency: 80, blueLight: "Low", wildlife: "Low impact", icon: "🏮" },
  { id: "lps", name: "Low-Pressure Sodium", color: "#ffdd00", spectrum: "589nm", colorTemp: "1800K", efficiency: 70, blueLight: "Minimal", wildlife: "Minimal impact", icon: "🟡" },
  { id: "mh", name: "Metal Halide", color: "#d4e4ff", spectrum: "Broad", colorTemp: "4500K", efficiency: 65, blueLight: "Moderate", wildlife: "Moderate impact", icon: "⚪" },
  { id: "mercury", name: "Mercury Vapor", color: "#c8e6ff", spectrum: "405nm peak", colorTemp: "5900K", efficiency: 55, blueLight: "High", wildlife: "High impact", icon: "🔵" },
  { id: "warm", name: "Warm LED (<2700K)", color: "#ffd080", spectrum: "Reduced blue", colorTemp: "2700K", efficiency: 90, blueLight: "Low", wildlife: "Low impact", icon: "🟠" },
  { id: "amber", name: "Amber LED", color: "#ff9500", spectrum: "590nm", colorTemp: "1800K", efficiency: 75, blueLight: "None", wildlife: "Minimal impact", icon: "🟤" },
];

const DARK_SKY_SITES = [
  { name: "Atacama Desert", country: "Chile", bortle: 1, lat: -24.5, lon: -69.5, elevation: 2400, type: "Desert" },
  { name: "NamibRand Reserve", country: "Namibia", bortle: 1, lat: -25.0, lon: 15.9, elevation: 1800, type: "Desert" },
  { name: "Aoraki Mackenzie", country: "New Zealand", bortle: 2, lat: -44.0, lon: 170.1, elevation: 700, type: "Mountains" },
  { name: "Jasper National Park", country: "Canada", bortle: 2, lat: 52.8, lon: -117.9, elevation: 1200, type: "Mountains" },
  { name: "Canary Islands", country: "Spain", bortle: 2, lat: 28.3, lon: -16.6, elevation: 2400, type: "Island" },
  { name: "Big Bend National Park", country: "USA", bortle: 2, lat: 29.3, lon: -103.3, elevation: 1500, type: "Desert" },
  { name: "NamibRand (IDA)", country: "Namibia", bortle: 1, lat: -25.0, lon: 15.9, elevation: 1800, type: "Desert" },
  { name: "Cherry Springs State Park", country: "USA", bortle: 2, lat: 41.7, lon: -77.8, elevation: 700, type: "Forest" },
  { name: "Exmoor National Park", country: "UK", bortle: 3, lat: 51.2, lon: -3.6, elevation: 400, type: "Coastal" },
  { name: "Ka Lānaʻi", country: "USA", bortle: 1, lat: 20.8, lon: -156.9, elevation: 1600, type: "Island" },
  { name: "Tenerife", country: "Spain", bortle: 2, lat: 28.3, lon: -16.5, elevation: 2200, type: "Island" },
  { name: "Bon Accord", country: "Scotland", bortle: 2, lat: 57.1, lon: -2.5, elevation: 300, type: "Rural" },
];

const ECOSYSTEM_EFFECTS = [
  { species: "Sea Turtles", icon: "🐢", effect: "Hatchlings disoriented by coastal lighting, moving toward artificial light instead of ocean", severity: "Critical", color: "#ef4444" },
  { species: "Migratory Birds", icon: "🐦", effect: "Attraction to lit buildings causes collisions — ~600M birds/year in US alone", severity: "High", color: "#f97316" },
  { species: "Insects", icon: "🦋", effect: "Fatal attraction to lights disrupts pollination, food webs. Billions killed annually", severity: "Critical", color: "#ef4444" },
  { species: "Bats", icon: "🦇", effect: "Some species avoid lit areas (reduced foraging), others are attracted (increased predation)", severity: "High", color: "#f97316" },
  { species: "Coral Reefs", icon: "🪸", effect: "Artificial light disrupts coral spawning cycles and larval navigation", severity: "Moderate", color: "#eab308" },
  { species: "Trees/Plants", icon: "🌳", effect: "Extended light exposure disrupts seasonal cycles, delays autumn leaf drop, affects growth", severity: "Low", color: "#22c55e" },
  { species: "Amphibians", icon: "🐸", effect: "Light suppresses melatonin, disrupting breeding behavior and migration patterns", severity: "High", color: "#f97316" },
  { species: "Humans", icon: "👤", effect: "Blue-enriched light suppresses melatonin, disrupting sleep, linked to cancer risk", severity: "Moderate", color: "#eab308" },
];

// ─── Styles ─────────────────────────────────────────────────────────────────
const L = {
  container: { padding: "20px", fontFamily: "'Inter', -apple-system, sans-serif", background: "linear-gradient(180deg, #000010 0%, #050520 30%, #0a0a30 60%, #101040 100%)", color: "#e2e8f0", minHeight: "100vh" },
  header: { textAlign: "center", marginBottom: "32px", position: "relative" },
  title: { fontSize: "2.2rem", fontWeight: 800, background: "linear-gradient(135deg, #c084fc, #818cf8, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" },
  subtitle: { color: "#94a3b8", fontSize: "1rem" },
  tabs: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" },
  tab: (active) => ({ padding: "10px 20px", borderRadius: "12px", border: active ? "2px solid #818cf8" : "2px solid #1e1b4b", background: active ? "rgba(129,140,248,0.15)" : "#0a0a30", color: active ? "#818cf8" : "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.3s" }),
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" },
  kpi: { background: "rgba(10,10,48,0.8)", borderRadius: "16px", padding: "20px", border: "1px solid #1e1b4b", textAlign: "center" },
  kpiVal: (c) => ({ fontSize: "2rem", fontWeight: 800, color: c || "#818cf8" }),
  kpiLabel: { color: "#64748b", fontSize: "0.8rem", marginTop: "4px" },
  card: { background: "rgba(10,10,48,0.8)", borderRadius: "16px", padding: "24px", border: "1px solid #1e1b4b", marginBottom: "20px" },
  cardTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, background: `${color}25`, color, border: `1px solid ${color}40` }),
  progressTrack: { width: "100%", height: "6px", borderRadius: "3px", background: "#1e1b4b", marginTop: "6px" },
  progressFill: (pct, color) => ({ height: "100%", width: `${pct}%`, borderRadius: "3px", background: color, transition: "width 0.5s" }),
  toggleRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  toggle: (active) => ({ padding: "6px 14px", borderRadius: "20px", border: active ? "2px solid #818cf8" : "1px solid #1e1b4b", background: active ? "rgba(129,140,248,0.15)" : "transparent", color: active ? "#818cf8" : "#64748b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }),
  bortleRow: (active, color) => ({ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", background: active ? `${color}20` : "rgba(5,5,32,0.6)", border: `1px solid ${active ? color : "#1e1b4b"}`, cursor: "pointer", transition: "all 0.3s", marginBottom: "8px" }),
  siteCard: { padding: "16px", borderRadius: "12px", background: "rgba(5,5,32,0.6)", border: "1px solid #1e1b4b", marginBottom: "12px" },
  svgContainer: { width: "100%", overflow: "visible" },
  insightCard: { padding: "16px", borderRadius: "12px", background: "rgba(5,5,32,0.6)", border: "1px solid #1e1b4b", marginBottom: "12px" },
};

function Sparkline({ data, color = "#818cf8", width = 120, height = 36 }) {
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

function StarField({ count = 50, width = 400, height = 200 }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.7,
    })),
    [count, width, height]
  );
  return (
    <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
      {stars.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity * 0.6} />
      ))}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LightPollutionObservatory() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBortle, setSelectedBortle] = useState(5);
  const [selectedLightType, setSelectedLightType] = useState("led");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  const bortle = BORTLE_SCALE[selectedBortle - 1];
  const lightType = LIGHT_TYPES.find(l => l.id === selectedLightType);
  const visibleObjects = SKY_OBJECTS.filter(o => selectedBortle <= o.bortleRequired);

  const tabs = [
    { id: "overview", label: "🌟 Overview" },
    { id: "bortle", label: "📏 Bortle Scale" },
    { id: "objects", label: "🔭 Sky Objects" },
    { id: "lights", label: "💡 Light Types" },
    { id: "ecology", label: "🐢 Ecology" },
    { id: "sites", label: "🗺️ Dark Sites" },
    { id: "insights", label: "💡 Insights" },
  ];

  const renderOverview = () => (
    <div>
      <div style={{ ...L.alertBanner(selectedBortle), display: "flex", alignItems: "center", gap: "12px", padding: "16px 24px", borderRadius: "12px", marginBottom: "16px", fontWeight: 600, background: `${bortle.color}30`, borderLeft: `4px solid ${selectedBortle <= 3 ? "#22c55e" : selectedBortle <= 6 ? "#eab308" : "#ef4444"}` }}>
        <span style={{ fontSize: "1.5rem" }}>🔭</span>
        <div>
          <div>Your Sky: <strong style={{ color: bortle.color }}>Bortle Class {selectedBortle} — {bortle.label}</strong></div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{bortle.desc}</div>
        </div>
      </div>

      <div style={L.kpiRow}>
        <div style={L.kpi}>
          <div style={{ fontSize: "1.3rem" }}>⭐</div>
          <div style={L.kpiVal("#c084fc")}>{bortle.stars}</div>
          <div style={L.kpiLabel}>Visible Stars (naked eye)</div>
        </div>
        <div style={L.kpi}>
          <div style={{ fontSize: "1.3rem" }}>📏</div>
          <div style={L.kpiVal("#818cf8")}>{bortle.skyBrg}</div>
          <div style={L.kpiLabel}>Sky Brightness (mag/arcsec²)</div>
        </div>
        <div style={L.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🔭</div>
          <div style={L.kpiVal("#38bdf8")}>{visibleObjects.length}</div>
          <div style={L.kpiLabel}>Visible Objects</div>
          <Sparkline data={BORTLE_SCALE.map(b => b.stars === "< 10" ? 10 : parseInt(b.stars.replace(",", "").replace("~", "").replace("+", "")))} color="#818cf8" />
        </div>
        <div style={L.kpi}>
          <div style={{ fontSize: "1.3rem" }}>📊</div>
          <div style={L.kpiVal(bortle.mag)}>{bortle.mag}</div>
          <div style={L.kpiLabel}>Limiting Magnitude</div>
        </div>
        <div style={L.kpi}>
          <div style={{ fontSize: "1.3rem" }}>🌑</div>
          <div style={L.kpiVal(selectedBortle <= 3 ? "#22c55e" : selectedBortle <= 6 ? "#eab308" : "#ef4444")}>
            {selectedBortle <= 3 ? "Excellent" : selectedBortle <= 5 ? "Good" : selectedBortle <= 7 ? "Poor" : "Terrible"}
          </div>
          <div style={L.kpiLabel}>Observing Quality</div>
        </div>
      </div>

      {/* Sky visualization */}
      <div style={{ ...L.card, position: "relative", overflow: "hidden", background: `linear-gradient(180deg, ${bortle.color} 0%, ${bortle.color}cc 100%)` }}>
        <StarField count={selectedBortle <= 2 ? 200 : selectedBortle <= 4 ? 80 : selectedBortle <= 6 ? 30 : 8} width={800} height={250} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>
            {selectedBortle <= 2 ? "🌌" : selectedBortle <= 4 ? "✨" : selectedBortle <= 6 ? "🌤️" : "🌆"}
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: bortle.textColor }}>
            Bortle {selectedBortle}: {bortle.label}
          </div>
          <div style={{ fontSize: "0.85rem", color: bortle.textColor, opacity: 0.7, marginTop: "4px" }}>
            {bortle.sites}
          </div>
          <div style={{ display: "flex", gap: "24px", justifyContent: "center", marginTop: "16px", color: bortle.textColor, fontSize: "0.8rem" }}>
            <span>⭐ {bortle.stars} stars</span>
            <span>🔭 {bortle.naked} naked eye</span>
            <span>📊 mag {bortle.mag}</span>
          </div>
        </div>
        {/* Light dome at bottom for higher Bortle */}
        {selectedBortle >= 4 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: `${(selectedBortle - 3) * 12}%`,
            background: `linear-gradient(180deg, transparent, rgba(255,150,50,${(selectedBortle - 3) * 0.08})`,
          }} />
        )}
      </div>

      {/* Star count chart */}
      <div style={L.card}>
        <div style={L.cardTitle}><span>📊</span> Stars Visible by Bortle Class</div>
        <svg viewBox="0 0 800 200" style={{ width: "100%", height: "220px" }}>
          {BORTLE_SCALE.map((b, i) => {
            const starCount = b.stars === "< 10" ? 10 : parseInt(b.stars.replace(",", "").replace("~", "").replace("+", ""));
            const maxStars = 7600;
            const barWidth = (starCount / maxStars) * 700;
            const isActive = i + 1 === selectedBortle;
            return (
              <g key={i} onClick={() => setSelectedBortle(i + 1)} style={{ cursor: "pointer" }}>
                <rect x={50} y={i * 22 + 2} width={barWidth} height="18" rx="4" fill={b.color} opacity={isActive ? 1 : 0.5} stroke={isActive ? "#818cf8" : "none"} strokeWidth={isActive ? 2 : 0} />
                <text x={45} y={i * 22 + 14} fill="#94a3b8" fontSize="9" textAnchor="end" dominantBaseline="middle">B{b.class}</text>
                <text x={barWidth + 55} y={i * 22 + 14} fill={b.textColor} fontSize="9" dominantBaseline="middle">{b.stars}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );

  const renderBortle = () => (
    <div>
      {BORTLE_SCALE.map(b => (
        <div key={b.class} style={L.bortleRow(selectedBortle === b.class, b.color)} onClick={() => setSelectedBortle(b.class)}>
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: b.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 800, color: b.textColor, border: selectedBortle === b.class ? "3px solid #818cf8" : "none" }}>
            {b.class}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: selectedBortle === b.class ? b.color : "#e2e8f0", fontSize: "0.95rem" }}>
              Class {b.class}: {b.label}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>{b.desc}</div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Sky Mag</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: b.color }}>{b.skyBrg}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Limiting</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: b.color }}>{b.mag}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Stars</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: b.color }}>{b.stars}</div>
            </div>
            {selectedBortle === b.class && <span style={L.badge("#818cf8")}>Selected</span>}
          </div>
        </div>
      ))}

      {/* Bortle Comparison */}
      <div style={L.card}>
        <div style={L.cardTitle}><span>📊</span> Viewing Capability by Bortle Class</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1e1b4b" }}>
                {["Class", "Naked Eye", "Binocular", "Telescope", "Sites"].map(h => (
                  <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BORTLE_SCALE.map(b => (
                <tr key={b.class} style={{ borderBottom: "1px solid #1e1b4b20", background: selectedBortle === b.class ? `${b.color}15` : undefined }}>
                  <td style={{ padding: "8px" }}><span style={L.badge(b.color)}>B{b.class}</span></td>
                  <td style={{ padding: "8px", color: "#e2e8f0" }}>{b.naked}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{b.binocular}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{b.scope}</td>
                  <td style={{ padding: "8px", color: "#64748b" }}>{b.sites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderObjects = () => (
    <div>
      <div style={L.card}>
        <div style={L.cardTitle}><span>🔭</span> Sky Object Visibility Calculator</div>
        <div style={{ marginBottom: "16px", fontSize: "0.85rem", color: "#94a3b8" }}>
          At Bortle {selectedBortle}, you can see <strong style={{ color: "#818cf8" }}>{visibleObjects.length}</strong> of {SKY_OBJECTS.length} deep-sky objects
        </div>
        <div style={L.toggleRow}>
          {["all", "galaxy", "nebula", "cluster", "phenomenon"].map(type => {
            const count = visibleObjects.filter(o => type === "all" || o.type === type).length;
            return (
              <button key={type} style={L.toggle(selectedObject === type)}
                onClick={() => setSelectedObject(selectedObject === type ? null : type)}>
                {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}s ({count})
              </button>
            );
          })}
        </div>
        {SKY_OBJECTS
          .filter(o => !selectedObject || selectedObject === "all" || o.type === selectedObject)
          .map((obj, i) => {
            const visible = selectedBortle <= obj.bortleRequired;
            return (
              <div key={i} style={{ ...L.siteCard, opacity: visible ? 1 : 0.4, borderLeft: `4px solid ${visible ? "#818cf8" : "#ef4444"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "1.3rem" }}>{obj.type === "galaxy" ? "🌀" : obj.type === "nebula" ? "☁️" : obj.type === "cluster" ? "⭐" : "✨"}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: visible ? "#e2e8f0" : "#64748b" }}>{obj.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{obj.type} · mag {obj.mag} · {obj.size} · Best: {obj.bestMonth}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={L.badge(visible ? "#22c55e" : "#ef4444")}>{visible ? "✅ Visible" : `❌ Need B${obj.bortleRequired}`}</span>
                    <span style={L.badge("#818cf8")}>Bortle ≤ {obj.bortleRequired}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const renderLights = () => (
    <div>
      <div style={L.card}>
        <div style={L.cardTitle}><span>💡</span> Light Source Comparison</div>
        <div style={L.toggleRow}>
          {LIGHT_TYPES.map(lt => (
            <button key={lt.id} style={L.toggle(selectedLightType === lt.id)}
              onClick={() => setSelectedLightType(lt.id)}>
              {lt.icon} {lt.name}
            </button>
          ))}
        </div>

        <div style={L.grid2}>
          <div>
            {LIGHT_TYPES.map(lt => (
              <div key={lt.id} style={{ ...L.siteCard, borderLeft: `4px solid ${lt.color}`, cursor: "pointer", background: selectedLightType === lt.id ? `${lt.color}15` : undefined }}
                onClick={() => setSelectedLightType(lt.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{lt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: lt.color }}>{lt.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{lt.spectrum} · {lt.colorTemp} · Efficiency: {lt.efficiency}%</div>
                  </div>
                  <span style={L.badge(lt.color)}>{lt.efficiency}%</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            {/* Selected light detail */}
            <div style={{ ...L.card, borderLeft: `4px solid ${lightType.color}` }}>
              <div style={L.cardTitle}><span>{lightType.icon}</span> {lightType.name}</div>
              {[
                { label: "Spectrum", value: lightType.spectrum },
                { label: "Color Temperature", value: lightType.colorTemp },
                { label: "Efficiency", value: `${lightType.efficiency}%` },
                { label: "Blue Light Emission", value: lightType.blueLight },
                { label: "Wildlife Impact", value: lightType.wildlife },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1b4b20" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.85rem" }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Blue light comparison chart */}
            <div style={L.card}>
              <div style={L.cardTitle}><span>🔵</span> Blue Light Emission</div>
              {LIGHT_TYPES.map(lt => {
                const bluePct = lt.blueLight === "None" ? 0 : lt.blueLight === "Minimal" ? 10 : lt.blueLight === "Low" ? 25 : lt.blueLight === "Moderate" ? 50 : lt.blueLight === "High" ? 80 : 95;
                return (
                  <div key={lt.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ width: "20px", textAlign: "center" }}>{lt.icon}</span>
                    <span style={{ width: "120px", fontSize: "0.7rem", color: "#94a3b8" }}>{lt.name.split(" ").slice(0, 2).join(" ")}</span>
                    <div style={{ flex: 1, height: "12px", borderRadius: "6px", background: "#1e1b4b" }}>
                      <div style={{ height: "100%", width: `${bluePct}%`, borderRadius: "6px", background: bluePct > 60 ? "#3b82f6" : bluePct > 30 ? "#60a5fa" : "#93c5fd", transition: "width 0.5s" }} />
                    </div>
                    <span style={{ width: "60px", fontSize: "0.7rem", color: "#94a3b8", textAlign: "right" }}>{lt.blueLight}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEcology = () => (
    <div>
      <div style={L.card}>
        <div style={L.cardTitle}><span>🐢</span> Ecological Impact of Light Pollution</div>
        {ECOSYSTEM_EFFECTS.map((eco, i) => (
          <div key={i} style={{ ...L.insightCard, borderLeft: `4px solid ${eco.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>{eco.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{eco.species}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginTop: "4px" }}>{eco.effect}</div>
              </div>
              <span style={L.badge(eco.color)}>{eco.severity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Human Health */}
      <div style={L.card}>
        <div style={L.cardTitle}><span>🏥</span> Human Health Effects</div>
        <div style={L.grid3}>
          {[
            { title: "Sleep Disruption", icon: "😴", desc: "Blue-enriched light suppresses melatonin production by up to 50%, delaying sleep onset and reducing sleep quality.", severity: "High", color: "#ef4444" },
            { title: "Cancer Risk", icon: "⚠️", desc: "Studies show 30-50% higher breast/prostate cancer rates in populations exposed to high outdoor light at night.", severity: "High", color: "#ef4444" },
            { title: "Circadian Rhythm", icon: "🕐", desc: "Artificial light at night disrupts the body's internal clock, affecting metabolism, mood, and immune function.", severity: "Moderate", color: "#eab308" },
            { title: "Mental Health", icon: "🧠", desc: "Light pollution correlates with increased rates of depression, anxiety, and seasonal affective disorder.", severity: "Moderate", color: "#eab308" },
            { title: "Vision Health", icon: "👁️", desc: "Excessive blue light exposure may contribute to digital eye strain and age-related macular degeneration.", severity: "Low", color: "#22c55e" },
            { title: "Energy & Economics", icon: "💰", desc: "US alone wastes $3.3B/year on unshielded outdoor lighting. Upward-directed light provides zero utility.", severity: "Economic", color: "#818cf8" },
          ].map((item, i) => (
            <div key={i} style={{ ...L.siteCard, borderLeft: `4px solid ${item.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.9rem" }}>{item.title}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "8px" }}>{item.desc}</div>
              <span style={L.badge(item.color)}>Impact: {item.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSites = () => (
    <div>
      <div style={L.card}>
        <div style={L.cardTitle}><span>🗺️</span> World's Best Dark Sky Sites</div>
        <div style={L.grid3}>
          {DARK_SKY_SITES.map((site, i) => {
            const b = BORTLE_SCALE[site.bortle - 1];
            return (
              <div key={i} style={{ ...L.siteCard, cursor: "pointer", borderColor: selectedSite === i ? b.color : "#1e1b4b", background: selectedSite === i ? `${b.color}15` : undefined }}
                onClick={() => setSelectedSite(selectedSite === i ? null : i)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{site.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{site.country} · {site.type}</div>
                  </div>
                  <span style={L.badge(b.color)}>Bortle {site.bortle}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", color: "#94a3b8" }}>
                  <span>📍 {site.lat}°, {site.lon}°</span>
                  <span>⛰️ {site.elevation}m</span>
                </div>
                {/* Sky quality bar */}
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginBottom: "4px" }}>
                    <span>Darkness Quality</span>
                    <span>{Math.round((1 - site.bortle / 9) * 100)}%</span>
                  </div>
                  <div style={L.progressTrack}>
                    <div style={L.progressFill((1 - site.bortle / 9) * 100, b.color)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dark Sky Map */}
      <div style={L.card}>
        <div style={L.cardTitle}><span>🌐</span> Dark Sky Distribution</div>
        <svg viewBox="0 0 800 400" style={{ width: "100%", height: "400px" }}>
          {/* Simplified world map outline */}
          <rect x="0" y="0" width="800" height="400" rx="12" fill="#050520" />
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={`h${i}`} x1={0} y1={i * 100} x2={800} y2={i * 100} stroke="#1e1b4b" strokeWidth="0.5" />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={400} stroke="#1e1b4b" strokeWidth="0.5" />
          ))}
          {/* City labels for context */}
          {[
            { name: "New York", x: 200, y: 160 },
            { name: "London", x: 390, y: 140 },
            { name: "Tokyo", x: 710, y: 170 },
            { name: "Sydney", x: 720, y: 320 },
            { name: "Cairo", x: 445, y: 200 },
          ].map((city, i) => (
            <g key={i}>
              <circle cx={city.x} cy={city.y} r="4" fill="#ef4444" opacity="0.6" />
              <text x={city.x + 8} y={city.y + 3} fill="#ef4444" fontSize="8" opacity="0.7">{city.name}</text>
            </g>
          ))}
          {/* Dark sky sites */}
          {DARK_SKY_SITES.map((site, i) => {
            const x = ((site.lon + 180) / 360) * 800;
            const y = ((90 - site.lat) / 180) * 400;
            const b = BORTLE_SCALE[site.bortle - 1];
            return (
              <g key={i} onClick={() => setSelectedSite(i)} style={{ cursor: "pointer" }}>
                <circle cx={x} cy={y} r="10" fill={b.color} opacity="0.5" stroke={b.color} strokeWidth="1" />
                <circle cx={x} cy={y} r="4" fill={b.color} />
                <text x={x + 12} y={y + 3} fill={b.textColor} fontSize="8" fontWeight="600">{site.name.split(" ")[0]}</text>
              </g>
            );
          })}
          <text x={400} y={20} fill="#64748b" fontSize="10" textAnchor="middle">Dark Sky Sites (🟢) vs Light-Polluted Cities (🔴)</text>
        </svg>
      </div>
    </div>
  );

  const renderInsights = () => {
    const insights = [
      { icon: "🌌", title: "The Vanishing Night Sky", color: "#818cf8", body: `Over 80% of the world's population lives under light-polluted skies. A third of humanity can no longer see the Milky Way. The Bortle scale from 1 (pristine) to 9 (inner city) quantifies sky darkness — your current assessment: Class ${selectedBortle}.` },
      { icon: "🔵", title: "The Blue Light Problem", color: "#3b82f6", body: `Modern LED streetlights emit significant blue light (400-500nm) that scatters 4-5x more than longer wavelengths, creating skyglow. Replacing HPS lights with cool-white LEDs (4000K+) can increase skyglow by 50-300%. Warm-white LEDs (<2700K) are far less impactful.` },
      { icon: "💡", title: "The Efficiency Paradox", color: "#eab308", body: `LED efficiency improvements have led to MORE total light output globally (the "rebound effect"), not less. Between 2012-2016, global light pollution increased 2.2% per year despite efficiency gains. Without shielding and dimming, efficiency gains are lost to increased consumption.` },
      { icon: "🌍", title: "Global Light Pollution Growth", color: "#f97316", body: `Light pollution is growing at 2-6% per year globally. Satellite data shows the illuminated area of Earth's surface growing by 2.2% annually. At this rate, Bortle Class 1 skies will be virtually extinct by 2050 without intervention.` },
      { icon: "🐢", title: "Wildlife in Crisis", color: "#22c55e", body: `Light pollution kills an estimated 150 million insects per year in Germany alone. Sea turtle hatchling mortality from coastal lighting may exceed 50% on some beaches. Migratory bird collisions with lit buildings kill approximately 600 million birds annually in the US.` },
      { icon: "🛡️", title: "Solutions Exist", color: "#06b6d4", body: "Dark sky-friendly lighting: full-cutoff fixtures (no upward light), warm-color LEDs (<2700K), dimming/motion sensors, shields and hoods. The IDA certifies dark sky places worldwide. Cities like Tucson, Flagstaff, and Fresno have adopted lighting ordinances with measurable results." },
    ];

    return (
      <div>
        <div style={L.card}>
          <div style={L.cardTitle}><span>💡</span> AI-Powered Light Pollution Analysis</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ ...L.insightCard, borderLeft: `4px solid ${ins.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontWeight: 600 }}>
                <span>{ins.icon}</span>
                <span style={{ color: ins.color }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>{ins.body}</div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div style={L.card}>
          <div style={L.cardTitle}><span>🛡️</span> Dark Sky Protection Strategies</div>
          <div style={L.grid3}>
            {[
              { title: "Shielded Fixtures", icon: "🔦", desc: "Full-cutoff shields direct light downward only. Eliminates upward light that causes skyglow.", impact: "Critical", color: "#22c55e" },
              { title: "Warm Color LEDs", icon: "🟡", desc: "Use <2700K color temperature. Reduces blue light that scatters in atmosphere and disrupts wildlife.", impact: "High", color: "#22c55e" },
              { title: "Dimming & Sensors", icon: "📉", desc: "Motion-activated and dimmable lights provide light only when needed, reducing total exposure.", impact: "High", color: "#22c55e" },
              { title: "Lighting Ordinances", icon: "📋", desc: "Municipal laws regulating fixture type, brightness, curfews, and zoning. Measurable results.", impact: "Critical", color: "#22c55e" },
              { title: "IDA Dark Sky Places", icon: "⭐", desc: "International Dark-Sky Association certification protects areas with exceptional starry skies.", impact: "Ongoing", color: "#818cf8" },
              { title: "Public Awareness", icon: "📢", desc: "Light pollution is 100% reversible — turn off unnecessary lights and advocate for dark-sky policies.", impact: "Immediate", color: "#06b6d4" },
            ].map((tip, i) => (
              <div key={i} style={{ ...L.siteCard, borderLeft: `4px solid ${tip.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{tip.icon}</span>
                  <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{tip.title}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "8px" }}>{tip.desc}</div>
                <span style={L.badge(tip.color)}>Impact: {tip.impact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={L.container}>
      <div style={L.header}>
        <h1 style={L.title}>🌟 Light Pollution Observatory</h1>
        <p style={L.subtitle}>Sky brightness mapping, Bortle scale assessment, dark sky sites, and ecological impact</p>
      </div>

      <div style={L.tabs}>
        {tabs.map(t => (
          <button key={t.id} style={L.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "bortle" && renderBortle()}
      {activeTab === "objects" && renderObjects()}
      {activeTab === "lights" && renderLights()}
      {activeTab === "ecology" && renderEcology()}
      {activeTab === "sites" && renderSites()}
      {activeTab === "insights" && renderInsights()}

      <div style={{ textAlign: "center", padding: "24px 0", color: "#1e1b4b", fontSize: "0.75rem" }}>
        🌟 Light Pollution Observatory · Bortle Scale & IDA Standards · Updated hourly
      </div>
    </div>
  );
}
