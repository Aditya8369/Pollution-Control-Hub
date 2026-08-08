import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// Pre-set guided scenarios with impact formulas
const PRESET_SCENARIOS = [
  {
    id: "ev_transition",
    title: "⚡ 30% EV Adoption",
    description: "Replace 30% of fossil-fuel vehicles on city roads with zero-emission EVs.",
    no2ReductionPct: 25,
    pm25ReductionPct: 15,
    details: "Dramatically lowers tailpipe combustion NO₂ emissions and reduces brake dust PM2.5."
  },
  {
    id: "urban_canopy",
    title: "🌳 20% Green Canopy",
    description: "Expand city tree cover, rooftop gardens, and urban parks by 20%.",
    no2ReductionPct: 10,
    pm25ReductionPct: 20,
    details: "Leaves and vegetation trap airborne fine particulate matter and absorb gaseous pollutants."
  },
  {
    id: "industrial_scrubbers",
    title: "🏭 Emission Controls",
    description: "Mandate advanced particulate scrubbers across nearby factories and power plants.",
    no2ReductionPct: 35,
    pm25ReductionPct: 40,
    details: "Targeted stack filtration cuts bulk industrial PM2.5 and atmospheric nitrogen oxides."
  },
  {
    id: "renewable_grid",
    title: "☀️ 50% Clean Energy",
    description: "Transition half of the regional electricity grid to clean renewable energy sources.",
    no2ReductionPct: 30,
    pm25ReductionPct: 25,
    details: "Phases out coal and gas thermal generation, drastically cleaning regional air sheds."
  }
];

export default function ScenarioSimulator({ current }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(PRESET_SCENARIOS[0].id);
  const [customEvPct, setCustomEvPct] = useState(30);
  
  const currentPm25 = current?.pm2_5 || 35;
  const currentNo2 = current?.nitrogen_dioxide || 28;

  const activeScenario = useMemo(
    () => PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0],
    [selectedScenarioId]
  );

  const { simulatedPm25, simulatedNo2, no2Drop, pm25Drop } = useMemo(() => {
    let no2Red = activeScenario.no2ReductionPct;
    let pm25Red = activeScenario.pm25ReductionPct;

    if (activeScenario.id === "ev_transition") {
      no2Red = Math.round((customEvPct / 30) * 25);
      pm25Red = Math.round((customEvPct / 30) * 15);
    }

    const simNo2 = Math.max(2, Number((currentNo2 * (1 - no2Red / 100)).toFixed(1)));
    const simPm25 = Math.max(2, Number((currentPm25 * (1 - pm25Red / 100)).toFixed(1)));

    return {
      simulatedNo2: simNo2,
      simulatedPm25: simPm25,
      no2Drop: no2Red,
      pm25Drop: pm25Red
    };
  }, [activeScenario, customEvPct, currentNo2, currentPm25]);

  const chartData = [
    {
      pollutant: "PM2.5 (µg/m³)",
      Baseline: Number(currentPm25.toFixed(1)),
      Simulated: simulatedPm25
    },
    {
      pollutant: "NO₂ (µg/m³)",
      Baseline: Number(currentNo2.toFixed(1)),
      Simulated: simulatedNo2
    }
  ];

  return (
    <article className="chart-card scenario-simulator-card" style={{ gridColumn: "1 / -1", width: "100%" }}>
      {/* NEW: Accessibility CSS injected here for distinct keyboard focus styling */}
      <style>{`
        .accessible-scenario-btn:focus-visible,
        .accessible-slider:focus-visible {
          outline: 3px solid var(--brand, #0d9488) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.3) !important;
        }
      `}</style>

      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>🔮 Interactive "What-If" Scenario Simulator</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted, #94a3b8)", margin: "0.25rem 0 0 0" }}>
          Simulate community policies and habits to visualize expected pollutant reductions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Left Column: Preset Buttons & Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {PRESET_SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === selectedScenarioId;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className="accessible-scenario-btn"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid var(--brand, #0d9488)" : "1px solid var(--line, #334155)",
                    background: isSelected ? "rgba(13, 148, 136, 0.15)" : "var(--bg-card-alt, rgba(255, 255, 255, 0.03))",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "0.88rem",
                      color: isSelected ? "var(--brand, #2dd4bf)" : "var(--ink, #f8fafc)",
                      marginBottom: "0.2rem"
                    }}
                  >
                    {scenario.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted, #94a3b8)", lineHeight: "1.3" }}>
                    {scenario.description}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedScenarioId === "ev_transition" && (
            <div
              style={{
                background: "var(--bg-card-alt, rgba(255,255,255,0.03))",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--line, #334155)",
                marginTop: "0.25rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--ink, #f8fafc)" }}>
                <span>Adjust Citywide EV Fleet Adoption:</span>
                <span style={{ color: "var(--brand, #2dd4bf)", fontWeight: "bold" }}>{customEvPct}% EVs</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={customEvPct}
                onChange={(e) => setCustomEvPct(Number(e.target.value))}
                className="accessible-slider"
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--brand, #0d9488)" }}
              />
            </div>
          )}
        </div>

        {/* Right Column: Impact Badges & Animated Visualizer Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
              padding: "0.85rem 1rem",
              background: "rgba(13, 148, 136, 0.1)",
              borderRadius: "8px",
              borderLeft: "4px solid var(--brand, #0d9488)"
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--ink, #f8fafc)" }}>
              <strong>NO₂ Reduction:</strong> <span style={{ color: "#22c55e", fontWeight: "bold" }}>-{no2Drop}%</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--ink, #f8fafc)" }}>
              <strong>PM2.5 Reduction:</strong> <span style={{ color: "#22c55e", fontWeight: "bold" }}>-{pm25Drop}%</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted, #94a3b8)", flex: "1 1 100%" }}>
              💡 {activeScenario.details}
            </div>
          </div>

          <div style={{ width: "100%", height: 260, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #334155)" />
                <XAxis dataKey="pollutant" tick={{ fontSize: 12, fontWeight: "bold", fill: "var(--ink, #f8fafc)" }} />
                <YAxis tick={{ fill: "var(--muted, #94a3b8)" }} />
                <Tooltip
                  formatter={(val) => [`${val} µg/m³`]}
                  contentStyle={{ background: "var(--card, #1e293b)", border: "1px solid var(--line, #334155)", color: "var(--ink, #fff)" }}
                />
                <Legend wrapperStyle={{ color: "var(--ink, #f8fafc)" }} />
                <Bar dataKey="Baseline" name="Current Baseline" fill="#ef4444" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                <Bar dataKey="Simulated" name="Simulated Level" fill="#22c55e" radius={[6, 6, 0, 0]} isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </article>
  );
}
