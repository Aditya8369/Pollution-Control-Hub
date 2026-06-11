import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { getAQIBand } from '../services/airQualityService';

function shortTimeLabel(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({
  cityName,
  current,
  trend,
  cityComparisons,
  timeRange,
  onTimeRangeChange,
  lastUpdated,
  isRefreshing
}) {
  const aqiBand = getAQIBand(current.us_aqi);
  const chartData = trend.slice(-timeRange).map((item) => ({
    ...item,
    label: shortTimeLabel(item.time)
  }));

  return (
    <section className="panel dashboard">
      <div className="panel-head">
        <h2>Real-Time Pollution Dashboard</h2>
        <p>Live readings for {cityName}</p>
        <div className="dashboard-tools">
          <div className="range-switch">
            {[6, 12, 24].map((range) => (
              <button
                key={range}
                type="button"
                className={timeRange === range ? 'active' : ''}
                onClick={() => onTimeRangeChange(range)}
              >
                {range}h
              </button>
            ))}
          </div>
          <p className="dashboard-meta">
            {isRefreshing ? 'Updating...' : `Updated ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'just now'}`}
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card aqi">
          <h3>US AQI</h3>
          <div className="kpi-value" style={{ color: aqiBand.color }}>{current.us_aqi}</div>
          <p>{aqiBand.label}</p>
        </article>
        <article className="kpi-card"><h3>PM2.5</h3><div className="kpi-value">{current.pm2_5}</div><p>ug/m3</p></article>
        <article className="kpi-card"><h3>PM10</h3><div className="kpi-value">{current.pm10}</div><p>ug/m3</p></article>
        <article className="kpi-card"><h3>CO</h3><div className="kpi-value">{current.carbon_monoxide}</div><p>ug/m3</p></article>
        <article className="kpi-card"><h3>NO2</h3><div className="kpi-value">{current.nitrogen_dioxide}</div><p>ug/m3</p></article>
      </div>

      <div className="chart-grid">
        <article className="chart-card">
          <h3>AQI Trend ({timeRange}h)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
              <XAxis dataKey="label" minTickGap={28} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="us_aqi" stroke="#0d9488" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h3>City-Wise AQI Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cityComparisons} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="city" width={90} />
              <Tooltip />
              <Bar dataKey="aqi" fill="#f97316" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
