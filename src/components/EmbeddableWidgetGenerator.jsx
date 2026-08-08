import { useState } from "react";

export default function EmbeddableWidgetGenerator({ cityName = "Delhi", lat = 28.6139, lon = 77.209, currentAqi = 113 }) {
  const [theme, setTheme] = useState("dark");
  const [size, setSize] = useState("medium");
  const [showPollutants, setShowPollutants] = useState(true);
  const [copied, setCopied] = useState(false);

  // Determine widget size dimensions
  const getDimensions = () => {
    if (size === "small") return { width: "260px", minHeight: "150px" };
    if (size === "large") return { width: "420px", minHeight: "260px" };
    return { width: "340px", minHeight: "210px" }; // medium
  };

  const dimensions = getDimensions();

  // Generate embed snippet for third-party websites
  const embedSnippet = `<div id="pollution-hub-widget" data-city="${cityName}" data-lat="${lat}" data-lon="${lon}" data-theme="${theme}" data-size="${size}"></div>\n<script src="https://pollution-control-hub.vercel.app/widget.js" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for AQI status color
  const getAqiStatus = (aqi) => {
    if (aqi <= 50) return { status: "Good", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
    if (aqi <= 100) return { status: "Moderate", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    if (aqi <= 150) return { status: "Unhealthy (Sensitive)", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" };
    return { status: "Unhealthy", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
  };

  const aqiInfo = getAqiStatus(currentAqi);

  return (
    <section data-testid="embeddable-widget-page" className="panel widget-generator-panel" style={{ width: "100%" }}>
      <div className="panel-head" style={{ marginBottom: "1.75rem" }}>
        <h2>🌐 Embeddable AQI Widget Generator</h2>
        <p style={{ color: "var(--muted, #94a3b8)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
          Customize and embed a real-time live air quality badge on your own blog, dashboard, or website.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2rem", alignItems: "stretch" }}>
        
        {/* Left Column: Settings & Code Generator */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              background: "var(--card, #1e293b)",
              padding: "1.5rem",
              borderRadius: "12px",
              border: "1px solid var(--line, #334155)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
            }}
          >
            <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.05rem", color: "var(--ink, #f8fafc)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ⚙️ Customize Widget
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted, #94a3b8)", marginBottom: "0.4rem", fontWeight: "600" }}>
                  Widget Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid var(--line, #334155)",
                    background: "var(--bg-card-alt, #0f172a)",
                    color: "var(--ink, #fff)",
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="dark">🌙 Dark Mode</option>
                  <option value="light">☀️ Light Mode</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted, #94a3b8)", marginBottom: "0.4rem", fontWeight: "600" }}>
                  Widget Preset Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid var(--line, #334155)",
                    background: "var(--bg-card-alt, #0f172a)",
                    color: "var(--ink, #fff)",
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="small">Compact (260 × 150px)</option>
                  <option value="medium">Standard (340 × 210px)</option>
                  <option value="large">Detailed (420 × 260px)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginTop: "0.25rem" }}>
                <input
                  type="checkbox"
                  id="pollutants-toggle"
                  checked={showPollutants}
                  onChange={(e) => setShowPollutants(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--brand, #0d9488)" }}
                />
                <label htmlFor="pollutants-toggle" style={{ fontSize: "0.88rem", cursor: "pointer", color: "var(--ink, #f8fafc)", userSelect: "none" }}>
                  Show Pollutant Breakdown (PM2.5, NO2)
                </label>
              </div>
            </div>
          </div>

          {/* Code Box */}
          <div
            style={{
              background: "var(--card, #1e293b)",
              padding: "1.5rem",
              borderRadius: "12px",
              border: "1px solid var(--line, #334155)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--ink, #f8fafc)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                📋 HTML Embed Code
              </h4>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: copied ? "#22c55e" : "var(--brand, #0d9488)",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {copied ? "✓ Copied Code!" : "Copy HTML"}
              </button>
            </div>

            <pre
              style={{
                background: "#090d16",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid var(--line, #1e293b)",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "#38bdf8",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0,
                lineHeight: "1.5"
              }}
            >
              {embedSnippet}
            </pre>
          </div>
        </div>

        {/* Right Column: Centered Live Widget Preview */}
        <div
          style={{
            background: "var(--card, #1e293b)",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid var(--line, #334155)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "340px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--muted, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            👁️ Live Preview
          </div>

          {/* Rendered Standalone Mock Widget Box */}
          <div
            style={{
              width: dimensions.width,
              minHeight: dimensions.minHeight,
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
              border: `2px solid ${aqiInfo.color}`,
              borderRadius: "16px",
              padding: "1.4rem",
              boxShadow: `0 12px 30px -5px ${theme === "dark" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.15)"}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", letterSpacing: "0.02em", opacity: 0.9, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  📍 {cityName}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                    backgroundColor: aqiInfo.bg,
                    color: aqiInfo.color,
                    fontWeight: "bold",
                    border: `1px solid ${aqiInfo.color}`
                  }}
                >
                  {aqiInfo.status}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginTop: "1rem" }}>
                <span style={{ fontSize: "3.2rem", fontWeight: "900", lineHeight: "1", color: aqiInfo.color, letterSpacing: "-0.02em" }}>
                  {currentAqi}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", opacity: 0.6 }}>US AQI</span>
              </div>
            </div>

            {showPollutants && (
              <div
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  marginTop: "1.25rem",
                  paddingTop: "0.85rem",
                  borderTop: `1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"}`,
                  fontSize: "0.8rem"
                }}
              >
                <div>
                  <span style={{ opacity: 0.6 }}>PM2.5:</span> <strong style={{ marginLeft: "0.2rem" }}>35 µg/m³</strong>
                </div>
                <div>
                  <span style={{ opacity: 0.6 }}>NO2:</span> <strong style={{ marginLeft: "0.2rem" }}>28 µg/m³</strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: "1rem", fontSize: "0.68rem", opacity: 0.4, textAlign: "right", fontWeight: "500" }}>
              Powered by Pollution Control Hub
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
