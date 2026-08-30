import { useState, useMemo, useCallback } from "react";

// ─── Types & Constants ──────────────────────────────────────────────────────

const AQI_LEVELS = [
  { min: 0, max: 50, label: "Good", color: "#00e400", bg: "rgba(0,228,0,0.1)", icon: "😊" },
  { min: 51, max: 100, label: "Moderate", color: "#ffff00", bg: "rgba(255,255,0,0.1)", icon: "😐" },
  { min: 101, max: 150, label: "Unhealthy (SG)", color: "#ff7e00", bg: "rgba(255,126,0,0.1)", icon: "😷" },
  { min: 151, max: 200, label: "Unhealthy", color: "#ff0000", bg: "rgba(255,0,0,0.1)", icon: "🤢" },
  { min: 201, max: 300, label: "Very Unhealthy", color: "#8f3f97", bg: "rgba(143,63,151,0.1)", icon: "🚨" },
  { min: 301, max: 500, label: "Hazardous", color: "#7e0023", bg: "rgba(126,0,35,0.1)", icon: "☠️" },
];

const AGE_GROUPS = [
  { id: "child", label: "Child (0-12)", icon: "👶", multiplier: 1.3 },
  { id: "teen", label: "Teen (13-17)", icon: "🧒", multiplier: 1.15 },
  { id: "adult", label: "Adult (18-59)", icon: "🧑", multiplier: 1.0 },
  { id: "senior", label: "Senior (60+)", icon: "👴", multiplier: 1.4 },
];

const CONDITIONS = [
  { id: "none", label: "None", icon: "✅", risk: 0 },
  { id: "asthma", label: "Asthma", icon: "🫁", risk: 30 },
  { id: "heart", label: "Heart Disease", icon: "❤️", risk: 25 },
  { id: "diabetes", label: "Diabetes", icon: "💉", risk: 15 },
  { id: "copd", label: "COPD", icon: "🫁", risk: 35 },
  { id: "pregnant", label: "Pregnant", icon: "🤰", risk: 20 },
  { id: "respiratory", label: "Other Respiratory", icon: "🩺", risk: 20 },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary (indoor)", icon: "🪑", exposureMultiplier: 0.3, desc: "Mostly indoors, minimal outdoor time" },
  { id: "light", label: "Light (walking)", icon: "🚶", exposureMultiplier: 0.6, desc: "30-60 min outdoor walking daily" },
  { id: "moderate", label: "Moderate (exercise)", icon: "🏃", exposureMultiplier: 1.0, desc: "1-2 hours outdoor exercise" },
  { id: "intense", label: "Intense (sports)", icon: "⚽", exposureMultiplier: 1.5, desc: "2+ hours intense outdoor activity" },
  { id: "outdoor-work", label: "Outdoor Worker", icon: "👷", exposureMultiplier: 2.0, desc: "6+ hours outdoor work daily" },
];

const DURATION_OPTIONS = [
  { id: "1h", label: "1 Hour", hours: 1 },
  { id: "4h", label: "4 Hours", hours: 4 },
  { id: "8h", label: "8 Hours", hours: 8 },
  { id: "24h", label: "24 Hours", hours: 24 },
  { id: "7d", label: "7 Days", hours: 168 },
  { id: "30d", label: "30 Days", hours: 720 },
];

const ORGANS = [
  { id: "lungs", label: "Lungs", icon: "🫁", description: "Respiratory system" },
  { id: "heart", label: "Heart", icon: "❤️", description: "Cardiovascular system" },
  { id: "brain", label: "Brain", icon: "🧠", description: "Neurological effects" },
  { id: "eyes", label: "Eyes", icon: "👁️", description: "Ocular irritation" },
  { id: "skin", label: "Skin", icon: "🧴", description: "Dermal exposure" },
];

// ─── Sample Data ────────────────────────────────────────────────────────────

const HEALTH_EFFECTS_DATA = {
  lungs: [
    { effect: "Reduced lung function", threshold: 50, severity: "mild", description: "Slight decrease in FEV1 measurements" },
    { effect: "Airway inflammation", threshold: 75, severity: "moderate", description: "Bronchial tube swelling and mucus production" },
    { effect: "Asthma exacerbation", threshold: 100, severity: "moderate", description: "Increased frequency and severity of attacks" },
    { effect: "Bronchitis symptoms", threshold: 150, severity: "severe", description: "Persistent cough, chest discomfort" },
    { effect: "Pneumonia risk", threshold: 200, severity: "severe", description: "Significantly elevated infection risk" },
    { effect: "Acute respiratory distress", threshold: 300, severity: "critical", description: "Emergency medical attention required" },
  ],
  heart: [
    { effect: "Heart rate variability", threshold: 75, severity: "mild", description: "Slight irregular heart rhythm changes" },
    { effect: "Blood pressure increase", threshold: 100, severity: "moderate", description: "Elevated systolic/diastolic readings" },
    { effect: "Arrhythmia risk", threshold: 150, severity: "moderate", description: "Irregular heartbeat episodes" },
    { effect: "Heart attack risk", threshold: 200, severity: "severe", description: "Significantly elevated cardiac event risk" },
    { effect: "Cardiac arrest", threshold: 300, severity: "critical", description: "Life-threatening emergency" },
  ],
  brain: [
    { effect: "Headaches", threshold: 50, severity: "mild", description: "Mild to moderate headaches" },
    { effect: "Cognitive impairment", threshold: 100, severity: "moderate", description: "Reduced concentration and memory" },
    { effect: "Mood changes", threshold: 100, severity: "moderate", description: "Increased anxiety and irritability" },
    { effect: "Dizziness", threshold: 150, severity: "moderate", description: "Balance and coordination issues" },
    { effect: "Neurological damage", threshold: 300, severity: "critical", description: "Potential long-term brain effects" },
  ],
  eyes: [
    { effect: "Eye irritation", threshold: 50, severity: "mild", description: "Redness, watering, itching" },
    { effect: "Conjunctivitis", threshold: 100, severity: "moderate", description: "Eye inflammation and discharge" },
    { effect: "Corneal damage", threshold: 200, severity: "severe", description: "Surface damage to eye tissue" },
  ],
  skin: [
    { effect: "Skin irritation", threshold: 100, severity: "mild", description: "Redness and dryness" },
    { effect: "Contact dermatitis", threshold: 150, severity: "moderate", description: "Inflammatory skin reaction" },
    { effect: "Chemical burns", threshold: 300, severity: "critical", description: "Severe skin damage from pollutants" },
  ],
};

const RECOMMENDATIONS = [
  { aqiRange: [0, 50], level: "safe", title: "Enjoy the Fresh Air", icon: "🌿", actions: ["Great for outdoor exercise", "Open windows for ventilation", "No restrictions needed", "Consider outdoor activities"] },
  { aqiRange: [51, 100], level: "moderate", title: "Take Basic Precautions", icon: "⚠️", actions: ["Sensitive groups reduce prolonged outdoor exertion", "Close windows during peak traffic hours", "Use air purifiers if available", "Monitor symptoms if sensitive"] },
  { aqiRange: [101, 150], level: "unhealthy_sg", title: "Protective Measures Needed", icon: "😷", actions: ["Wear N95/KN95 masks outdoors", "Move exercise indoors", "Keep windows closed", "Run air purifiers on high", "Avoid busy roads"] },
  { aqiRange: [151, 200], level: "unhealthy", title: "Minimize Outdoor Exposure", icon: "🛑", actions: ["Avoid all outdoor exercise", "Wear masks when going outside", "Set HVAC to recirculate", "Check on elderly neighbors", "Monitor air quality hourly"] },
  { aqiRange: [201, 500], level: "hazardous", title: "Emergency Indoor Protocol", icon: "🚨", actions: ["Stay indoors at all costs", "Seal windows and doors", "Use multiple air purifiers", "Avoid cooking that produces smoke", "Seek medical help if symptoms worsen", "Monitor emergency broadcasts"] },
];

const POLLUTANT_HEALTH_DATA = {
  "PM2.5": { shortTerm: "Aggravates asthma, causes respiratory symptoms", longTerm: "Cardiovascular disease, lung cancer, premature death", threshold: 25, unit: "μg/m³" },
  "PM10": { shortTerm: "Coughing, throat irritation, reduced lung function", longTerm: "Chronic bronchitis, reduced lung capacity", threshold: 50, unit: "μg/m³" },
  "O3": { shortTerm: "Chest pain, coughing, throat irritation", longTerm: "Reduced lung function, lung tissue damage", threshold: 70, unit: "ppb" },
  "NO2": { shortTerm: "Airway inflammation, increased respiratory infections", longTerm: "Asthma development, reduced lung function", threshold: 53, unit: "ppb" },
  "SO2": { shortTerm: "Wheezing, chest tightness, shortness of breath", longTerm: "Aggravates asthma, respiratory illness", threshold: 35, unit: "ppb" },
  "CO": { shortTerm: "Headache, dizziness, confusion at high levels", longTerm: "Heart disease complications", threshold: 9, unit: "ppm" },
};

// ─── Utility Functions ──────────────────────────────────────────────────────

function getAqiLevel(aqi) {
  return AQI_LEVELS.find((l) => aqi >= l.min && l.min <= aqi) || AQI_LEVELS[0];
}

function calculateHealthRisk(aqi, ageGroup, conditions, activity, duration) {
  const age = AGE_GROUPS.find((a) => a.id === ageGroup) || AGE_GROUPS[2];
  const act = ACTIVITY_LEVELS.find((a) => a.id === activity) || ACTIVITY_LEVELS[2];
  const dur = DURATION_OPTIONS.find((d) => d.id === duration) || DURATION_OPTIONS[3];

  const baseRisk = Math.min(100, (aqi / 300) * 60);
  const ageImpact = (age.multiplier - 1) * 30;
  const conditionImpact = conditions.reduce((sum, c) => {
    const cond = CONDITIONS.find((cc) => cc.id === c);
    return sum + (cond ? cond.risk : 0);
  }, 0) / Math.max(1, conditions.length);
  const activityImpact = (act.exposureMultiplier - 1) * 20;
  const durationFactor = dur.hours <= 1 ? 0.5 : dur.hours <= 8 ? 1.0 : dur.hours <= 24 ? 1.3 : dur.hours <= 168 ? 1.6 : 2.0;

  const totalRisk = Math.min(100, Math.round(baseRisk + ageImpact + conditionImpact + activityImpact * durationFactor));
  return totalRisk;
}

function getRiskLevel(risk) {
  if (risk <= 20) return { label: "Low Risk", color: "#10b981", icon: "✅", bg: "rgba(16,185,129,0.1)" };
  if (risk <= 40) return { label: "Moderate Risk", color: "#f59e0b", icon: "⚠️", bg: "rgba(245,158,11,0.1)" };
  if (risk <= 60) return { label: "Elevated Risk", color: "#f97316", icon: "🔶", bg: "rgba(249,115,22,0.1)" };
  if (risk <= 80) return { label: "High Risk", color: "#ef4444", icon: "🛑", bg: "rgba(239,68,68,0.1)" };
  return { label: "Critical Risk", color: "#7e0023", icon: "🚨", bg: "rgba(126,0,35,0.1)" };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PollutionHealthRiskCalculator() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [aqi, setAqi] = useState(85);
  const [selectedAge, setSelectedAge] = useState("adult");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState("light");
  const [selectedDuration, setSelectedDuration] = useState("8h");
  const [showDetails, setShowDetails] = useState(null);

  const riskScore = useMemo(
    () => calculateHealthRisk(aqi, selectedAge, selectedConditions, selectedActivity, selectedDuration),
    [aqi, selectedAge, selectedConditions, selectedActivity, selectedDuration]
  );
  const riskLevel = getRiskLevel(riskScore);
  const aqiLevel = getAqiLevel(aqi);

  const activeRecommendation = useMemo(
    () => RECOMMENDATIONS.find((r) => aqi >= r.aqiRange[0] && aqi <= r.aqiRange[1]) || RECOMMENDATIONS[0],
    [aqi]
  );

  const toggleCondition = useCallback((id) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? (prev.length === 1 ? [] : prev.filter((c) => c !== id)) : [...prev, id]
    );
  }, []);

  const tabs = [
    { id: "calculator", label: "Risk Calculator", icon: "🧮" },
    { id: "effects", label: "Health Effects", icon: "🩺" },
    { id: "pollutants", label: "Pollutant Guide", icon: "🔬" },
    { id: "recommendations", label: "Recommendations", icon: "📋" },
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
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 8px", background: "linear-gradient(135deg, #ef4444, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🏥 Pollution Health Risk Calculator
        </h1>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Calculate personalized health risks based on air quality, age, conditions, and activity</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button key={tab.id} style={{ ...btnStyle(activeTab === tab.id), padding: "10px 20px" }} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ RISK CALCULATOR TAB ═══ */}
      {activeTab === "calculator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Input Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* AQI Slider */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📊 Air Quality Index (AQI)</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <input type="range" min="0" max="500" value={aqi} onChange={(e) => setAqi(parseInt(e.target.value))} style={{ flex: 1, accentColor: aqiLevel.color }} />
                <span style={{ fontSize: "24px", fontWeight: "900", color: aqiLevel.color, minWidth: "60px", textAlign: "right" }}>{aqi}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#6b7280" }}>
                <span>0 (Good)</span><span>100</span><span>200</span><span>300</span><span>500 (Hazardous)</span>
              </div>
              <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: aqiLevel.bg, display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{aqiLevel.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: aqiLevel.color }}>{aqiLevel.label}</span>
              </div>
            </div>

            {/* Age Group */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>👤 Age Group</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {AGE_GROUPS.map((age) => (
                  <button key={age.id} style={{
                    ...btnStyle(selectedAge === age.id),
                    display: "flex", flexDirection: "column", alignItems: "center", padding: "12px", gap: "4px",
                  }} onClick={() => setSelectedAge(age.id)}>
                    <span style={{ fontSize: "20px" }}>{age.icon}</span>
                    <span style={{ fontSize: "11px" }}>{age.label}</span>
                    {age.multiplier !== 1.0 && (
                      <span style={{ fontSize: "9px", color: age.multiplier > 1 ? "#ef4444" : "#10b981" }}>
                        {age.multiplier > 1 ? "↑" : "↓"} {Math.round((age.multiplier - 1) * 100)}% risk
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Health Conditions */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>🏥 Health Conditions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {CONDITIONS.map((cond) => {
                  const isSelected = selectedConditions.includes(cond.id);
                  return (
                    <button key={cond.id} style={{
                      ...btnStyle(isSelected),
                      display: "flex", alignItems: "center", gap: "8px", textAlign: "left", width: "100%",
                    }} onClick={() => toggleCondition(cond.id)}>
                      <span>{cond.icon}</span>
                      <span style={{ flex: 1, fontSize: "12px" }}>{cond.label}</span>
                      {cond.risk > 0 && <span style={{ fontSize: "10px", color: isSelected ? "#ef4444" : "#6b7280" }}>+{cond.risk}pts</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Level */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>🏃 Activity Level</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {ACTIVITY_LEVELS.map((act) => (
                  <button key={act.id} style={{
                    ...btnStyle(selectedActivity === act.id),
                    display: "flex", alignItems: "center", gap: "8px", textAlign: "left", width: "100%",
                  }} onClick={() => setSelectedActivity(act.id)}>
                    <span>{act.icon}</span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "600" }}>{act.label}</div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>{act.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>⏱️ Exposure Duration</h3>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {DURATION_OPTIONS.map((dur) => (
                  <button key={dur.id} style={btnStyle(selectedDuration === dur.id)} onClick={() => setSelectedDuration(dur.id)}>
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Risk Score */}
            <div style={{ ...cardStyle, background: riskLevel.bg, border: `1px solid ${riskLevel.color}30`, textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>{riskLevel.icon}</div>
              <div style={{ fontSize: "56px", fontWeight: "900", color: riskLevel.color }}>{riskScore}</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: riskLevel.color, marginBottom: "4px" }}>{riskLevel.label}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Personalized health risk score (0-100)</div>

              {/* Risk meter */}
              <div style={{ marginTop: "16px", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${riskScore}%`, borderRadius: "4px",
                  background: `linear-gradient(90deg, #10b981, #f59e0b, #ef4444, #7e0023)`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#6b7280", marginTop: "4px" }}>
                <span>Safe</span><span>Moderate</span><span>High</span><span>Critical</span>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📊 Risk Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Base AQI Risk", value: Math.round(Math.min(100, (aqi / 300) * 60)), color: aqiLevel.color },
                  { label: "Age Factor", value: Math.round((AGE_GROUPS.find((a) => a.id === selectedAge)?.multiplier - 1) * 30), color: "#8b5cf6" },
                  { label: "Condition Factor", value: Math.round(selectedConditions.reduce((s, c) => s + (CONDITIONS.find((cc) => cc.id === c)?.risk || 0), 0) / Math.max(1, selectedConditions.length)), color: "#ef4444" },
                  { label: "Activity Impact", value: Math.round((ACTIVITY_LEVELS.find((a) => a.id === selectedActivity)?.exposureMultiplier - 1) * 20), color: "#f59e0b" },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "#94a3b8" }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: "700" }}>{item.value > 0 ? `+${item.value}` : item.value}</span>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.abs(item.value))}%`, background: item.color, borderRadius: "2px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Immediate Recommendation */}
            <div style={{ ...cardStyle, background: activeRecommendation.level === "safe" ? "rgba(16,185,129,0.08)" : activeRecommendation.level === "moderate" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "28px" }}>{activeRecommendation.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px" }}>{activeRecommendation.title}</h3>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Based on AQI {aqi}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activeRecommendation.actions.map((action, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "#e2e8f0" }}>
                    <span style={{ color: "#10b981", marginTop: "1px" }}>✓</span> {action}
                  </div>
                ))}
              </div>
            </div>

            {/* Organ Risk Summary */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>🩺 Organ Risk Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                {ORGANS.map((organ) => {
                  const effects = HEALTH_EFFECTS_DATA[organ.id] || [];
                  const relevantEffects = effects.filter((e) => aqi >= e.threshold);
                  const organRisk = relevantEffects.length > 0 ? Math.min(100, relevantEffects.length * 25 + aqi / 5) : Math.max(0, aqi / 10);
                  return (
                    <div key={organ.id} style={{ textAlign: "center", padding: "10px 6px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", cursor: "pointer" }}
                      onClick={() => setShowDetails(showDetails === organ.id ? null : organ.id)}>
                      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{organ.icon}</div>
                      <div style={{ fontSize: "11px", fontWeight: "600" }}>{organ.label}</div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: organRisk > 60 ? "#ef4444" : organRisk > 30 ? "#f59e0b" : "#10b981" }}>
                        {Math.round(organRisk)}%
                      </div>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${organRisk}%`, background: organRisk > 60 ? "#ef4444" : organRisk > 30 ? "#f59e0b" : "#10b981", borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {showDetails && HEALTH_EFFECTS_DATA[showDetails] && (
                <div style={{ marginTop: "12px", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "13px" }}>{ORGANS.find((o) => o.id === showDetails)?.icon} {ORGANS.find((o) => o.id === showDetails)?.label} Effects</h4>
                  {HEALTH_EFFECTS_DATA[showDetails].filter((e) => aqi >= e.threshold * 0.7).map((effect, i) => (
                    <div key={i} style={{
                      padding: "8px", borderRadius: "8px", marginBottom: "6px",
                      background: aqi >= effect.threshold ? (effect.severity === "critical" ? "rgba(126,0,35,0.1)" : effect.severity === "severe" ? "rgba(239,68,68,0.1)" : effect.severity === "moderate" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)") : "rgba(255,255,255,0.02)",
                      opacity: aqi >= effect.threshold ? 1 : 0.5,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>{effect.effect}</span>
                        <span style={{
                          padding: "1px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", textTransform: "uppercase",
                          background: effect.severity === "critical" ? "rgba(126,0,35,0.2)" : effect.severity === "severe" ? "rgba(239,68,68,0.2)" : effect.severity === "moderate" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                          color: effect.severity === "critical" ? "#7e0023" : effect.severity === "severe" ? "#ef4444" : effect.severity === "moderate" ? "#f59e0b" : "#10b981",
                        }}>
                          {effect.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{effect.description}</div>
                      <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>Threshold: AQI {effect.threshold}+ {aqi >= effect.threshold ? "⚠️ ACTIVE" : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEALTH EFFECTS TAB ═══ */}
      {activeTab === "effects" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {ORGANS.map((organ) => {
            const effects = HEALTH_EFFECTS_DATA[organ.id] || [];
            return (
              <div key={organ.id} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "24px" }}>{organ.icon}</span>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>{organ.label}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{organ.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {effects.map((effect, i) => {
                    const isActive = aqi >= effect.threshold;
                    return (
                      <div key={i} style={{
                        padding: "8px 10px", borderRadius: "8px",
                        background: isActive ? (effect.severity === "critical" ? "rgba(126,0,35,0.1)" : effect.severity === "severe" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)") : "rgba(255,255,255,0.02)",
                        border: isActive ? `1px solid ${effect.severity === "critical" ? "rgba(126,0,35,0.3)" : effect.severity === "severe" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}` : "1px solid transparent",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600" }}>{isActive ? "⚠️" : "○"} {effect.effect}</span>
                          <span style={{ fontSize: "9px", color: "#6b7280" }}>AQI {effect.threshold}+</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{effect.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ POLLUTANT GUIDE TAB ═══ */}
      {activeTab === "pollutants" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {Object.entries(POLLUTANT_HEALTH_DATA).map(([name, data]) => {
            const colors = { "PM2.5": "#ef4444", PM10: "#f59e0b", O3: "#8b5cf6", NO2: "#3b82f6", SO2: "#06b6d4", CO: "#10b981" };
            return (
              <div key={name} style={{ ...cardStyle, borderTop: `3px solid ${colors[name]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: colors[name] }}>{name}</span>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", background: `${colors[name]}20`, color: colors[name], fontSize: "10px", fontWeight: "700" }}>
                    Safe: &lt;{data.threshold} {data.unit}
                  </span>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#f59e0b", marginBottom: "4px" }}>🩺 Short-term Effects:</div>
                  <div style={{ fontSize: "12px", color: "#e2e8f0" }}>{data.shortTerm}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#ef4444", marginBottom: "4px" }}>⚠️ Long-term Effects:</div>
                  <div style={{ fontSize: "12px", color: "#e2e8f0" }}>{data.longTerm}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ RECOMMENDATIONS TAB ═══ */}
      {activeTab === "recommendations" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {RECOMMENDATIONS.map((rec, i) => {
            const isActive = aqi >= rec.aqiRange[0] && aqi <= rec.aqiRange[1];
            return (
              <div key={i} style={{
                ...cardStyle,
                border: isActive ? `2px solid ${AQI_LEVELS.find((l) => rec.aqiRange[0] >= l.min && rec.aqiRange[0] <= l.max)?.color || "#3b82f6"}` : "1px solid rgba(255,255,255,0.06)",
                opacity: isActive ? 1 : 0.6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "28px" }}>{rec.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px" }}>{rec.title}</h3>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>AQI {rec.aqiRange[0]}–{rec.aqiRange[1]}</div>
                  </div>
                  {isActive && (
                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "6px", background: "rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: "10px", fontWeight: "700" }}>CURRENT</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {rec.actions.map((action, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "#e2e8f0" }}>
                      <span style={{ color: "#10b981", marginTop: "1px" }}>✓</span> {action}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
