import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  PRESET_SCENARIOS,
  DEFAULT_SCENARIO_ID,
  buildScenarioComparison,
} from "../utils/scenarioModel";

/** EV adoption slider bounds, in percent. */
const EV_MIN = 5;
const EV_MAX = 100;
const EV_STEP = 5;
const EV_DEFAULT = 30;

/**
 * "What-If" scenario simulator.
 *
 * The arithmetic lives in `src/utils/scenarioModel.js`; this file is the chrome
 * around it. The one rule worth restating here: a pollutant with no reading is
 * named as missing and left off the chart. It is never given a stand-in value —
 * the chart's red bar is labelled "Current Baseline", and a bar under that label
 * has to be a measurement.
 *
 * @param {{ current?: any, cityName?: string }} params
 */
export default function ScenarioSimulator({ current, cityName }) {
  const { t } = useTranslation();
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEFAULT_SCENARIO_ID);
  const [customEvPct, setCustomEvPct] = useState(EV_DEFAULT);
  const evSliderId = useId();

  const { scenario, rows, measuredRows, missingRows, hasAnyReading } = useMemo(
    () => buildScenarioComparison({ current, scenarioId: selectedScenarioId, evPct: customEvPct }),
    [current, selectedScenarioId, customEvPct]
  );

  const baselineLabel = t("scenarioSimulator.chartBaseline", "Current Baseline");
  const simulatedLabel = t("scenarioSimulator.chartSimulated", "Simulated Level");

  const chartData = measuredRows.map((row) => ({
    pollutant: t(row.labelKey, row.labelFallback),
    [baselineLabel]: row.baseline,
    [simulatedLabel]: row.simulated,
  }));

  const missingNames = missingRows.map((row) => t(row.nameKey, row.nameFallback));

  return (
    <article
      className="chart-card scenario-simulator-card"
      data-testid="scenario-simulator"
      style={{ gridColumn: "1 / -1", width: "100%" }}
    >
      {/* Distinct keyboard focus styling for the controls in this card. */}
      <style>{`
        .accessible-scenario-btn:focus-visible,
        .accessible-slider:focus-visible {
          outline: 3px solid var(--brand, #0d9488) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.3) !important;
        }
      `}</style>

      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>{t("scenarioSimulator.headingV2", "🔮 Interactive \"What-If\" Scenario Simulator")}</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted, #94a3b8)", margin: "0.25rem 0 0 0" }}>
          {t("scenarioSimulator.subtitleV2", "Simulate community policies and habits to visualize expected pollutant reductions.")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

        {/* Left Column: Preset Buttons & Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            role="group"
            aria-label={t("scenarioSimulator.presetsTitle", "Intervention presets")}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}
          >
            {PRESET_SCENARIOS.map((preset) => {
              const isSelected = preset.id === selectedScenarioId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="accessible-scenario-btn"
                  // The selected state was carried only by a border colour, which is
                  // not a channel assistive tech can read.
                  aria-pressed={isSelected}
                  onClick={() => setSelectedScenarioId(preset.id)}
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
                    {t(`scenarioSimulator.scenarios.${preset.id}.title`, preset.title)}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted, #94a3b8)", lineHeight: "1.3" }}>
                    {t(`scenarioSimulator.scenarios.${preset.id}.description`, preset.description)}
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
                {/* A real <label> rather than a <span>, so the slider has a name. */}
                <label htmlFor={evSliderId}>
                  {t("scenarioSimulator.evSliderLabel", "Adjust Citywide EV Fleet Adoption:")}
                </label>
                <span style={{ color: "var(--brand, #2dd4bf)", fontWeight: "bold" }}>
                  {t("scenarioSimulator.evPct", "{{pct}}% EVs", { pct: customEvPct })}
                </span>
              </div>
              <input
                id={evSliderId}
                type="range"
                min={EV_MIN}
                max={EV_MAX}
                step={EV_STEP}
                value={customEvPct}
                aria-valuetext={t("scenarioSimulator.evPct", "{{pct}}% EVs", { pct: customEvPct })}
                onChange={(e) => setCustomEvPct(Number(e.target.value))}
                className="accessible-slider"
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--brand, #0d9488)" }}
              />
            </div>
          )}
        </div>

        {/* Right Column: Impact Badges & Visualizer Chart */}
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
            {rows.map((row) => (
              <div key={row.field} style={{ fontSize: "0.85rem", color: "var(--ink, #f8fafc)" }}>
                <strong>{t(row.reductionLabelKey, row.reductionLabelFallback)}</strong>{" "}
                <span style={{ color: "#22c55e", fontWeight: "bold" }}>-{row.reductionPct}%</span>
              </div>
            ))}
            <div style={{ fontSize: "0.82rem", color: "var(--muted, #94a3b8)", flex: "1 1 100%" }}>
              💡 {t(`scenarioSimulator.scenarios.${scenario.id}.details`, scenario.details)}
            </div>
          </div>

          {missingNames.length > 0 && (
            <p
              data-testid="scenario-missing-notice"
              role="status"
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted, #94a3b8)",
                borderLeft: "3px solid var(--line, #334155)",
                paddingLeft: "0.75rem",
              }}
            >
              {t(
                "scenarioSimulator.missingReadings",
                "No current reading for {{pollutants}}{{location}}, so it is left off the chart rather than estimated.",
                {
                  pollutants: missingNames.join(", "),
                  location: cityName ? ` in ${cityName}` : "",
                }
              )}
            </p>
          )}

          {hasAnyReading ? (
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
                  <Bar dataKey={baselineLabel} fill="#ef4444" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                  <Bar dataKey={simulatedLabel} fill="#22c55e" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p
              data-testid="scenario-no-readings"
              role="status"
              style={{ fontSize: "0.85rem", color: "var(--muted, #94a3b8)", margin: 0 }}
            >
              {t(
                "scenarioSimulator.noReadings",
                "Live PM2.5 and NO₂ readings aren't available right now, so there is nothing to simulate against. The scenario percentages above still apply once a reading comes in."
              )}
            </p>
          )}

          {/* A text equivalent of the chart. The bars alone are colour-coded only,
              and a screen reader gets nothing out of an SVG of rectangles. */}
          {hasAnyReading && (
            <table
              data-testid="scenario-comparison-table"
              style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}
            >
              <caption style={{ captionSide: "bottom", color: "var(--muted, #94a3b8)", paddingTop: "0.5rem", textAlign: "left" }}>
                {t("scenarioSimulator.compareResultsTitle", "City simulation results")}
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left" }}>{t("scenarioSimulator.tablePollutant", "Pollutant")}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t("scenarioSimulator.tableBefore", "Before")}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t("scenarioSimulator.tableAfter", "After")}</th>
                </tr>
              </thead>
              <tbody>
                {measuredRows.map((row) => (
                  <tr key={row.field}>
                    <th scope="row" style={{ textAlign: "left", fontWeight: 500 }}>{t(row.nameKey, row.nameFallback)}</th>
                    <td style={{ textAlign: "right" }}>{row.baseline} µg/m³</td>
                    <td style={{ textAlign: "right" }}>{row.simulated} µg/m³</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </article>
  );
}
