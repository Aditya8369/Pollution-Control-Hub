import { useMemo, useState } from "react";
import {
  ACTIVITIES,
  HOURS_IN_DAY,
  SAFE_DAILY_EXPOSURE,
  WHO_PM25_24H_GUIDELINE,
  calculateExposure,
  getActivity,
} from "../utils/exposureModel";

export default function ExposureCalculator({ currentAqi = 100 }) {
  // Adds up to a full 24 hours. The previous default totalled 20, while the summary
  // underneath it has always been labelled "/ 24 hrs".
  const [activities, setActivities] = useState([
    { id: 1, type: "indoor_purified", hours: 8 },
    { id: 2, type: "indoor_standard", hours: 14 },
    { id: 3, type: "commute_transit", hours: 1 },
    { id: 4, type: "outdoor_exercise", hours: 1 },
  ]);

  const [newActivityType, setNewActivityType] = useState("outdoor_walking");
  const [newHours, setNewHours] = useState(1);

  const handleAddActivity = (e) => {
    e.preventDefault();
    const hours = Number(newHours);
    if (!Number.isFinite(hours) || hours <= 0) return;
    setActivities((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: newActivityType, hours },
    ]);
    setNewHours(1);
  };

  const handleRemoveActivity = (id) => {
    setActivities((prev) => prev.filter((item) => item.id !== id));
  };

  // Scored in µg/m³·h against the WHO 24-hour guideline expressed in the same units.
  // The old score multiplied hours by the raw AQI and compared the result to a constant,
  // so the ratio scaled with AQI and a clean-air day still read "HIGH EXPOSURE RISK".
  const result = useMemo(
    () => calculateExposure(activities, currentAqi),
    [activities, currentAqi]
  );

  const {
    exposure: totalExposureScore,
    ambientPm25,
    totalHours: totalLoggedHours,
    percentOfGuideline: pctOfSafeLimit,
    severity,
    dayCoverage,
  } = result;

  return (
    <section data-testid="exposure-calculator-page" className="panel exposure-calculator-panel">
      <div className="panel-head" style={{ marginBottom: "1.5rem" }}>
        <h2>🧮 Personal Exposure Calculator</h2>
        <p>
          Log your daily activities to estimate your cumulative PM2.5 intake. Ambient AQI{" "}
          {currentAqi} corresponds to about <strong>{ambientPm25} µg/m³</strong> of PM2.5.
        </p>
      </div>

      {/* Summary Score Card */}
      <div
        className="kpi-card"
        style={{
          background: "linear-gradient(135deg, var(--card, #1e293b), var(--bg-card-alt, #0f172a))",
          border: `2px solid ${severity.color}`,
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem"
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              backgroundColor: severity.bg,
              color: severity.color,
              fontWeight: "bold",
              fontSize: "0.8rem",
              marginBottom: "0.5rem"
            }}
          >
            {severity.label}
          </span>
          <h3 data-testid="exposure-score" style={{ margin: 0, fontSize: "2rem", color: "var(--ink, #f8fafc)" }}>
            {totalExposureScore} <span style={{ fontSize: "1rem", color: "var(--muted)" }}>µg/m³·h inhaled</span>
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Total Logged: <strong>{totalLoggedHours} / {HOURS_IN_DAY} hrs</strong>
          </p>
          {dayCoverage && (
            <p
              data-testid="exposure-day-coverage"
              style={{ margin: "0.25rem 0 0 0", color: "#f59e0b", fontSize: "0.85rem" }}
            >
              {dayCoverage === "short"
                ? `Your routine covers less than a full day, so this sits below a ${HOURS_IN_DAY}-hour guideline by construction.`
                : `Your routine adds up to more than ${HOURS_IN_DAY} hours.`}
            </p>
          )}
        </div>

        <div style={{ textAlign: "right", minWidth: "180px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            vs. WHO 24h guideline ({SAFE_DAILY_EXPOSURE} µg/m³·h)
          </div>
          <div data-testid="exposure-percent" style={{ fontSize: "1.5rem", fontWeight: "bold", color: severity.color }}>
            {pctOfSafeLimit}%
          </div>
          <div style={{ height: "6px", width: "100%", background: "var(--line)", borderRadius: "3px", overflow: "hidden", marginTop: "0.35rem" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, pctOfSafeLimit)}%`,
                backgroundColor: severity.color,
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "-1rem 0 1.5rem 0" }}>
        Intake is estimated as hours × activity multiplier × ambient PM2.5, giving
        µg/m³·h. The benchmark is the WHO 24-hour PM2.5 guideline of{" "}
        {WHO_PM25_24H_GUIDELINE} µg/m³ sustained for a day ({SAFE_DAILY_EXPOSURE} µg/m³·h).
      </p>

      {/* Activity Entry Form & Logged List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Form */}
        <div style={{ background: "var(--card)", padding: "1.25rem", borderRadius: "0.5rem", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Add Activity Routine</h3>
          <form onSubmit={handleAddActivity} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="exposure-activity-type" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>Activity Type</label>
              <select
                id="exposure-activity-type"
                value={newActivityType}
                onChange={(e) => setNewActivityType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--line)",
                  background: "var(--bg-card, #0f172a)",
                  color: "var(--ink, #fff)",
                  fontSize: "0.9rem"
                }}
              >
                {ACTIVITIES.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.label} ({act.multiplier}x)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exposure-duration" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>Duration (Hours)</label>
              <input
                id="exposure-duration"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={newHours}
                // @ts-ignore
                onChange={(e) => setNewHours(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--line)",
                  background: "var(--bg-card, #0f172a)",
                  color: "var(--ink, #fff)",
                  fontSize: "0.9rem"
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "0.65rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "var(--brand, #0d9488)",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "0.5rem"
              }}
            >
              + Add to Day Routine
            </button>
          </form>
        </div>

        {/* Logged Activities */}
        <div style={{ background: "var(--card)", padding: "1.25rem", borderRadius: "0.5rem", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Logged Activities</h3>
          {activities.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No activities added yet. Add your routine to see your intake score.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {activities.map((item) => {
                const actDef = getActivity(item.type);
                const itemPoints = Math.round(item.hours * actDef.multiplier * ambientPm25);

                return (
                  <li
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem",
                      borderRadius: "0.375rem",
                      background: "var(--bg-card-alt, rgba(0,0,0,0.02))",
                      border: "1px solid var(--line)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--ink)" }}>{actDef.label}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                        {item.hours} hrs × {actDef.multiplier}x multiplier
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: "bold", color: "var(--brand)", fontSize: "0.95rem" }}>+{itemPoints} µg/m³·h</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(item.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: "1.1rem"
                        }}
                        aria-label="Remove activity"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
