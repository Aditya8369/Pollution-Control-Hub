import { useState } from "react";

// Activity type definitions with pollution intake multipliers
const ACTIVITIES = [
  { id: "indoor_purified", label: "🏠 Indoors (with Air Purifier)", multiplier: 0.3, description: "Lowest intake, filtered air" },
  { id: "indoor_standard", label: "🏢 Indoors (Standard / Office / Home)", multiplier: 0.7, description: "Moderate protection from ambient air" },
  { id: "outdoor_walking", label: "🚶 Outdoor Walking / Light Activity", multiplier: 1.5, description: "Higher respiration rate outdoors" },
  { id: "commute_transit", label: "🚗 Traffic Commute (Car / Bus / Auto)", multiplier: 2.5, description: "Direct exposure to vehicle exhaust spikes" },
  { id: "outdoor_exercise", label: "🏃 Outdoor Exercise / Jogging / Cycling", multiplier: 3.5, description: "Heavy breathing drastically increases particulate intake" },
];

const WHO_DAILY_EXPOSURE_LIMIT = 360; // Equivalent benchmark for safe 24h exposure at WHO PM2.5 baseline

export default function ExposureCalculator({ currentAqi = 100 }) {
  const [activities, setActivities] = useState([
    { id: 1, type: "indoor_purified", hours: 8 },
    { id: 2, type: "indoor_standard", hours: 10 },
    { id: 3, type: "commute_transit", hours: 1 },
    { id: 4, type: "outdoor_exercise", hours: 1 },
  ]);

  const [newActivityType, setNewActivityType] = useState("outdoor_walking");
  const [newHours, setNewHours] = useState(1);

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (newHours <= 0) return;
    setActivities((prev) => [
      ...prev,
  { id: crypto.randomUUID(), type: newActivityType, hours: Number(newHours) },
]);
  setNewHours(1);
  };

  const handleRemoveActivity = (id) => {
    setActivities((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculate total logged hours and total weighted exposure score
  const totalLoggedHours = activities.reduce((sum, item) => sum + item.hours, 0);

  const totalExposureScore = Math.round(
    activities.reduce((sum, item) => {
      const actDef = ACTIVITIES.find((a) => a.id === item.type) || ACTIVITIES[1];
      return sum + item.hours * actDef.multiplier * currentAqi;
    }, 0)
  );

  const pctOfSafeLimit = Math.round((totalExposureScore / WHO_DAILY_EXPOSURE_LIMIT) * 100);

  const getSeverityPill = (score) => {
    if (score <= WHO_DAILY_EXPOSURE_LIMIT) return { label: "SAFE EXPOSURE", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
    if (score <= WHO_DAILY_EXPOSURE_LIMIT * 2) return { label: "MODERATE RISK", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    return { label: "HIGH EXPOSURE RISK", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
  };

  const severity = getSeverityPill(totalExposureScore);

  return (
    <section data-testid="exposure-calculator-page" className="panel exposure-calculator-panel">
      <div className="panel-head" style={{ marginBottom: "1.5rem" }}>
        <h2>🧮 Personal Exposure Calculator</h2>
        <p>Log your daily activities to calculate your cumulative pollution intake score based on ambient AQI ({currentAqi}).</p>
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
          <h3 style={{ margin: 0, fontSize: "2rem", color: "var(--ink, #f8fafc)" }}>
            {totalExposureScore} <span style={{ fontSize: "1rem", color: "var(--muted)" }}>exposure pts</span>
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Total Logged: <strong>{totalLoggedHours} / 24 hrs</strong>
          </p>
        </div>

        <div style={{ textAlign: "right", minWidth: "180px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.25rem" }}>vs. Safe Benchmark</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: severity.color }}>
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

      {/* Activity Entry Form & Logged List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Form */}
        <div style={{ background: "var(--card)", padding: "1.25rem", borderRadius: "0.5rem", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Add Activity Routine</h3>
          <form onSubmit={handleAddActivity} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>Activity Type</label>
              <select
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
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>Duration (Hours)</label>
              <input
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
                const actDef = ACTIVITIES.find((a) => a.id === item.type) || ACTIVITIES[1];
                const itemPoints = Math.round(item.hours * actDef.multiplier * currentAqi);

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
                      <span style={{ fontWeight: "bold", color: "var(--brand)", fontSize: "0.95rem" }}>+{itemPoints} pts</span>
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
