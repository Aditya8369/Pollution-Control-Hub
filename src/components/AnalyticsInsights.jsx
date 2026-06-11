import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AnalyticsInsights({ analytics, trend, timeRange }) {
  const dynamicSeries = trend.slice(-timeRange).map((item, index) => ({
    hour: `H${index + 1}`,
    aqi: item.us_aqi
  }));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Data Analytics & Insights</h2>
        <p>Weekly/monthly outlook and simple trend-based AQI prediction</p>
      </div>

      <div className="analytics-kpis">
        <article><h3>Weekly Avg AQI</h3><p>{analytics.weekly}</p></article>
        <article><h3>Monthly Avg AQI</h3><p>{analytics.monthly}</p></article>
        <article><h3>Predicted Next-Day AQI</h3><p>{analytics.prediction}</p></article>
      </div>

      <div className="chart-card">
        <h3>Short-Term AQI Pattern ({timeRange}h)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dynamicSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="aqi" stroke="#0284c7" fill="#7dd3fc" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
