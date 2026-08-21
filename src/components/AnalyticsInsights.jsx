import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { exportToSVG, exportToPNG } from '../utils/chartExport';

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
export default function AnalyticsInsights({ analytics = {}, trend = [], timeRange = DEFAULT_TIME_RANGE }) {
  const { t } = useTranslation();
  const chartContainerRef = useRef(null);

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
