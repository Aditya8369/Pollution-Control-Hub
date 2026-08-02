import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';

/** @param {any} params */
export default function AnalyticsInsights({ analytics, trend, timeRange }) {
  const { t } = useTranslation();
  const dynamicSeries = trend.slice(-timeRange).map((item, index) => ({
    hour: `H${index + 1}`,
    aqi: item.us_aqi
  }));

  return (
    <section data-testid="analytics-insights" className="panel">
      <div className="panel-head">
        <h2>{t('analyticsInsights.title')}</h2>
        <p>{t('analyticsInsights.subtitle')}</p>
      </div>

      <div className="analytics-kpis">
        <article><h3>{t('analyticsInsights.weeklyAvg')}</h3><p>{analytics.weekly}</p></article>
        <article><h3>{t('analyticsInsights.monthlyAvg')}</h3><p>{analytics.monthly}</p></article>
        <article><h3>{t('analyticsInsights.predicted')}</h3><p>{analytics.prediction}</p></article>
      </div>

      <div className="chart-card">
        <h3>{t('analyticsInsights.shortTerm', { range: timeRange })}</h3>
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
