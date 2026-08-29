import React, { useCallback, useId, useMemo, useState } from "react";
import { DisclosureButton } from "./ui/PressableCard";

// ─── AQI & Health Data ──────────────────────────────────────────────────────
const AQI_CATEGORIES = [
  { range: [0, 50], label: "Good", color: "#22c55e", bg: "#22c55e15", icon: "😊", risk: "Minimal", population: "Enjoy outdoor activities" },
  { range: [51, 100], label: "Moderate", color: "#eab308", bg: "#eab30815", icon: "😐", risk: "Low", population: "Sensitive individuals may experience minor discomfort" },
  { range: [101, 150], label: "Unhealthy for Sensitive", color: "#f97316", bg: "#f9731615", icon: "🤧", risk: "Moderate", population: "Children, elderly, and those with respiratory conditions should limit outdoor exposure" },
  { range: [151, 200], label: "Unhealthy", color: "#ef4444", bg: "#ef444415", icon: "😷", risk: "High", population: "Everyone may begin to experience health effects" },
  { range: [201, 300], label: "Very Unhealthy", color: "#9333ea", bg: "#9333ea15", icon: "🤢", risk: "Very High", population: "Health alert: everyone may experience serious health effects" },
  { range: [301, 500], label: "Hazardous", color: "#7f1d1d", bg: "#7f1d1d15", icon: "☠️", risk: "Extreme", population: "Emergency conditions: entire population affected" },
];

const HEALTH_EFFECTS = [
  { pollutant: "PM2.5", shortTerm: ["Irritation of eyes, nose, throat", "Coughing and sneezing", "Aggravation of asthma", "Difficulty breathing"], longTerm: ["Cardiovascular disease", "Lung cancer", "Reduced lung function", "Premature death"], vulnerable: ["Children", "Elderly", "Asthmatics", "Heart disease patients"] },
  { pollutant: "PM10", shortTerm: ["Upper respiratory irritation", "Aggravation of asthma", "Reduced lung function"], longTerm: ["Chronic bronchitis", "Reduced lung function", "Aggravation of existing conditions"], vulnerable: ["Outdoor workers", "Athletes", "Children"] },
  { pollutant: "O₃ (Ozone)", shortTerm: ["Chest pain", "Coughing", "Throat irritation", "Worsening of asthma", "Reduced lung function"], longTerm: ["Permanent lung damage", "Increased susceptibility to infections"], vulnerable: ["Children", "Athletes", "Outdoor workers"] },
  { pollutant: "NO₂", shortTerm: ["Airway inflammation", "Increased airway reactivity", "Aggravation of asthma"], longTerm: ["Increased susceptibility to respiratory infections", "Onset of childhood asthma"], vulnerable: ["Asthmatics", "Children"] },
  { pollutant: "SO₂", shortTerm: ["Breathing difficulties", "Aggravation of asthma", "Wheezing", "Chest tightness"], longTerm: ["Aggravation of cardiovascular disease", "Respiratory illness"], vulnerable: ["Asthmatics", "COPD patients"] },
  { pollutant: "CO", shortTerm: ["Headache", "Dizziness", "Confusion", "Impaired vision"], longTerm: ["Cardiovascular effects", "Neurological damage at high levels"], vulnerable: ["Pregnant women", "Heart disease patients", "Infants"] },
];

const HEALTHY_ACTIVITIES = {
  low: { outdoor: true, exercise: true, icon: "🏃", message: "Great day for outdoor activities!" },
  moderate: { outdoor: true, exercise: true, icon: "🚶", message: "Enjoy outdoor activities with minimal concern." },
  sensitive: { outdoor: true, exercise: false, icon: "🧘", message: "Limit prolonged outdoor exertion." },
  unhealthy: { outdoor: false, exercise: false, icon: "🏠", message: "Stay indoors when possible. Use air purifiers." },
  veryUnhealthy: { outdoor: false, exercise: false, icon: "⛔", message: "Avoid all outdoor exertion. Keep windows closed." },
  hazardous: { outdoor: false, exercise: false, icon: "🚨", message: "Emergency: Stay indoors with air filtration." },
};

const RECOMMENDATIONS = {
  general: [
    { condition: "Always", action: "Stay hydrated — drink 8+ glasses of water daily", priority: "high" },
    { condition: "AQI > 100", action: "Use air purifier with HEPA filter indoors", priority: "high" },
    { condition: "AQI > 150", action: "Wear N95/KN95 mask if going outside", priority: "critical" },
    { condition: "AQI > 200", action: "Close all windows and use indoor air filtration", priority: "critical" },
    { condition: "Daily", action: "Check AQI before planning outdoor activities", priority: "medium" },
  ],
  respiratory: [
    { condition: "AQI > 50", action: "Keep rescue inhaler accessible", priority: "high" },
    { condition: "AQI > 100", action: "Use prescribed controller medications as directed", priority: "high" },
    { condition: "AQI > 150", action: "Stay indoors with clean air; avoid going outside", priority: "critical" },
    { condition: "Any AQI", action: "Monitor symptoms and report worsening to doctor", priority: "medium" },
  ],
  children: [
    { condition: "AQI > 50", action: "Limit prolonged outdoor play", priority: "medium" },
    { condition: "AQI > 100", action: "Keep children indoors; use air purifier in play areas", priority: "high" },
    { condition: "AQI > 150", action: "No outdoor recess or sports activities", priority: "critical" },
    { condition: "Daily", action: "Ensure proper ventilation in classrooms", priority: "medium" },
  ],
  elderly: [
    { condition: "AQI > 50", action: "Monitor for breathing difficulties", priority: "medium" },
    { condition: "AQI > 100", action: "Stay indoors; avoid exertion", priority: "high" },
    { condition: "AQI > 150", action: "Use air purifier; keep medications updated", priority: "critical" },
    { condition: "Always", action: "Maintain regular check-ups with doctor", priority: "medium" },
  ],
  pregnant: [
    { condition: "AQI > 50", action: "Minimize outdoor exposure", priority: "medium" },
    { condition: "AQI > 100", action: "Stay indoors; ensure good indoor air quality", priority: "high" },
    { condition: "AQI > 150", action: "Avoid all outdoor activity; consult doctor if symptoms arise", priority: "critical" },
    { condition: "Always", action: "Take prenatal vitamins including folate", priority: "medium" },
  ],
};

const SYMPTOM_OPTIONS = [
  { id: "cough", label: "Cough", icon: "🗣️", severity: "mild" },
  { id: "wheeze", label: "Wheezing", icon: "🫁", severity: "moderate" },
  { id: "breathlessness", label: "Shortness of Breath", icon: "😮‍💨", severity: "moderate" },
  { id: "chest_pain", label: "Chest Pain", icon: "💔", severity: "severe" },
  { id: "eye_irritation", label: "Eye Irritation", icon: "👁️", severity: "mild" },
  { id: "throat_irritation", label: "Throat Irritation", icon: "🗣️", severity: "mild" },
  { id: "headache", label: "Headache", icon: "🤕", severity: "mild" },
  { id: "fatigue", label: "Fatigue", icon: "😴", severity: "mild" },
  { id: "dizziness", label: "Dizziness", icon: "😵", severity: "moderate" },
  { id: "nausea", label: "Nausea", icon: "🤢", severity: "moderate" },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function getAQICategory(aqi) {
  return AQI_CATEGORIES.find(c => aqi >= c.range[0] && aqi <= c.range[1]) || AQI_CATEGORIES[5];
}

function getActivityLevel(aqi) {
  if (aqi <= 50) return "low";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "veryUnhealthy";
  return "hazardous";
}

function calculateExposureRisk(aqi, hours, activity) {
  const baseRisk = aqi / 500;
  const timeMultiplier = Math.min(hours / 8, 2);
  const activityMultiplier = activity === "outdoor_exercise" ? 2.5 : activity === "outdoor" ? 1.5 : 0.5;
  return Math.min(100, Math.round(baseRisk * timeMultiplier * activityMultiplier * 100));
}

function getHealthScore(aqi, symptoms) {
  let score = 100;
  score -= Math.min(50, aqi / 6);
  symptoms.forEach(s => {
    const symptom = SYMPTOM_OPTIONS.find(o => o.id === s);
    if (symptom?.severity === "severe") score -= 20;
    else if (symptom?.severity === "moderate") score -= 10;
    else score -= 5;
  });
  return Math.max(0, Math.round(score));
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function AQIGauge({ aqi }) {
  const category = getAQICategory(aqi);
  const pct = Math.min(100, (aqi / 500) * 100);

  return (
    <div className="relative" style={{ width: 180, height: 100 }}>
      <svg viewBox="0 0 200 110" className="w-full h-full">
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        {/* Colored segments */}
        <path d="M 20 100 A 80 80 0 0 1 45 45" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 45 45 A 80 80 0 0 1 80 25" fill="none" stroke="#eab308" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 80 25 A 80 80 0 0 1 120 25" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 120 25 A 80 80 0 0 1 155 45" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 155 45 A 80 80 0 0 1 180 100" fill="none" stroke="#9333ea" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        {/* Active arc */}
        <path
          d={`M 20 100 A 80 80 0 ${pct > 50 ? 1 : 0} 1 ${
            100 - 80 * Math.cos(Math.PI * pct / 100)
          } ${100 - 80 * Math.sin(Math.PI * pct / 100)}`}
          fill="none"
          stroke={category.color}
          strokeWidth="12"
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        <span className="text-3xl font-bold" style={{ color: category.color }}>{aqi}</span>
        <span className="text-[10px] text-slate-400">AQI</span>
      </div>
    </div>
  );
}

function HealthScoreRing({ score }) {
  // Math.PI(40) -- `Math.PI` is a number, so calling it threw
  // "TypeError: Math.PI is not a function" and took the whole dashboard down on render.
  // Fixed here because the keyboard fix below cannot be verified on a component that
  // cannot mount. r=40 matches the <circle r="40"> this dash array is drawn onto.
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: 100, height: 100 }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[8px] text-slate-500">Health</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtext }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {subtext && <p className="text-[10px] text-slate-500 mt-0.5">{subtext}</p>}
    </div>
  );
}

function PollutantCard({ pollutant, aqi, hours }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const risk = calculateExposureRisk(aqi, hours, "outdoor");
  const riskColor = risk > 70 ? "#ef4444" : risk > 40 ? "#f97316" : risk > 20 ? "#eab308" : "#22c55e";

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/40 hover:border-slate-600/60 transition-all">
      {/* The header is the control; the panel it opens sits beside it rather than inside
          it, so the button's accessible name stays the pollutant rather than becoming the
          whole card's text once expanded. */}
      <DisclosureButton
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        controls={panelId}
        label={`${pollutant.pollutant} health effects, exposure risk ${risk}%`}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-semibold text-slate-200">{pollutant.pollutant}</p>
          <p className="text-[10px] text-slate-500">Exposure risk: <span style={{ color: riskColor }}>{risk}%</span></p>
        </div>
        <div className="h-2 w-20 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${risk}%`, backgroundColor: riskColor }} />
        </div>
      </DisclosureButton>

      {expanded && (
        <div id={panelId} className="mt-3 pt-3 border-t border-slate-700/30 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-300 mb-1">Short-term Effects</p>
            <ul className="space-y-0.5">
              {pollutant.shortTerm.map((effect, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-400" /> {effect}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300 mb-1">Long-term Effects</p>
            <ul className="space-y-0.5">
              {pollutant.longTerm.map((effect, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400" /> {effect}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300 mb-1">Vulnerable Groups</p>
            <div className="flex flex-wrap gap-1">
              {pollutant.vulnerable.map((group, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-400">{group}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const priorityColors = { critical: "#ef4444", high: "#f97316", medium: "#eab308" };
  const color = priorityColors[rec.priority] || "#22c55e";

  return (
    <div className="p-3 rounded-lg border-l-4 bg-slate-900/40" style={{ borderLeftColor: color }}>
      <div className="flex items-start gap-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}20`, color }}>
          {rec.priority.toUpperCase()}
        </span>
        <div>
          <p className="text-xs text-slate-300 font-medium">{rec.action}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">When: {rec.condition}</p>
        </div>
      </div>
    </div>
  );
}

function SymptomTracker({ symptoms, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SYMPTOM_OPTIONS.map(symptom => {
        const active = symptoms.includes(symptom.id);
        const sevColors = { mild: "#eab308", moderate: "#f97316", severe: "#ef4444" };
        return (
          <button
            key={symptom.id}
            onClick={() => onToggle(symptom.id)}
            className={`p-3 rounded-xl text-left transition-all border ${
              active ? 'bg-slate-700/60 border-slate-500' : 'bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{symptom.icon}</span>
              <div>
                <p className="text-xs font-medium text-slate-200">{symptom.label}</p>
                <p className="text-[9px]" style={{ color: sevColors[symptom.severity] }}>{symptom.severity}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ExposureTimeline({ currentAQI }) {
  // Simulated 24-hour exposure timeline
  const hours = Array.from({ length: 24 }, (_, i) => {
    const baseAQI = currentAQI;
    const variation = Math.sin(i / 3) * 20 + (Math.random() - 0.5) * 15;
    return Math.max(0, Math.round(baseAQI + variation));
  });

  const maxAQI = Math.max(...hours);

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
      <p className="text-sm font-semibold text-slate-200 mb-3">24-Hour Exposure Timeline</p>
      <div className="flex items-end gap-1 h-24">
        {hours.map((aqi, i) => {
          const cat = getAQICategory(aqi);
          const height = maxAQI > 0 ? (aqi / maxAQI) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${i}:00 — AQI ${aqi}`}>
              <div className="w-full rounded-t transition-all hover:opacity-80"
                   style={{ height: `${height}%`, backgroundColor: cat.color, minHeight: 2 }} />
              {i % 6 === 0 && <span className="text-[8px] text-slate-500">{i}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-slate-500">
        <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function HealthImpactDashboard({ currentAQI = 85, cityName = "Your City" }) {
  const [symptoms, setSymptoms] = useState([]);
  const [hoursOutdoor, setHoursOutdoor] = useState(2);
  const [activeTab, setActiveTab] = useState("overview");

  const category = getAQICategory(currentAQI);
  const activityLevel = getActivityLevel(currentAQI);
  const activity = HEALTHY_ACTIVITIES[activityLevel];
  const healthScore = getHealthScore(currentAQI, symptoms);
  const exposureRisk = calculateExposureRisk(currentAQI, hoursOutdoor, "outdoor");

  const toggleSymptom = useCallback((id) => {
    setSymptoms(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  const relevantRecommendations = useMemo(() => {
    const recs = [...RECOMMENDATIONS.general];
    if (currentAQI > 50) recs.push(...RECOMMENDATIONS.respiratory);
    return recs.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return (order[a.priority] || 3) - (order[b.priority] || 3);
    }).slice(0, 8);
  }, [currentAQI]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "health", label: "Health Effects", icon: "🏥" },
    { id: "tracker", label: "Symptom Tracker", icon: "📝" },
    { id: "recommendations", label: "Advice", icon: "💡" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              🏥 Health Impact Dashboard
            </h1>
            <p className="text-sm text-slate-400">Air quality health assessment for {cityName}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
               style={{ backgroundColor: category.bg, color: category.color }}>
            <span>{category.icon}</span> AQI {currentAQI} — {category.label}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/40 rounded-xl p-1 border border-slate-700/30 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Overview Tab ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon="🌍" label="Current AQI" value={currentAQI} color={category.color} subtext={category.label} />
              <StatCard icon="🏥" label="Health Score" value={`${healthScore}/100`} color={healthScore >= 70 ? "#22c55e" : "#f97316"} subtext="Based on AQI + symptoms" />
              <StatCard icon="⚠️" label="Exposure Risk" value={`${exposureRisk}%`} color={exposureRisk > 50 ? "#ef4444" : "#eab308"} subtext={`${hoursOutdoor}h outdoor`} />
              <StatCard icon={activity.icon} label="Activity Level" value={activityLevel.charAt(0).toUpperCase() + activityLevel.slice(1)} color={category.color} subtext={activity.message} />
              <StatCard icon="🌡️" label="Risk Level" value={category.risk} color={category.color} subtext="Population guidance" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AQI Gauge */}
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 flex flex-col items-center">
                <p className="text-sm font-semibold text-slate-200 mb-2">Air Quality Index</p>
                <AQIGauge aqi={currentAQI} />
                <p className="text-xs text-slate-400 mt-2 text-center">{category.population}</p>
              </div>

              {/* Health Score */}
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 flex flex-col items-center">
                <p className="text-sm font-semibold text-slate-200 mb-2">Personal Health Score</p>
                <HealthScoreRing score={healthScore} />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  {healthScore >= 80 ? "Excellent — minimal health risk" :
                   healthScore >= 60 ? "Good — some precautions advised" :
                   healthScore >= 40 ? "Fair — limit outdoor exposure" :
                   "Poor — take immediate precautions"}
                </p>
                {symptoms.length > 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">{symptoms.length} symptom(s) reported</p>
                )}
              </div>

              {/* Activity Guide */}
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-200 mb-3">Today's Activity Guide</p>
                <div className="text-center mb-4">
                  <span className="text-5xl">{activity.icon}</span>
                  <p className="text-sm text-slate-300 mt-2">{activity.message}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Outdoor Exercise</span>
                    <span className={activity.exercise ? "text-emerald-400" : "text-red-400"}>
                      {activity.exercise ? "✅ Safe" : "❌ Avoid"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Outdoor Activities</span>
                    <span className={activity.outdoor ? "text-emerald-400" : "text-red-400"}>
                      {activity.outdoor ? "✅ OK" : "❌ Stay Indoors"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Air Purifier</span>
                    <span className={currentAQI > 100 ? "text-amber-400" : "text-emerald-400"}>
                      {currentAQI > 100 ? "⚠️ Recommended" : "✅ Not needed"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Mask Required</span>
                    <span className={currentAQI > 150 ? "text-red-400" : "text-emerald-400"}>
                      {currentAQI > 150 ? "😷 N95 Required" : "✅ Not needed"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exposure Timeline */}
            <ExposureTimeline currentAQI={currentAQI} />

            {/* Outdoor Hours Slider */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-200 mb-3">⏱️ Exposure Calculator</p>
              <p className="text-xs text-slate-400 mb-3">Adjust your outdoor hours to see how exposure affects your health risk.</p>
              <div className="flex items-center gap-4">
                <input type="range" min="0" max="12" step="0.5" value={hoursOutdoor}
                       onChange={(e) => setHoursOutdoor(parseFloat(e.target.value))}
                       className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <span className="text-lg font-bold text-slate-200 w-16 text-right">{hoursOutdoor}h</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Exposure Risk</span>
                    <span className="font-bold" style={{ color: exposureRisk > 50 ? "#ef4444" : exposureRisk > 25 ? "#f97316" : "#22c55e" }}>
                      {exposureRisk}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${exposureRisk}%`, backgroundColor: exposureRisk > 50 ? "#ef4444" : exposureRisk > 25 ? "#f97316" : "#22c55e" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Health Effects Tab ═══ */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-200 mb-2">Pollutant Health Effects</p>
              <p className="text-xs text-slate-400 mb-4">Click a pollutant to see detailed health impacts and vulnerable populations.</p>
            </div>
            <div className="space-y-3">
              {HEALTH_EFFECTS.map((pollutant, i) => (
                <PollutantCard key={i} pollutant={pollutant} aqi={currentAQI} hours={hoursOutdoor} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ Symptom Tracker Tab ═══ */}
        {activeTab === "tracker" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-200 mb-2">📝 Symptom Tracker</p>
              <p className="text-xs text-slate-400 mb-4">Select any symptoms you're currently experiencing. This helps personalize your health score and recommendations.</p>
              <SymptomTracker symptoms={symptoms} onToggle={toggleSymptom} />
            </div>

            {symptoms.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-5">
                <p className="text-sm font-semibold text-amber-300 mb-2">⚠️ Symptom Advisory</p>
                <div className="space-y-2">
                  {symptoms.map(id => {
                    const symptom = SYMPTOM_OPTIONS.find(s => s.id === id);
                    if (!symptom) return null;
                    const severityAdvice = {
                      mild: "Monitor symptoms. If they persist or worsen, reduce outdoor exposure.",
                      moderate: "Reduce outdoor exposure immediately. If symptoms worsen, seek medical attention.",
                      severe: "Seek medical attention immediately. This could indicate a serious health effect from air pollution.",
                    };
                    return (
                      <div key={id} className="flex items-start gap-2">
                        <span className="text-sm">{symptom.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{symptom.label}</p>
                          <p className="text-[11px] text-slate-400">{severityAdvice[symptom.severity]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {symptoms.length === 0 && (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-700/40 rounded-2xl">
                <span className="text-4xl mb-3 block">✅</span>
                <p className="text-slate-400">No symptoms reported — that's great!</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Recommendations Tab ═══ */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-200 mb-2">💡 Personalized Health Recommendations</p>
              <p className="text-xs text-slate-400">Advice based on current AQI level ({currentAQI}) and your health profile.</p>
            </div>

            <div className="space-y-3">
              {relevantRecommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} index={i} />
              ))}
            </div>

            {/* Vulnerable Groups Advisory */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-200 mb-3">👥 Vulnerable Groups Advisory</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { group: "Children", icon: "👶", advice: "Children breathe faster and are more active, inhaling more pollutants per pound of body weight." },
                  { group: "Elderly", icon: "👴", advice: "Age-related decline in immune and respiratory function increases vulnerability." },
                  { group: "Pregnant Women", icon: "🤰", advice: "Air pollution exposure linked to low birth weight and preterm delivery." },
                  { group: "Respiratory Conditions", icon: "🫁", advice: "Asthma, COPD patients experience more frequent and severe symptoms." },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-slate-800/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.icon}</span>
                      <p className="text-xs font-semibold text-slate-200">{item.group}</p>
                    </div>
                    <p className="text-[11px] text-slate-400">{item.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
