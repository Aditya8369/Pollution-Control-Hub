import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { exportToSVG, exportToPNG } from '../utils/chartExport';
import { generateAIInsights } from '../services/aiInsightsService';
import { renderBoldMarkup } from '../utils/boldMarkup';

/** Fallback when `timeRange` arrives missing or nonsensical. Matches the dashboard default. */
const DEFAULT_TIME_RANGE = 24;

/**
 * Renders a KPI value.
 *
 * `estimateWeeklyMonthlyAverages()` returns `{ weekly: null, monthly: null, prediction:
 * null }` when there was nothing to average, and `{null}` in JSX renders nothing at all
 * — so a day with no usable readings showed three labelled tiles with no numbers under
 * them and no explanation. A missing measurement has to say it is missing (#546, #645,
 * #647, #499); a blank space reads as a rendering fault, or worse, as a zero.
 *
 * @param {unknown} value
 * @returns {{ text: string, isMeasured: boolean }}
 */
export function formatKpi(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { text: '—', isMeasured: false };
  }
  return { text: String(Math.round(value)), isMeasured: true };
}

/**
 * Builds the chart series from the tail of the trend.
 *
 * Hours with no reading are dropped rather than plotted as a gap at zero, for the same
 * reason the averages skip them: an unmeasured hour is not a clean hour.
 *
 * @param {Array<{us_aqi?: number|null}>} trend
 * @param {number} timeRange
 * @returns {Array<{hour: string, aqi: number}>}
 */
export function buildTrendSeries(trend, timeRange) {
  if (!Array.isArray(trend) || trend.length === 0) return [];

  const window = Number.isFinite(timeRange) && timeRange > 0 ? timeRange : DEFAULT_TIME_RANGE;

  return trend
    .slice(-window)
    .map((item, index) => ({ hour: `H${index + 1}`, aqi: item?.us_aqi }))
    .filter((point) => typeof point.aqi === 'number' && Number.isFinite(point.aqi));
}

const exportButtonStyle = {
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  borderRadius: '4px',
  border: '1px solid var(--line, #ccc)',
  background: 'var(--card, #fff)',
  color: 'var(--ink, #333)'
};

/**
 * Weekly/monthly averages and a short-term AQI pattern.
 *
 * Both data props are optional and defaulted. They were not, and there is no error
 * boundary between this component and `Dashboard` — so a render that reached
 * `analytics.weekly` with `analytics` undefined threw, and took the whole dashboard down
 * rather than this one panel. That is what five unrelated city-comparison tests were
 * failing on (#896).
 *
 * @param {{
 *   analytics?: {weekly?: number|null, monthly?: number|null, prediction?: number|null},
 *   trend?: Array<{us_aqi?: number|null}>,
 *   timeRange?: number,
 * }} props
 */
export default function AnalyticsInsights({ analytics = {}, trend = [], timeRange = DEFAULT_TIME_RANGE, lat, lon, cityName }) {
  const { t } = useTranslation();
  const chartContainerRef = useRef(null);

  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    if (lat == null || lon == null) return undefined;

    // `generateAIInsights` goes through `fetchHistoricalData` — a year of hourly
    // archive data, slow on a cold cache. Without this flag, searching Delhi and
    // then Mumbai leaves two requests in flight and whichever resolves last
    // wins: Delhi's insights can end up under Mumbai's heading with
    // `loadingInsights` already false, so nothing signals it. It also stops the
    // three setState calls below firing after unmount.
    let current = true;

    setLoadingInsights(true);
    setInsightsError(null);
    // The previous city's insights are not an answer about this one, so they go
    // now rather than lingering behind the spinner.
    setInsights([]);

    generateAIInsights(lat, lon, cityName)
      .then(result => {
        if (!current) return;
        if (result?.error) {
          setInsightsError(result.error);
        } else {
          setInsights(Array.isArray(result?.insights) ? result.insights : []);
        }
      })
      .catch(err => {
        if (!current) return;
        setInsightsError(err?.message || 'Error fetching insights');
      })
      .finally(() => {
        if (current) setLoadingInsights(false);
      });

    return () => {
      current = false;
    };
  }, [lat, lon, cityName]);

  const range = Number.isFinite(timeRange) && timeRange > 0 ? timeRange : DEFAULT_TIME_RANGE;
  const dynamicSeries = useMemo(() => buildTrendSeries(trend, range), [trend, range]);
  const hasChart = dynamicSeries.length > 0;

  const kpis = [
    { key: 'weekly', label: t('analyticsInsights.weeklyAvg'), ...formatKpi(analytics?.weekly) },
    { key: 'monthly', label: t('analyticsInsights.monthlyAvg'), ...formatKpi(analytics?.monthly) },
    { key: 'prediction', label: t('analyticsInsights.predicted'), ...formatKpi(analytics?.prediction) },
  ];

  const [exportError, setExportError] = useState(null);

  const handleDownloadSVG = () => {
    if (!chartContainerRef.current) return;
    setExportError(
      exportToSVG(chartContainerRef.current, `short_term_aqi_trend.svg`)
        ? null
        : t('analyticsInsights.exportFailed', 'The chart could not be exported.')
    );
  };

  const handleDownloadPNG = () => {
    if (!chartContainerRef.current) return;
    setExportError(null);
    // The export used to be fire-and-forget, so a browser that refused to encode the
    // canvas produced no file and no message — the button simply did nothing.
    exportToPNG(chartContainerRef.current, `short_term_aqi_trend.png`, 2).catch(() =>
      setExportError(t('analyticsInsights.exportFailed', 'The chart could not be exported.'))
    );
  };

  return (
    <section data-testid="analytics-insights" className="panel">
      <div className="panel-head">
        <h2>{t('analyticsInsights.title')}</h2>
        <p>{t('analyticsInsights.subtitle')}</p>
      </div>

      <div className="analytics-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.key} data-testid={`analytics-kpi-${kpi.key}`}>
            <h3>{kpi.label}</h3>
            <p
              // The em-dash carries no meaning to a screen reader, so the reason is
              // spelled out for one rather than left as punctuation.
              aria-label={kpi.isMeasured ? undefined : `${kpi.label}: ${t('analyticsInsights.noData', 'Not enough data')}`}
              style={kpi.isMeasured ? undefined : { opacity: 0.6 }}
            >
              {kpi.text}
            </p>
          </article>
        ))}
      </div>

      {/* AI Insights Section */}
      <div className="ai-insights-card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-app, #f8fafc)', borderRadius: '0.75rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <span aria-hidden="true">✨</span> AI Pollution Insights
        </h3>
        
        {loadingInsights && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
            <span className="loading-spinner live-dot active" aria-hidden="true" style={{ display: 'inline-block' }}></span>
            <p style={{ margin: 0 }}>Analyzing historical data for insights...</p>
          </div>
        )}
        
        {insightsError && !loadingInsights && (
          <p role="alert" style={{ margin: 0, color: 'var(--danger, #ef4444)' }}>{insightsError}</p>
        )}
        
        {!loadingInsights && !insightsError && insights.length === 0 && (
          <p style={{ margin: 0, opacity: 0.7 }}>No meaningful insights could be generated at this time. We may need more historical data for this location.</p>
        )}
        
        {!loadingInsights && insights.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {insights.map((insight) => (
              <div key={insight.id} style={{ background: 'var(--card, #fff)', padding: '1.25rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }} aria-hidden="true">{insight.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{insight.title}</h4>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '9999px', 
                      background: insight.confidence === 'High' ? '#dcfce7' : '#fef08a', 
                      color: insight.confidence === 'High' ? '#166534' : '#854d0e', 
                      fontWeight: '700',
                      display: 'inline-block'
                    }}>
                      {insight.confidence} Confidence
                    </span>
                  </div>
                </div>
                <p
                  style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}
                >
                  {/* Nodes, not innerHTML. `description` interpolates the
                      location name, which comes from the geocoder — see #1053. */}
                  {renderBoldMarkup(insight.description)}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)', borderTop: '1px solid var(--line, #f1f5f9)', paddingTop: '0.5rem' }}>
                  Source: {insight.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{t('analyticsInsights.shortTerm', { range })}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Exporting an empty axis produces a file with nothing in it, which is a
                worse answer than not offering the button. */}
            <button
              type="button"
              onClick={handleDownloadSVG}
              disabled={!hasChart}
              style={{ ...exportButtonStyle, cursor: hasChart ? 'pointer' : 'not-allowed', opacity: hasChart ? 1 : 0.5 }}
            >
              SVG
            </button>
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={!hasChart}
              style={{ ...exportButtonStyle, cursor: hasChart ? 'pointer' : 'not-allowed', opacity: hasChart ? 1 : 0.5 }}
            >
              PNG
            </button>
          </div>
        </div>
        {exportError && (
          <p role="alert" data-testid="analytics-export-error" style={{ margin: '0 0 0.75rem', color: 'var(--danger, #ef4444)', fontSize: '0.8rem' }}>
            {exportError}
          </p>
        )}
        <div ref={chartContainerRef} style={{ width: '100%' }}>
          {hasChart ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dynamicSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="aqi" stroke="#0284c7" fill="#7dd3fc" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p
              role="status"
              data-testid="analytics-chart-empty"
              style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}
            >
              {t(
                'analyticsInsights.noReadings',
                'No hourly readings for this window yet — the pattern will appear once measurements arrive.'
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

AnalyticsInsights.propTypes = {
  analytics: PropTypes.shape({
    weekly: PropTypes.number,
    monthly: PropTypes.number,
    prediction: PropTypes.number,
  }),
  trend: PropTypes.arrayOf(PropTypes.object),
  timeRange: PropTypes.number,
};
