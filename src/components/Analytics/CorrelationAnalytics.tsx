import React, { useState, useMemo } from 'react';
import { useSWR } from '../../hooks/useSWR';
import { useTranslation } from 'react-i18next';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { calculatePearsonCorrelation, getCorrelationStrengthKey } from '../../utils/analytics';
import styles from './CorrelationAnalytics.module.css';

export interface CorrelationRawPoint {
  name: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  aqiBand?: 'good' | 'moderate' | 'unhealthy' | 'severe';
  [key: string]: number | string | undefined;
}

export interface MetricData {
  temperature: number[];
  humidity: number[];
  windSpeed: number[];
  pm25: number[];
  pm10: number[];
  no2: number[];
  o3: number[];
  co: number[];
  raw: CorrelationRawPoint[];
}

export const DEFAULT_ANALYTICS_DATA: MetricData = {
  temperature: [22, 25, 28, 32, 35, 30, 27, 24, 20, 18, 21, 26],
  humidity: [65, 60, 55, 45, 40, 50, 58, 62, 70, 75, 68, 55],
  windSpeed: [12, 15, 18, 8, 6, 10, 14, 16, 5, 7, 11, 14],
  pm25: [45, 50, 40, 95, 120, 85, 55, 48, 140, 115, 60, 42],
  pm10: [75, 80, 65, 150, 185, 130, 90, 78, 210, 175, 95, 70],
  no2: [25, 30, 28, 45, 55, 40, 32, 26, 60, 50, 35, 27],
  o3: [35, 40, 48, 65, 75, 60, 45, 38, 30, 25, 38, 44],
  co: [0.6, 0.8, 0.7, 1.4, 1.8, 1.2, 0.9, 0.7, 2.1, 1.6, 0.8, 0.6],
  raw: [
    { name: 'Jan', temperature: 22, humidity: 65, windSpeed: 12, pm25: 45, pm10: 75, no2: 25, o3: 35, co: 0.6, aqiBand: 'good' },
    { name: 'Feb', temperature: 25, humidity: 60, windSpeed: 15, pm25: 50, pm10: 80, no2: 30, o3: 40, co: 0.8, aqiBand: 'good' },
    { name: 'Mar', temperature: 28, humidity: 55, windSpeed: 18, pm25: 40, pm10: 65, no2: 28, o3: 48, co: 0.7, aqiBand: 'good' },
    { name: 'Apr', temperature: 32, humidity: 45, windSpeed: 8, pm25: 95, pm10: 150, no2: 45, o3: 65, co: 1.4, aqiBand: 'moderate' },
    { name: 'May', temperature: 35, humidity: 40, windSpeed: 6, pm25: 120, pm10: 185, no2: 55, o3: 75, co: 1.8, aqiBand: 'unhealthy' },
    { name: 'Jun', temperature: 30, humidity: 50, windSpeed: 10, pm25: 85, pm10: 130, no2: 40, o3: 60, co: 1.2, aqiBand: 'moderate' },
    { name: 'Jul', temperature: 27, humidity: 58, windSpeed: 14, pm25: 55, pm10: 90, no2: 32, o3: 45, co: 0.9, aqiBand: 'good' },
    { name: 'Aug', temperature: 24, humidity: 62, windSpeed: 16, pm25: 48, pm10: 78, no2: 26, o3: 38, co: 0.7, aqiBand: 'good' },
    { name: 'Sep', temperature: 20, humidity: 70, windSpeed: 5, pm25: 140, pm10: 210, no2: 60, o3: 30, co: 2.1, aqiBand: 'severe' },
    { name: 'Oct', temperature: 18, humidity: 75, windSpeed: 7, pm25: 115, pm10: 175, no2: 50, o3: 25, co: 1.6, aqiBand: 'unhealthy' },
    { name: 'Nov', temperature: 21, humidity: 68, windSpeed: 11, pm25: 60, pm10: 95, no2: 35, o3: 38, co: 0.8, aqiBand: 'moderate' },
    { name: 'Dec', temperature: 26, humidity: 55, windSpeed: 14, pm25: 42, pm10: 70, no2: 27, o3: 44, co: 0.6, aqiBand: 'good' },
  ],
};

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    return await res.json();
  } catch {
    return DEFAULT_ANALYTICS_DATA;
  }
};

// Memoized Heatmap Sub-component to optimize grid sizing runs
export const HeatmapCell = React.memo(({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) => {
  const backgroundColor = useMemo(() => {
    if (value > 0) return `rgba(239, 68, 68, ${Math.min(1, Math.max(0.15, value))})`; // Red gradient for positive correlations
    return `rgba(59, 130, 246, ${Math.min(1, Math.max(0.15, Math.abs(value)))})`;   // Blue gradient for negative correlations
  }, [value]);

  return (
    <div
      className={styles.heatmapCell}
      style={{ backgroundColor }}
      title={label}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value}`}
    >
      {value}
    </div>
  );
});
HeatmapCell.displayName = 'HeatmapCell';

export const CorrelationAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { data = DEFAULT_ANALYTICS_DATA, error } = useSWR<MetricData>('/api/analytics/weather-aqi-correlation', fetcher, {
    fallbackData: DEFAULT_ANALYTICS_DATA,
  });

  const [chartType, setChartType] = useState<'scatter' | 'dualAxis'>('scatter');
  const [selectedWeather, setSelectedWeather] = useState<string>('temperature');
  const [selectedAQI, setSelectedAQI] = useState<string>('pm25');

  const weatherMetrics = useMemo(() => ['temperature', 'humidity', 'windSpeed'], []);
  const aqiMetrics = useMemo(() => ['pm25', 'pm10', 'no2', 'o3', 'co'], []);

  const matrixResults = useMemo(() => {
    const activeData = data || DEFAULT_ANALYTICS_DATA;
    const matrix: { [key: string]: { [key: string]: number } } = {};
    const insights: string[] = [];

    weatherMetrics.forEach((w) => {
      matrix[w] = {};
      aqiMetrics.forEach((a) => {
        const coef = calculatePearsonCorrelation(
          (activeData[w as keyof MetricData] as number[]) || [],
          (activeData[a as keyof MetricData] as number[]) || []
        );
        matrix[w][a] = coef;

        const strength = getCorrelationStrengthKey(coef);
        if (strength.startsWith('strong') || strength.startsWith('moderate')) {
          insights.push(
            t(`analytics.insights.${strength}`, {
              weather: t(`metrics.${w}`, { defaultValue: w }),
              aqi: t(`metrics.${a}`, { defaultValue: a }),
              value: coef,
            })
          );
        }
      });
    });

    return { matrix, insights };
  }, [data, weatherMetrics, aqiMetrics, t]);

  // AQI Band Breakdown Analysis
  const bandBreakdown = useMemo(() => {
    const activeData = data || DEFAULT_ANALYTICS_DATA;
    const bands: { [key: string]: CorrelationRawPoint[] } = {
      good: [],
      moderate: [],
      unhealthy: [],
      severe: [],
    };

    activeData.raw.forEach((point) => {
      const band = point.aqiBand || 'good';
      if (bands[band]) {
        bands[band].push(point);
      }
    });

    return Object.entries(bands).map(([bandName, points]) => {
      const wx = points.map((p) => Number(p[selectedWeather] || 0));
      const ay = points.map((p) => Number(p[selectedAQI] || 0));
      const r = calculatePearsonCorrelation(wx, ay);
      return {
        bandName,
        count: points.length,
        correlation: r,
      };
    });
  }, [data, selectedWeather, selectedAQI]);

  if (error && !data) return <div className={styles.container}>{t('analytics.error_loading')}</div>;

  const chartData = (data?.raw || DEFAULT_ANALYTICS_DATA.raw).map((item) => ({
    x: Number(item[selectedWeather] || 0),
    y: Number(item[selectedAQI] || 0),
    name: String(item.name || ''),
    [selectedWeather]: Number(item[selectedWeather] || 0),
    [selectedAQI]: Number(item[selectedAQI] || 0),
  }));

  return (
    <div className={styles.container} data-testid="correlation-analytics">
      <h2>{t('analytics.title')}</h2>

      <div className={styles.grid}>
        {/* Heatmap Section */}
        <div className={styles.card}>
          <h3>{t('analytics.heatmap_title')}</h3>
          <div className={styles.heatmapGrid}>
            <div className={styles.heatmapHeader} />
            {aqiMetrics.map((h) => (
              <div key={h} className={styles.heatmapHeader}>
                {h.toUpperCase()}
              </div>
            ))}
            {weatherMetrics.map((wKey) => (
              <React.Fragment key={wKey}>
                <div className={styles.heatmapRowLabel}>
                  {t(`metrics.${wKey}`, { defaultValue: wKey })}
                </div>
                {aqiMetrics.map((aKey) => (
                  <HeatmapCell
                    key={`${wKey}-${aKey}`}
                    value={matrixResults.matrix[wKey]?.[aKey] ?? 0}
                    label={`${wKey} vs ${aKey}`}
                    onClick={() => {
                      setSelectedWeather(wKey);
                      setSelectedAQI(aKey);
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Chart Custom Toggles & Selectors Section */}
        <div className={styles.card}>
          <div className={styles.controls}>
            <button
              type="button"
              className={chartType === 'scatter' ? styles.activeToggleBtn : styles.toggleBtn}
              onClick={() => setChartType('scatter')}
            >
              {t('analytics.scatter_toggle')}
            </button>
            <button
              type="button"
              className={chartType === 'dualAxis' ? styles.activeToggleBtn : styles.toggleBtn}
              onClick={() => setChartType('dualAxis')}
            >
              {t('analytics.dual_axis_toggle')}
            </button>

            <div className={styles.selectGroup}>
              <select
                className={styles.select}
                value={selectedWeather}
                onChange={(e) => setSelectedWeather(e.target.value)}
                aria-label={t('analytics.select_weather')}
              >
                {weatherMetrics.map((w) => (
                  <option key={w} value={w}>
                    {t(`metrics.${w}`, { defaultValue: w })}
                  </option>
                ))}
              </select>

              <select
                className={styles.select}
                value={selectedAQI}
                onChange={(e) => setSelectedAQI(e.target.value)}
                aria-label={t('analytics.select_aqi')}
              >
                {aqiMetrics.map((a) => (
                  <option key={a} value={a}>
                    {t(`metrics.${a}`, { defaultValue: a })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              {chartType === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="x" name={selectedWeather} />
                  <YAxis type="number" dataKey="y" name={selectedAQI} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Metrics" data={chartData} fill="#0284c7" />
                </ScatterChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey={selectedWeather} stroke="#0284c7" name={t(`metrics.${selectedWeather}`, { defaultValue: selectedWeather })} />
                  <Line yAxisId="right" type="monotone" dataKey={selectedAQI} stroke="#10b981" name={t(`metrics.${selectedAQI}`, { defaultValue: selectedAQI })} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AQI Band Breakdown Analysis */}
      <div className={styles.card}>
        <h3>{t('analytics.band_analysis_title')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 1rem 0' }}>
          Correlation between {t(`metrics.${selectedWeather}`, { defaultValue: selectedWeather })} and {t(`metrics.${selectedAQI}`, { defaultValue: selectedAQI })} across AQI levels:
        </p>
        <div className={styles.bandGrid}>
          {bandBreakdown.map((band) => (
            <div key={band.bandName} className={styles.bandCard}>
              <strong style={{ textTransform: 'capitalize' }}>{band.bandName} AQI</strong>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                Samples: {band.count}
              </div>
              <div style={{ fontWeight: 600, color: band.correlation > 0 ? '#ef4444' : '#3b82f6', marginTop: '0.25rem' }}>
                r = {band.correlation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automated Insights Panel */}
      <div className={styles.card}>
        <h3>{t('analytics.automated_insights')}</h3>
        <ul className={styles.insightsList}>
          {matrixResults.insights.map((insight, idx) => (
            <li key={idx} className={styles.insightItem}>
              {insight}
            </li>
          ))}
          {matrixResults.insights.length === 0 && (
            <li className={styles.insightItem}>{t('analytics.no_strong_patterns')}</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CorrelationAnalytics;
