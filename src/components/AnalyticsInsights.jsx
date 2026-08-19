import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { exportToSVG, exportToPNG } from '../utils/chartExport';

/** @param {any} params */
export default function AnalyticsInsights({ analytics, trend, timeRange }) {
  const { t } = useTranslation();
  const chartContainerRef = useRef(null);
  const dynamicSeries = trend.slice(-timeRange).map((item, index) => ({
    hour: `H${index + 1}`,
    aqi: item.us_aqi
  }));

  const handleDownloadSVG = () => {
    if (!chartContainerRef.current) return;
    exportToSVG(chartContainerRef.current, `short_term_aqi_trend.svg`);
  };

  const handleDownloadPNG = () => {
    if (!chartContainerRef.current) return;
    exportToPNG(chartContainerRef.current, `short_term_aqi_trend.png`, 2);
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{t('analyticsInsights.shortTerm', { range: timeRange })}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleDownloadSVG}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--line, #ccc)',
                background: 'var(--card, #fff)',
                color: 'var(--ink, #333)'
              }}
            >
              SVG
            </button>
            <button
              onClick={handleDownloadPNG}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--line, #ccc)',
                background: 'var(--card, #fff)',
                color: 'var(--ink, #333)'
              }}
            >
              PNG
            </button>
          </div>
        </div>
        <div ref={chartContainerRef} style={{ width: '100%' }}>
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
      </div>
    </section>
  );
}
