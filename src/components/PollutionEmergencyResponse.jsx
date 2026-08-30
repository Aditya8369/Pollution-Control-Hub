import { useState, useMemo, useCallback, useEffect } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const ALERT_LEVELS = [
  { id: "green", label: "Normal", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "✅", threshold: 50 },
  { id: "yellow", label: "Elevated", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "⚠️", threshold: 100 },
  { id: "orange", label: "High", color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: "🔶", threshold: 150 },
  { id: "red", label: "Emergency", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "🛑", threshold: 200 },
  { id: "purple", label: "Critical", color: "#7e0023", bg: "rgba(126,0,35,0.1)", icon: "🚨", threshold: 300 },
];

const EMERGENCY_TYPES = [
  { id: "industrial", label: "Industrial Accident", icon: "🏭", color: "#ef4444", description: "Chemical spill, fire, or industrial emission event" },
  { id: "wildfire", label: "Wildfire Smoke", icon: "🔥", color: "#f97316", description: "Smoke from nearby wildfires affecting air quality" },
  { id: "traffic", label: "Traffic Incident", icon: "🚗", color: "#f59e0b", description: "Major traffic jam or vehicle fire causing emissions spike" },
  { id: "weather", label: "Weather Event", icon: "⛈️", color: "#3b82f6", description: "Temperature inversion or dust storm trapping pollutants" },
  { id: "construction", label: "Construction Dust", icon: "🏗️", color: "#8b5cf6", description: "Major construction project releasing particulate matter" },
  { id: "unknown", label: "Unknown Source", icon: "❓", color: "#6b7280", description: "Pollution spike with unidentified source" },
];

const PROTOCOL_STEPS = [
  { phase: "Detection", icon: "🔍", duration: "0-5 min", description: "Identify the pollution event and its source" },
  { phase: "Assessment", icon: "📊", duration: "5-15 min", description: "Evaluate severity and affected area" },
  { phase: "Notification", icon: "📢", duration: "15-30 min", description: "Alert emergency services and public" },
  { phase: "Response", icon: "🚑", duration: "30-60 min", description: "Deploy emergency measures and resources" },
  { phase: "Monitoring", icon: "📡", duration: "1-24 hrs", description: "Continuous monitoring of air quality" },
  { phase: "Recovery", icon: "🔄", duration: "24-72 hrs", description: "Return to normal conditions and post-incident review" },
];

const AGENCIES = [
  { id: "epa", name: "Environmental Protection Agency", abbr: "EPA", icon: "🏛️", role: "Regulatory oversight and enforcement", phone: "1-800-424-4372" },
  { id: "fire", name: "Fire Department", abbr: "FD", icon: "🚒", role: "Hazardous material response", phone: "911" },
  { id: "health", name: "Public Health Department", abbr: "PHD", icon: "🏥", role: "Health advisories and medical response", phone: "311" },
  { id: "emergency", name: "Emergency Management", abbr: "EMA", icon: "🚨", role: "Coordination and resource allocation", phone: "911" },
  { id: "police", name: "Police Department", abbr: "PD", icon: "👮", role: "Traffic control and evacuation", phone: "911" },
  { id: "ngo", name: "Environmental NGOs", abbr: "NGO", icon: "🌱", role: "Community support and advocacy", phone: "Local" },
];

const CRISIS_CHECKLISTS = {
  industrial: [
    "Identify chemical involved and exposure risks",
    "Establish 1-mile evacuation zone",
    "Activate community notification system",
    "Deploy hazmat teams for containment",
    "Set up air monitoring stations downwind",
    "Coordinate with hospital for potential casualties",
    "Issue shelter-in-place advisory for nearby areas",
    "Media briefing with incident commander",
  ],
  wildfire: [
    "Monitor fire progression and wind patterns",
    "Distribute N95 masks to vulnerable populations",
    "Open community air shelters with filtration",
    "Activate school and workplace closure protocols",
    "Coordinate evacuation routes if needed",
    "Deploy portable air quality monitors",
    "Set up information hotline for residents",
    "Coordinate with forestry service on fire containment",
  ],
  traffic: [
    "Redirect traffic away from incident area",
    "Deploy air monitoring near residential zones",
    "Issue health advisory for nearby neighborhoods",
    "Coordinate with hospital for accident victims",
    "Monitor for secondary hazards (fuel leaks)",
    "Update navigation apps with road closures",
    "Assess need for temporary road closures",
    "Post-incident air quality verification",
  ],
  weather: [
    "Issue weather-related health advisory",
    "Open cooling/warming centers with air filtration",
    "Activate public transit surge capacity",
    "Coordinate with utility companies on power needs",
    "Monitor weather forecast for duration",
    "Deploy mobile air monitoring units",
    "Issue school activity modification orders",
    "Prepare for secondary weather impacts",
  ],
  construction: [
    "Verify construction dust control measures",
    "Issue dust suppression order",
    "Monitor neighboring residential areas",
    "Enforce water spray and covering requirements",
    "Assess work stoppage if needed",
    "Document violations for enforcement",
    "Notify affected residents of mitigation measures",
    "Schedule follow-up air quality monitoring",
  ],
  unknown: [
    "Deploy rapid air quality assessment team",
    "Identify potential pollution sources",
    "Issue precautionary health advisory",
    "Establish monitoring perimeter",
    "Coordinate with utility companies",
    "Canvass area for reports of unusual odors",
    "Engage environmental forensics if needed",
    "Issue public information statement",
  ],
};

const REAL_TIME_ALERTS = [
  { id: 1, time: "12:45 PM", level: "red", title: "PM2.5 Spiking in Industrial Zone", message: "PM2.5 levels reached 185 μg/m³ near Factory Row. Source under investigation.", agency: "EPA", status: "active" },
  { id: 2, time: "12:30 PM", level: "orange", title: "Ozone Advisory Issued", message: "Ground-level ozone exceeds 70 ppb in downtown area. Sensitive groups advised to limit outdoor activity.", agency: "PHD", status: "active" },
  { id: 3, time: "11:15 AM", level: "yellow", title: "Traffic Congestion Alert", message: "Major accident on Highway 101 causing localized NO2 spike. Air monitoring activated.", agency: "PD", status: "active" },
  { id: 4, time: "10:00 AM", level: "green", title: "Air Quality Improved", message: "Morning inversion cleared. AQI returned to moderate levels across all zones.", agency: "EMA", status: "resolved" },
  { id: 5, time: "9:30 AM", level: "yellow", title: "Construction Dust Warning", message: "New development project on Main St exceeding dust limits. Compliance notice issued.", agency: "EPA", status: "investigating" },
  { id: 6, time: "8:00 AM", level: "green", title: "Morning Briefing", message: "All monitoring stations operational. AQI forecast: Moderate with improving trend.", agency: "EMA", status: "resolved" },
];

const SHELTER_DATA = [
  { name: "Community Center", address: "123 Main St", capacity: 500, current: 45, filtration: "HEPA", status: "open", phone: "555-0101" },
  { name: "Public Library", address: "456 Oak Ave", capacity: 300, current: 28, filtration: "HEPA", status: "open", phone: "555-0102" },
  { name: "High School Gym", address: "789 Pine Rd", capacity: 800, current: 0, filtration: "Standard", status: "standby", phone: "555-0103" },
  { name: "Senior Center", address: "321 Elm St", capacity: 200, current: 12, filtration: "HEPA", status: "open", phone: "555-0104" },
  { name: "Recreation Center", address: "654 Maple Dr", capacity: 400, current: 0, filtration: "HEPA", status: "standby", phone: "555-0105" },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

function getAlertLevel(aqi) {
  return [...ALERT_LEVELS].reverse().find((l) => aqi >= l.threshold) || ALERT_LEVELS[0];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PollutionEmergencyResponse() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentAQI, setCurrentAQI] = useState(142);
  const [selectedEmergency, setSelectedEmergency] = useState("industrial");
  const [checkedItems, setCheckedItems] = useState({});
  const [simulatedAQI, setSimulatedAQI] = useState(142);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const alertLevel = useMemo(() => getAlertLevel(currentAQI), [currentAQI]);

  const toggleCheckItem = useCallback((phase, index) => {
    const key = `${phase}-${index}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const startSimulation = useCallback(() => {
    setIsSimulating(true);
    let aqi = 50;
    const interval = setInterval(() => {
      aqi += Math.floor(Math.random() * 20 + 5);
      if (aqi > 350) {
        aqi = 350;
        clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 2000);
      }
      setSimulatedAQI(aqi);
      setCurrentAQI(aqi);
    }, 500);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulatedAQI(85);
    setCurrentAQI(85);
    setCheckedItems({});
  }, []);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "alerts", label: "Real-Time Alerts", icon: "🔔" },
    { id: "protocols", label: "Emergency Protocols", icon: "📋" },
    { id: "agencies", label: "Response Agencies", icon: "🏛️" },
    { id: "shelters", label: "Emergency Shelters", icon: "🏠" },
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
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 8px", background: `linear-gradient(135deg, ${alertLevel.color}, #ef4444)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🚨 Pollution Emergency Response
          </h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Real-time monitoring, emergency protocols, and crisis management</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ padding: "10px 20px", borderRadius: "12px", background: alertLevel.bg, border: `2px solid ${alertLevel.color}40` }}>
            <span style={{ fontSize: "24px" }}>{alertLevel.icon}</span>
            <span style={{ marginLeft: "8px", fontSize: "16px", fontWeight: "800", color: alertLevel.color }}>{currentAQI} AQI</span>
            <div style={{ fontSize: "11px", color: alertLevel.color, fontWeight: "600", marginTop: "2px" }}>{alertLevel.label}</div>
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

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === "dashboard" && (
        <div>
          {/* Alert Level Overview */}
          <div style={{ ...cardStyle, marginBottom: "20px", background: alertLevel.bg, border: `1px solid ${alertLevel.color}30` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "40px" }}>{alertLevel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", color: alertLevel.color }}>Current Alert Level: {alertLevel.label}</h2>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>AQI {currentAQI} • Last updated: Just now</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ padding: "8px 16px", borderRadius: "8px", background: isSimulating ? "#ef4444" : "#3b82f6", color: "#fff", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer" }} onClick={isSimulating ? resetSimulation : startSimulation}>
                  {isSimulating ? "⏹ Stop Sim" : "▶️ Simulate Crisis"}
                </button>
                <button style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", cursor: "pointer" }} onClick={resetSimulation}>
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* AQI Level Indicators */}
            <div style={{ display: "flex", gap: "4px" }}>
              {ALERT_LEVELS.map((level) => (
                <div key={level.id} style={{
                  flex: 1, padding: "8px", borderRadius: "8px", textAlign: "center",
                  background: currentAQI >= level.threshold && currentAQI < (level.threshold + 50) ? level.bg : "rgba(255,255,255,0.02)",
                  border: currentAQI >= level.threshold && currentAQI < (level.threshold + 50) ? `1px solid ${level.color}40` : "1px solid transparent",
                  transition: "all 0.3s",
                }}>
                  <div style={{ fontSize: "16px" }}>{level.icon}</div>
                  <div style={{ fontSize: "10px", color: level.color, fontWeight: "600" }}>{level.label}</div>
                  <div style={{ fontSize: "9px", color: "#6b7280" }}>{level.threshold}+</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
            {/* Active Alerts */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>🔔 Active Alerts</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {REAL_TIME_ALERTS.filter((a) => a.status === "active").map((alert) => {
                  const level = ALERT_LEVELS.find((l) => l.id === alert.level);
                  return (
                    <div key={alert.id} style={{ padding: "12px", borderRadius: "10px", background: level?.bg || "rgba(255,255,255,0.03)", border: `1px solid ${level?.color}20`, cursor: "pointer" }}
                      onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{level?.icon}</span>
                          <span style={{ fontSize: "13px", fontWeight: "700" }}>{alert.title}</span>
                        </div>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>{alert.time}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{alert.message}</div>
                      {selectedAlert === alert.id && (
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${level?.color}20`, fontSize: "11px", color: "#94a3b8" }}>
                          Responding: <strong style={{ color: level?.color }}>{alert.agency}</strong> • Status: <strong>{alert.status}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>⚡ Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { label: "Issue Public Alert", icon: "📢", color: "#ef4444" },
                    { label: "Activate Shelters", icon: "🏠", color: "#3b82f6" },
                    { label: "Notify Agencies", icon: "🏛️", color: "#8b5cf6" },
                    { label: "Deploy Monitors", icon: "📡", color: "#10b981" },
                    { label: "Traffic Reroute", icon: "🚗", color: "#f59e0b" },
                    { label: "Media Briefing", icon: "📺", color: "#06b6d4" },
                  ].map((action, i) => (
                    <button key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#e2e8f0", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }}
                      onClick={() => alert(`🚨 Action triggered: ${action.label}`)}>
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Timeline */}
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>⏱️ Response Timeline</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {PROTOCOL_STEPS.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: i === 0 ? "#3b82f6" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}>
                        {i === 0 ? "✓" : i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600" }}>{step.icon} {step.phase}</div>
                        <div style={{ fontSize: "10px", color: "#6b7280" }}>{step.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REAL-TIME ALERTS TAB ═══ */}
      {activeTab === "alerts" && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {REAL_TIME_ALERTS.map((alert) => {
              const level = ALERT_LEVELS.find((l) => l.id === alert.level);
              const isActive = alert.status === "active";
              return (
                <div key={alert.id} style={{ ...cardStyle, border: `1px solid ${level?.color}30`, opacity: isActive ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{level?.icon}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700" }}>{alert.title}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{alert.time} • {alert.agency}</div>
                      </div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "6px", background: isActive ? `${level?.color}20` : "rgba(255,255,255,0.05)", color: isActive ? level?.color : "#6b7280", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>
                      {alert.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", paddingLeft: "34px" }}>{alert.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ EMERGENCY PROTOCOLS TAB ═══ */}
      {activeTab === "protocols" && (
        <div>
          {/* Emergency Type Selector */}
          <div style={{ ...cardStyle, marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>🚨 Select Emergency Type</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {EMERGENCY_TYPES.map((type) => (
                <button key={type.id} style={{ ...btnStyle(selectedEmergency === type.id), display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px" }} onClick={() => { setSelectedEmergency(type.id); setCheckedItems({}); }}>
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>
              {EMERGENCY_TYPES.find((t) => t.id === selectedEmergency)?.description}
            </div>
          </div>

          {/* Protocol Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>📋 Response Checklist</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(CRISIS_CHECKLISTS[selectedEmergency] || []).map((item, i) => {
                  const key = `${selectedEmergency}-${i}`;
                  const isChecked = checkedItems[key];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: isChecked ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", cursor: "pointer", transition: "all 0.2s" }} onClick={() => toggleCheckItem(selectedEmergency, i)}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "4px", border: isChecked ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.2)", background: isChecked ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", flexShrink: 0 }}>
                        {isChecked ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: "12px", color: isChecked ? "#10b981" : "#e2e8f0", textDecoration: isChecked ? "line-through" : "none" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "12px", padding: "8px", borderRadius: "8px", background: "rgba(59,130,246,0.08)", fontSize: "11px", color: "#3b82f6" }}>
                Progress: {Object.keys(checkedItems).filter((k) => k.startsWith(selectedEmergency) && checkedItems[k]).length}/{CRISIS_CHECKLISTS[selectedEmergency]?.length || 0} completed
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Response Phases */}
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>⏱️ Response Phases</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {PROTOCOL_STEPS.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                        {step.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: "600" }}>{step.phase}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{step.description}</div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>{step.duration}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contacts */}
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📞 Emergency Contacts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {AGENCIES.slice(0, 4).map((agency) => (
                    <div key={agency.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <span>{agency.icon}</span>
                      <span style={{ flex: 1, fontSize: "11px" }}>{agency.abbr}</span>
                      <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600" }}>{agency.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESPONSE AGENCIES TAB ═══ */}
      {activeTab === "agencies" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {AGENCIES.map((agency) => (
            <div key={agency.id} style={{ ...cardStyle, borderTop: `3px solid #3b82f6` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "28px" }}>{agency.icon}</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px" }}>{agency.name}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{agency.abbr}</div>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#e2e8f0", marginBottom: "12px" }}>{agency.role}</div>
              <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📞</span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#3b82f6" }}>{agency.phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ EMERGENCY SHELTERS TAB ═══ */}
      {activeTab === "shelters" && (
        <div>
          <div style={{ ...cardStyle, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>🏠 Emergency Shelters</h3>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                <span style={{ color: "#10b981" }}>🟢 {SHELTER_DATA.filter((s) => s.status === "open").length} Open</span>
                <span style={{ color: "#f59e0b" }}>🟡 {SHELTER_DATA.filter((s) => s.status === "standby").length} Standby</span>
                <span>📊 Total Capacity: {SHELTER_DATA.reduce((s, sh) => s + sh.capacity, 0)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {SHELTER_DATA.map((shelter, i) => {
              const occupancyPct = Math.round((shelter.current / shelter.capacity) * 100);
              return (
                <div key={i} style={{ ...cardStyle, border: shelter.status === "open" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "14px" }}>{shelter.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{shelter.address}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "6px", background: shelter.status === "open" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: shelter.status === "open" ? "#10b981" : "#f59e0b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>
                      {shelter.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px", fontSize: "11px" }}>
                    <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontWeight: "700", color: "#3b82f6" }}>{shelter.capacity}</div>
                      <div style={{ color: "#6b7280" }}>Capacity</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontWeight: "700", color: occupancyPct > 80 ? "#ef4444" : "#10b981" }}>{shelter.current}</div>
                      <div style={{ color: "#6b7280" }}>Occupied</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontWeight: "700" }}>{shelter.filtration}</div>
                      <div style={{ color: "#6b7280" }}>Filter</div>
                    </div>
                  </div>

                  <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                    <div style={{ height: "100%", width: `${occupancyPct}%`, background: occupancyPct > 80 ? "#ef4444" : occupancyPct > 50 ? "#f59e0b" : "#10b981", borderRadius: "3px" }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>{occupancyPct}% occupied</span>
                    <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600" }}>📞 {shelter.phone}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
