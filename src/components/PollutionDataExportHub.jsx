import { useState, useMemo, useCallback, useRef } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPORT_FORMATS = [
  { id: "csv", label: "CSV", icon: "📊", desc: "Comma-separated values for spreadsheets" },
  { id: "json", label: "JSON", icon: "{ }", desc: "Structured data for developers" },
  { id: "pdf", label: "PDF Report", icon: "📄", desc: "Formatted report with charts and analysis" },
  { id: "xlsx", label: "Excel", icon: "📈", desc: "Excel workbook with multiple sheets" },
];

const DATA_CATEGORIES = [
  { id: "aqi", label: "AQI Data", icon: "📊", color: "#3b82f6", fields: ["Timestamp", "AQI", "Category", "Dominant Pollutant", "Station"] },
  { id: "pollutants", label: "Pollutant Levels", icon: "🔬", color: "#ef4444", fields: ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"] },
  { id: "weather", label: "Weather Data", icon: "🌤️", color: "#f59e0b", fields: ["Temperature", "Humidity", "Wind Speed", "Wind Direction", "Pressure"] },
  { id: "health", label: "Health Advisories", icon: "🏥", color: "#10b981", fields: ["Advisory Level", "Affected Groups", "Recommendations", "Duration"] },
  { id: "sources", label: "Source Analysis", icon: "🏭", color: "#8b5cf6", fields: ["Source Type", "Contribution %", "Trend", "Location"] },
  { id: "alerts", label: "Alert History", icon: "🔔", color: "#ec4899", fields: ["Alert Type", "Severity", "Duration", "Resolution", "Impact"] },
];

const TIME_RANGES = [
  { id: "1h", label: "Last Hour", hours: 1 },
  { id: "6h", label: "Last 6 Hours", hours: 6 },
  { id: "24h", label: "Last 24 Hours", hours: 24 },
  { id: "7d", label: "Last 7 Days", hours: 168 },
  { id: "30d", label: "Last 30 Days", hours: 720 },
  { id: "90d", label: "Last 90 Days", hours: 2160 },
];

const REPORT_TEMPLATES = [
  { id: "daily", label: "Daily Summary", icon: "📋", description: "24-hour overview with trends and highlights", sections: ["AQI Summary", "Pollutant Breakdown", "Health Advisory", "Source Analysis"] },
  { id: "weekly", label: "Weekly Report", icon: "📊", description: "7-day analysis with comparison charts", sections: ["Weekly Trends", "City Comparison", "Health Impact", "Recommendations"] },
  { id: "monthly", label: "Monthly Analysis", icon: "📈", description: "30-day deep dive with statistical analysis", sections: ["Statistical Summary", "Trend Analysis", "Anomaly Detection", "Forecast Accuracy"] },
  { id: "custom", label: "Custom Report", icon: "🔧", description: "Build your own report with selected sections", sections: ["Select sections below"] },
];

const SAMPLE_DATA = Array.from({ length: 72 }, (_, i) => {
  const time = new Date("2026-08-23T00:00:00").getTime() + i * 3600000;
  const hour = new Date(time).getHours();
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const baseAQI = 75 + (isRush ? 25 : 0) + Math.sin(i / 6) * 15 + (Math.random() - 0.5) * 10;
  const aqi = Math.max(20, Math.min(250, Math.round(baseAQI)));

  return {
    timestamp: new Date(time).toISOString(),
    timeLabel: new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    aqi,
    category: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy (SG)" : "Unhealthy",
    pm25: Math.round(aqi * 0.45 + (Math.random() - 0.5) * 8),
    pm10: Math.round(aqi * 0.8 + (Math.random() - 0.5) * 12),
    o3: Math.round(aqi * 0.35 + (Math.random() - 0.5) * 6),
    no2: Math.round(aqi * 0.25 + (Math.random() - 0.5) * 5),
    so2: Math.round(aqi * 0.08 + (Math.random() - 0.5) * 2),
    co: +(aqi * 0.015 + (Math.random() - 0.5) * 0.3).toFixed(1),
    temp: Math.round(26 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 5 + (Math.random() - 0.5) * 2),
    humidity: Math.round(62 + Math.sin((hour - 14) / 24 * Math.PI * 2) * 12 + (Math.random() - 0.5) * 4),
    windSpeed: +(6 + Math.sin(i / 8) * 3 + (Math.random() - 0.5) * 2).toFixed(1),
    windDir: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)],
    pressure: Math.round(1013 + Math.sin(i / 36) * 5),
    station: ["Central Station", "Industrial Zone", "Residential Area", "Park Monitor", "Highway Sensor"][Math.floor(Math.random() * 5)],
    dominantPollutant: ["PM2.5", "O3", "NO2", "PM10"][Math.floor(Math.random() * 4)],
  };
});

// ─── Utility Functions ──────────────────────────────────────────────────────

function generateCSV(data, fields) {
  const headers = fields.join(",");
  const rows = data.map((row) => fields.map((f) => {
    const val = row[f.toLowerCase().replace(/\s+/g, "_")] ?? row[f] ?? "";
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(","));
  return [headers, ...rows].join("\n");
}

function generateJSON(data, fields) {
  return JSON.stringify(data.map((row) => {
    const obj = {};
    fields.forEach((f) => {
      const key = f.toLowerCase().replace(/\s+/g, "_");
      obj[key] = row[key] ?? row[f] ?? null;
    });
    return obj;
  }), null, 2);
}

// ─── Chart Components ───────────────────────────────────────────────────────

function MiniSparkline({ values, color = "#3b82f6", width = 120, height = 32 }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const getX = (i) => (i / (values.length - 1)) * width;
  const getY = (v) => height - 4 - ((v - min) / range) * (height - 8) + 2;
  const pathD = values.map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(v)}`).join(" ");
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={getX(values.length - 1)} cy={getY(values[values.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

function DataPreviewChart({ data, field, color = "#3b82f6", width = 600, height = 150 }) {
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const values = data.map((d) => d[field]);
  const maxVal = Math.max(...values) * 1.1;
  const minVal = Math.min(...values) * 0.9;

  const getX = (i) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v) => padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[field])}`).join(" ");
  const areaD = `${pathD} L ${getX(data.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`area-${field}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        const val = Math.round(minVal + (maxVal - minVal) * pct);
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padding.left - 5} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="9">{val}</text>
          </g>
        );
      })}
      {/* Area */}
      <path d={areaD} fill={`url(#area-${field})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* First and last points */}
      <circle cx={getX(0)} cy={getY(values[0])} r="3" fill={color} stroke="#0f172a" strokeWidth="1.5" />
      <circle cx={getX(values.length - 1)} cy={getY(values[values.length - 1])} r="3" fill={color} stroke="#0f172a" strokeWidth="1.5" />
      {/* X-axis labels */}
      {[0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor(data.length * 3 / 4), data.length - 1].map((i) => (
        <text key={i} x={getX(i)} y={height - 5} textAnchor="middle" fill="rgba(148,163,184,0.4)" fontSize="8">
          {data[i]?.timeLabel?.split(" ")[2] || ""}
        </text>
      ))}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PollutionDataExportHub() {
  const [activeTab, setActiveTab] = useState("preview");
  const [selectedCategories, setSelectedCategories] = useState(["aqi", "pollutants"]);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [selectedReport, setSelectedReport] = useState("daily");
  const [customSections, setCustomSections] = useState(["aqi_summary", "pollutant_breakdown"]);
  const [previewField, setPreviewField] = useState("aqi");
  const [exportHistory, setExportHistory] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  const filteredData = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.id === selectedTimeRange);
    const hours = range?.hours || 24;
    return SAMPLE_DATA.slice(0, Math.min(hours, SAMPLE_DATA.length));
  }, [selectedTimeRange]);

  const stats = useMemo(() => {
    const aqiValues = filteredData.map((d) => d.aqi);
    return {
      total: filteredData.length,
      avgAQI: Math.round(aqiValues.reduce((s, v) => s + v, 0) / aqiValues.length),
      maxAQI: Math.max(...aqiValues),
      minAQI: Math.min(...aqiValues),
      avgPM25: Math.round(filteredData.reduce((s, d) => s + d.pm25, 0) / filteredData.length),
    };
  }, [filteredData]);

  const selectedFields = useMemo(() => {
    const fields = [];
    selectedCategories.forEach((catId) => {
      const cat = DATA_CATEGORIES.find((c) => c.id === catId);
      if (cat) fields.push(...cat.fields);
    });
    return fields;
  }, [selectedCategories]);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      const fields = selectedFields.length > 0 ? selectedFields : ["Timestamp", "AQI", "Category"];
      let content, filename, mimeType;

      switch (selectedFormat) {
        case "csv":
          content = generateCSV(filteredData, fields);
          filename = `pollution_data_${selectedTimeRange}.csv`;
          mimeType = "text/csv";
          break;
        case "json":
          content = generateJSON(filteredData, fields);
          filename = `pollution_data_${selectedTimeRange}.json`;
          mimeType = "application/json";
          break;
        case "pdf":
          content = `Pollution Data Report\nGenerated: ${new Date().toLocaleString()}\n\nSummary:\n- Total Records: ${stats.total}\n- Average AQI: ${stats.avgAQI}\n- Max AQI: ${stats.maxAQI}\n- Min AQI: ${stats.minAQI}\n\nData included: ${fields.join(", ")}`;
          filename = `pollution_report_${selectedTimeRange}.txt`;
          mimeType = "text/plain";
          break;
        default:
          content = generateCSV(filteredData, fields);
          filename = `pollution_data_${selectedTimeRange}.csv`;
          mimeType = "text/csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportHistory((prev) => [{
        id: Date.now(),
        format: selectedFormat,
        filename,
        records: filteredData.length,
        time: new Date().toLocaleTimeString(),
        status: "success",
      }, ...prev].slice(0, 10));

      setIsExporting(false);
    }, 800);
  }, [filteredData, selectedFields, selectedFormat, selectedTimeRange, stats]);

  const tabs = [
    { id: "preview", label: "Data Preview", icon: "👁️" },
    { id: "export", label: "Export Data", icon: "📥" },
    { id: "reports", label: "Report Builder", icon: "📋" },
    { id: "history", label: "Export History", icon: "🕐" },
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
        <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 8px", background: "linear-gradient(135deg, #3b82f6, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          📥 Pollution Data Export Hub
        </h1>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Preview, export, and generate reports from air quality data</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button key={tab.id} style={{ ...btnStyle(activeTab === tab.id), padding: "10px 20px" }} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ DATA PREVIEW TAB ═══ */}
      {activeTab === "preview" && (
        <div>
          {/* Time Range Selector */}
          <div style={{ ...cardStyle, marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600" }}>Time Range:</span>
            {TIME_RANGES.map((range) => (
              <button key={range.id} style={btnStyle(selectedTimeRange === range.id)} onClick={() => setSelectedTimeRange(range.id)}>
                {range.label}
              </button>
            ))}
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Records", value: stats.total, color: "#3b82f6", icon: "📊" },
              { label: "Average AQI", value: stats.avgAQI, color: "#10b981", icon: "📈" },
              { label: "Max AQI", value: stats.maxAQI, color: "#ef4444", icon: "🔺" },
              { label: "Min AQI", value: stats.minAQI, color: "#06b6d4", icon: "🔻" },
              { label: "Avg PM2.5", value: stats.avgPM25, color: "#f59e0b", icon: "🔬" },
            ].map((stat, i) => (
              <div key={i} style={{ ...cardStyle, textAlign: "center" }}>
                <div style={{ fontSize: "16px", marginBottom: "4px" }}>{stat.icon}</div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Chart Preview */}
          <div style={{ ...cardStyle, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px" }}>📈 Data Visualization</h3>
              <div style={{ display: "flex", gap: "6px" }}>
                {["aqi", "pm25", "o3", "temp", "humidity"].map((field) => (
                  <button key={field} style={btnStyle(previewField === field)} onClick={() => setPreviewField(field)}>
                    {field.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <DataPreviewChart data={filteredData} field={previewField} color={previewField === "aqi" ? "#3b82f6" : previewField === "pm25" ? "#ef4444" : previewField === "o3" ? "#8b5cf6" : previewField === "temp" ? "#f59e0b" : "#06b6d4"} />
          </div>

          {/* Data Table */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📋 Data Table (showing first 20 rows)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Time", "AQI", "Category", "PM2.5", "O3", "NO2", "Temp", "Humidity", "Wind", "Station"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#94a3b8", fontWeight: "600", fontSize: "10px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 20).map((row, i) => {
                    const aqiColor = row.aqi <= 50 ? "#10b981" : row.aqi <= 100 ? "#f59e0b" : row.aqi <= 150 ? "#f97316" : "#ef4444";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "6px 10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{row.timeLabel}</td>
                        <td style={{ padding: "6px 10px", fontWeight: "700", color: aqiColor }}>{row.aqi}</td>
                        <td style={{ padding: "6px 10px" }}>{row.category}</td>
                        <td style={{ padding: "6px 10px", color: "#ef4444" }}>{row.pm25}</td>
                        <td style={{ padding: "6px 10px", color: "#8b5cf6" }}>{row.o3}</td>
                        <td style={{ padding: "6px 10px", color: "#3b82f6" }}>{row.no2}</td>
                        <td style={{ padding: "6px 10px" }}>{row.temp}°C</td>
                        <td style={{ padding: "6px 10px" }}>{row.humidity}%</td>
                        <td style={{ padding: "6px 10px" }}>{row.windSpeed} km/h {row.windDir}</td>
                        <td style={{ padding: "6px 10px", color: "#94a3b8", fontSize: "10px" }}>{row.station}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredData.length > 20 && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280", textAlign: "center" }}>
                Showing 20 of {filteredData.length} records — export for full dataset
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ EXPORT DATA TAB ═══ */}
      {activeTab === "export" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Export Configuration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Format Selection */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📦 Export Format</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {EXPORT_FORMATS.map((format) => (
                  <button key={format.id} style={{ ...btnStyle(selectedFormat === format.id), display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", gap: "4px" }} onClick={() => setSelectedFormat(format.id)}>
                    <span style={{ fontSize: "24px" }}>{format.icon}</span>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>{format.label}</span>
                    <span style={{ fontSize: "9px", color: "#6b7280" }}>{format.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Categories */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📊 Data Categories</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {DATA_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button key={cat.id} style={{ ...btnStyle(isSelected), display: "flex", alignItems: "center", gap: "10px", textAlign: "left", width: "100%" }} onClick={() => {
                      setSelectedCategories((prev) => isSelected ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]);
                    }}>
                      <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: "600" }}>{cat.label}</div>
                        <div style={{ fontSize: "10px", color: "#6b7280" }}>{cat.fields.length} fields</div>
                      </div>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {cat.fields.slice(0, 3).map((f, i) => (
                          <span key={i} style={{ padding: "1px 4px", borderRadius: "3px", background: `${cat.color}20`, fontSize: "8px", color: cat.color }}>{f}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export Button */}
            <button style={{ padding: "16px", borderRadius: "12px", background: isExporting ? "#6b7280" : "#3b82f6", color: "#fff", border: "none", fontSize: "16px", fontWeight: "700", cursor: isExporting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={handleExport} disabled={isExporting}>
              {isExporting ? "⏳ Exporting..." : `📥 Export ${selectedFormat.toUpperCase()} (${filteredData.length} records)`}
            </button>
          </div>

          {/* Preview Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>👁️ Export Preview</h3>
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", fontFamily: "monospace", fontSize: "10px", color: "#10b981", maxHeight: "400px", overflow: "auto", whiteSpace: "pre-wrap" }}>
                {selectedFormat === "csv" && generateCSV(filteredData.slice(0, 5), selectedFields.length > 0 ? selectedFields : ["Timestamp", "AQI", "Category"])}
                {selectedFormat === "json" && generateJSON(filteredData.slice(0, 3), selectedFields.length > 0 ? selectedFields : ["Timestamp", "AQI", "Category"])}
                {(selectedFormat === "pdf" || selectedFormat === "xlsx") && `Report: ${selectedFormat.toUpperCase()}\n\nRecords: ${filteredData.length}\nTime Range: ${TIME_RANGES.find((r) => r.id === selectedTimeRange)?.label}\n\nFields included:\n${selectedFields.map((f) => `  • ${f}`).join("\n")}\n\nStatistics:\n  Avg AQI: ${stats.avgAQI}\n  Max AQI: ${stats.maxAQI}\n  Min AQI: ${stats.minAQI}`}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>📊 Selected Fields ({selectedFields.length})</h3>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {selectedFields.length > 0 ? selectedFields.map((f, i) => (
                  <span key={i} style={{ padding: "3px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontSize: "10px" }}>{f}</span>
                )) : (
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Select categories to include fields</span>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>📋 Export Summary</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                {[
                  { label: "Format", value: selectedFormat.toUpperCase() },
                  { label: "Records", value: filteredData.length },
                  { label: "Fields", value: selectedFields.length },
                  { label: "Time Range", value: TIME_RANGES.find((r) => r.id === selectedTimeRange)?.label },
                  { label: "Est. Size", value: `~${Math.round(JSON.stringify(filteredData).length / 1024)}KB` },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>{item.label}</span>
                    <span style={{ fontWeight: "600" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REPORT BUILDER TAB ═══ */}
      {activeTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Report Templates */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>📋 Report Templates</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {REPORT_TEMPLATES.map((tmpl) => (
                <div key={tmpl.id} style={{ padding: "12px", borderRadius: "10px", background: selectedReport === tmpl.id ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", border: selectedReport === tmpl.id ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }} onClick={() => setSelectedReport(tmpl.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "20px" }}>{tmpl.icon}</span>
                    <span style={{ fontWeight: "700", fontSize: "13px" }}>{tmpl.label}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>{tmpl.description}</div>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {tmpl.sections.map((s, i) => (
                      <span key={i} style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(59,130,246,0.1)", fontSize: "9px", color: "#3b82f6" }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Preview */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>👁️ Report Preview</h3>
            <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "18px" }}>
                  {REPORT_TEMPLATES.find((t) => t.id === selectedReport)?.label || "Report"}
                </h2>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Generated: {new Date().toLocaleDateString()} • {filteredData.length} records</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Summary Section */}
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(59,130,246,0.08)" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "12px", color: "#3b82f6" }}>📊 AQI Summary</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "11px" }}>
                    <div><span style={{ color: "#94a3b8" }}>Average: </span><strong>{stats.avgAQI}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Peak: </span><strong style={{ color: "#ef4444" }}>{stats.maxAQI}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Low: </span><strong style={{ color: "#10b981" }}>{stats.minAQI}</strong></div>
                  </div>
                </div>

                {/* Chart Section */}
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "12px", color: "#8b5cf6" }}>📈 Trend Chart</h4>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <MiniSparkline values={filteredData.map((d) => d.aqi)} color="#3b82f6" width={200} height={40} />
                    <MiniSparkline values={filteredData.map((d) => d.pm25)} color="#ef4444" width={200} height={40} />
                  </div>
                </div>

                {/* Key Findings */}
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(16,185,129,0.08)" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "12px", color: "#10b981" }}>💡 Key Findings</h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#94a3b8" }}>
                    <li>AQI peaked at {stats.maxAQI} during rush hours</li>
                    <li>PM2.5 averaged {stats.avgPM25} μg/m³ over the period</li>
                    <li>Air quality improved {Math.round(((stats.maxAQI - stats.minAQI) / stats.maxAQI) * 100)}% from peak to trough</li>
                  </ul>
                </div>
              </div>
            </div>

            <button style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "10px", background: "#3b82f6", color: "#fff", border: "none", fontSize: "14px", fontWeight: "700", cursor: "pointer" }} onClick={() => alert(`📋 ${REPORT_TEMPLATES.find((t) => t.id === selectedReport)?.label} generated! Check your downloads.`)}>
              📥 Generate & Download Report
            </button>
          </div>
        </div>
      )}

      {/* ═══ EXPORT HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {exportHistory.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
              <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>No Exports Yet</div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>Your export history will appear here after you export data</div>
              <button style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "10px", background: "#3b82f6", color: "#fff", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer" }} onClick={() => setActiveTab("export")}>
                📥 Go to Export
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {exportHistory.map((item) => (
                <div key={item.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>{EXPORT_FORMATS.find((f) => f.id === item.format)?.icon || "📄"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>{item.filename}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{item.records} records • {item.time}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: "6px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "10px", fontWeight: "700" }}>
                    ✓ {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
