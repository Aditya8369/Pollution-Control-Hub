import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { getAQIBand, getPollutantColor } from "../services/airQualityService";

function shortTimeLabel(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'var(--card)',
        padding: '1rem',
        border: '1px solid var(--line)',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        maxWidth: '250px',
        zIndex: 1000,
        position: 'relative'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: data.color, fontSize: '1.25rem', fontWeight: 'bold' }}>{data.name}</h4>
        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--ink)' }}>
          <strong>Current:</strong> {data.value} µg/m³
        </p>
        <p style={{ margin: '0 0 0.75rem 0', color: 'var(--ink)' }}>
          <strong>WHO Limit:</strong> {data.limit} µg/m³
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.4' }}>
          {data.impact}
        </p>
      </div>
    );
  }
  return null;
}
import { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Dashboard({
  cityName,
  current,
  trend,
  cityComparisons,
  timeRange,
  onTimeRangeChange,
  lastUpdated,
  isRefreshing,
  confidenceScore,
  dataCompleteness
}) {
  const reportRef = useRef(null);
const [isExporting, setIsExporting] = useState(false);

const exportReportAsPDF = async () => {
  if (!reportRef.current || isExporting) return;

  try {
    setIsExporting(true);

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    const imageData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let heightLeft = imageHeight;
    let position = margin;

    pdf.addImage(
      imageData,
      "PNG",
      margin,
      position,
      imageWidth,
      imageHeight
    );

    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight + margin;
      pdf.addPage();

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        imageWidth,
        imageHeight
      );

      heightLeft -= pageHeight - margin * 2;
    }

    const safeCityName = cityName
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();

    pdf.save(`${safeCityName}-air-quality-report.pdf`);
  } catch (error) {
    console.error("PDF export failed:", error);
    alert("Unable to export the PDF. Please try again.");
  } finally {
    setIsExporting(false);
  }
};
  if (!current) {
    return (
      <section className="panel dashboard">
        <div className="panel-head">
          <h2>Real-Time Pollution Dashboard</h2>
          <p>Live readings for {cityName}</p>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          <h3>No data available</h3>
          <p>We couldn't find pollution data for {cityName}.</p>
        </div>
      </section>
    );
  }
  const aqiBand = getAQIBand(current.us_aqi);
  const chartData = trend.slice(-timeRange).map((item) => ({
    ...item,
    label: shortTimeLabel(item.time)
  }));

  const pollutants = [
    { name: 'PM2.5', value: current.pm2_5, limit: 15, impact: 'Fine particles can penetrate lungs and enter the bloodstream.', color: getPollutantColor(current.pm2_5, 15) },
    { name: 'PM10', value: current.pm10, limit: 45, impact: 'Coarse particles can irritate airways and cause coughing.', color: getPollutantColor(current.pm10, 45) },
    { name: 'NO2', value: current.nitrogen_dioxide, limit: 25, impact: 'May irritate airways and aggravate respiratory diseases.', color: getPollutantColor(current.nitrogen_dioxide, 25) },
    { name: 'O3', value: current.ozone, limit: 100, impact: 'Can trigger asthma and reduce lung function.', color: getPollutantColor(current.ozone, 100) },
    { name: 'CO', value: current.carbon_monoxide, limit: 4000, impact: 'High levels reduce oxygen delivery to the body.', color: getPollutantColor(current.carbon_monoxide, 4000) }
  ].map(p => ({ ...p, ratio: Math.max(10, (p.value / p.limit) * 100) })); // Minimum ratio of 10 for visibility
return (
  <section className="panel dashboard" ref={reportRef}>
    <div className="panel-head">
      <div>
        <h2>Real-Time Pollution Dashboard</h2>
        <p>Live readings for {cityName}</p>
      </div>

      <button
        type="button"
        className="export-report-button"
        onClick={exportReportAsPDF}
        disabled={isExporting}
        data-html2canvas-ignore="true"
      >
        {isExporting ? "Generating PDF..." : "Export Report as PDF"}
      </button>

      <div className="dashboard-tools">
        <div className="range-switch">
          {[6, 12, 24].map((range) => (
            <button
              key={range}
              type="button"
              className={timeRange === range ? "active" : ""}
              onClick={() => onTimeRangeChange(range)}
            >
              {range}h
            </button>
          ))}
        </div>

        <p className="dashboard-meta">
          {isRefreshing
            ? "Updating..."
            : `Updated ${
                lastUpdated
                  ? new Date(lastUpdated).toLocaleTimeString()
                  : "just now"
              }`}
        </p>
      </div>
    </div>

    <div
      className="kpi-grid"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"
      }}
    >
      <article
        className="kpi-card aqi"
        style={{ gridColumn: "span 1" }}
      >
        <h3>US AQI</h3>

        <div
          className="kpi-value"
          style={{ color: aqiBand.color }}
        >
          {current.us_aqi}
        </div>

        <p>{aqiBand.label}</p>

        <span
          className={`confidence-badge confidence-${confidenceScore?.toLowerCase()}`}
        >
          {confidenceScore} ({dataCompleteness}% data)
        </span>
      </article>

      <article
        className="kpi-card chart-card"
        style={{
          gridColumn: "span 2",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <h3>Pollutant Health Speedometer</h3>

        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            marginBottom: "0.5rem"
          }}
        >
          Relative magnitude vs. WHO guidelines. Larger segments indicate
          higher severity.
        </p>

        <div
          style={{ flex: 1, minHeight: "200px" }}
          role="img"
          aria-label="Pollutant health speedometer donut chart showing real-time values vs WHO guidelines"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pollutants}
                dataKey="ratio"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                label={({ name }) => name}
                labelLine={false}
              >
                {pollutants.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>

    <div className="chart-grid">
      <article className="chart-card">
        <h3>AQI Trend ({timeRange}h)</h3>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d7e6e1"
            />

            <XAxis
              dataKey="label"
              minTickGap={28}
            />

            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="us_aqi"
              stroke="#0d9488"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </article>

      <article className="chart-card">
        <h3>City-Wise AQI Comparison</h3>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={cityComparisons}
            layout="vertical"
            margin={{ left: 30 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d7e6e1"
            />

            <XAxis type="number" />

            <YAxis
              type="category"
              dataKey="city"
              width={90}
            />

            <Tooltip />

            <Bar
              dataKey="aqi"
              fill="#f97316"
              radius={[0, 12, 12, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </article>
    </div>
  </section>
);
}