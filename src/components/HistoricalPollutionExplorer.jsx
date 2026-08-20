// src/components/HistoricalPollutionExplorer.jsx
// @ts-nocheck
// -----------------------------------------------------------------------------
// Issue #892 — Historical Pollution Explorer
//
// The interactive "investigate pollution over long periods" UI.
//
// Capabilities (mirrors the issue's acceptance criteria):
//   1. Historical data storage      — reuses historicalDataService's
//                                     IndexedDB cache (already done).
//   2. Timestamped pollutant readings — Open-Meteo hourly API (already
//                                     done); we aggregate to daily.
//   3. Date-range selector          — start/end date inputs + presets.
//   4. City/location selector       — multi-select from CITY_COORDINATES,
//                                     enabling single-city view + multi-
//                                     city comparison overlay.
//   5. Pollutant selector           — PM2.5, PM10, NO₂, Ozone, CO, AQI.
//   6. Line charts, bar charts, moving averages
//                                    — recharts LineChart/BarChart with
//                                     a 7-day moving average overlay.
//   7. Daily/weekly/monthly/yearly views — view toggle.
//   8. Identify highest pollution periods
//                                    — top-5 worst buckets rendered as
//                                     a ranked list.
//   9. Calculate percentage changes — half-range change between first
//                                     and second half of selected range.
//  10. Export to CSV                — reuses formatHistoricalCSV for
//                                     daily; buildExplorerCsv for
//                                     aggregated views.
//  11. Comparison between locations — overlay line chart for up to 4
//                                     cities on the same axis.
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CITY_COORDINATES, SAFE_LIMITS } from '../constants/cities';
import {
  POLLUTANTS, VIEWS, getPollutantByKey, resampleToView,
  computeMovingAverage, computePercentageChange,
  computeHalfRangeChange, identifyHighestPeriods, buildExplorerCsv,
} from '../utils/historicalExplorer';
import { fetchHistoricalForLocations } from '../services/historicalExplorerService';
import { formatHistoricalCSV } from '../services/historicalDataService';

const CHART_COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b'];

const DATE_PRESETS = [
  { id: '30d',  label: 'Last 30 days',  years: 0, daysBack: 30 },
  { id: '3mo',  label: 'Last 3 months', years: 0, daysBack: 90 },
  { id: '1y',   label: 'Last 1 year',   years: 1, daysBack: 0 },
  { id: '3y',   label: 'Last 3 years',  years: 3, daysBack: 0 },
  { id: 'janAug', label: 'Jan – Aug (this year)', years: 0, daysBack: 0, janAug: true },
];

export default function HistoricalPollutionExplorer({ position }) {
  const { t } = useTranslation();

  const [selectedCityNames, setSelectedCityNames] = useState(() => {
    const match = position?.cityName
      ? CITY_COORDINATES.find((c) => c.name === position.cityName)
      : null;
    return match ? [match.name] : [CITY_COORDINATES[0].name];
  });

  const [pollutantKey, setPollutantKey] = useState('pm25');
  const [view, setView] = useState('monthly');
  const [years, setYears] = useState(3);
  const [activePreset, setActivePreset] = useState('3y');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationsData, setLocationsData] = useState([]);
  const [chartType, setChartType] = useState('line');

  const selectedCities = useMemo(
    () => CITY_COORDINATES.filter((c) => selectedCityNames.includes(c.name)),
    [selectedCityNames],
  );

  const load = useCallback(async () => {
    if (selectedCities.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchHistoricalForLocations(selectedCities, years);
      setLocationsData(results);
      const anyError = results.find((r) => r.error);
      if (anyError && results.every((r) => r.error)) {
        setError(anyError.error);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  }, [selectedCities, years]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!startDate && !endDate && locationsData.length > 0) {
      const firstDaily = locationsData[0]?.data?.daily;
      if (firstDaily && firstDaily.length > 0) {
        setStartDate(firstDaily[0].date);
        setEndDate(firstDaily[firstDaily.length - 1].date);
      }
    }
  }, [locationsData, startDate, endDate]);

  const applyPreset = useCallback((presetId) => {
    const preset = DATE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    if (preset.years) {
      setYears(preset.years);
    } else if (preset.janAug) {
      const now = new Date();
      const y = now.getUTCFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-08-31`);
      setYears(1);
    } else if (preset.daysBack) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - preset.daysBack);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setYears(1);
    }
  }, []);

  const primary = locationsData[0];
  const primaryDaily = useMemo(() => {
    if (!primary?.data?.daily) return [];
    let rows = primary.data.daily;
    if (startDate) rows = rows.filter((r) => r.date >= startDate);
    if (endDate) rows = rows.filter((r) => r.date <= endDate);
    return rows;
  }, [primary, startDate, endDate]);

  const primaryResampled = useMemo(
    () => resampleToView(primaryDaily, view),
    [primaryDaily, view],
  );

  const pollutant = getPollutantByKey(pollutantKey);

  const movingAverage = useMemo(
    () => computeMovingAverage(primaryResampled, pollutant.out, 7),
    [primaryResampled, pollutant.out],
  );

  const chartData = useMemo(() => {
    return primaryResampled.map((row, i) => ({
      ...row,
      ma: movingAverage[i],
    }));
  }, [primaryResampled, movingAverage]);

  const halfRangeChange = useMemo(
    () => computeHalfRangeChange(primaryResampled, pollutant.out),
    [primaryResampled, pollutant.out],
  );

  const highestPeriods = useMemo(
    () => identifyHighestPeriods(primaryResampled, pollutant.out, 5),
    [primaryResampled, pollutant.out],
  );

  const overallStats = useMemo(() => {
    const values = primaryResampled
      .map((r) => r[pollutant.out])
      .filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (values.length === 0) {
      return { mean: null, min: null, max: null };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      mean: Math.round((sum / values.length) * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [primaryResampled, pollutant.out]);

  const compareData = useMemo(() => {
    if (locationsData.length <= 1) return [];
    const byLabel = new Map();
    for (const result of locationsData) {
      if (!result?.data?.daily) continue;
      let rows = result.data.daily;
      if (startDate) rows = rows.filter((r) => r.date >= startDate);
      if (endDate) rows = rows.filter((r) => r.date <= endDate);
      const resampled = resampleToView(rows, view);
      for (const row of resampled) {
        if (!byLabel.has(row.label)) {
          byLabel.set(row.label, { label: row.label });
        }
        const entry = byLabel.get(row.label);
        entry[result.location.name] = row[pollutant.out];
      }
    }
    return Array.from(byLabel.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [locationsData, view, pollutant.out, startDate, endDate]);

  const handleExportCSV = useCallback(() => {
    if (locationsData.length === 0) return;
    let csv;
    if (view === 'daily' && primary?.data?.daily) {
      csv = formatHistoricalCSV(primary.data.daily, startDate, endDate);
    } else {
      csv = buildExplorerCsv(primaryResampled, pollutantKey, view);
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const citySlug =
      (primary?.location?.name || 'historical')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
    link.download = `${citySlug}_${pollutantKey}_${view}_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [locationsData, view, primary, primaryResampled, pollutantKey, startDate, endDate]);

  const toggleCity = useCallback((name) => {
    setSelectedCityNames((prev) => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev;
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= 4) return prev;
      return [...prev, name];
    });
  }, []);

  if (loading) {
    return (
      <div data-testid="historical-explorer-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="live-dot active" style={{ marginBottom: '1rem' }} />
        <p>{t('historicalExplorer.loading', 'Loading historical pollution data…')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="historical-explorer-error" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <p>{t('historicalExplorer.error', 'Error: {{error}}', { error })}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="historical-explorer"
      className="section-card"
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
      }}
    >
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
          {t('historicalExplorer.title', 'Historical Pollution Explorer')}
        </h2>
        <p style={{ fontSize: '0.88rem', opacity: 0.8, margin: 0 }}>
          {t('historicalExplorer.subtitle', 'Compare pollution across years, cities, and pollutants.')}
        </p>
      </header>

      {/* ── Control row ───────────────────────────────────────────── */}
      <div
        data-testid="explorer-controls"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--bg-card-alt, rgba(0,0,0,0.02))',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-cities" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.cities', 'Cities (up to 4)')}
          </label>
          <select
            id="explorer-cities"
            multiple
            value={selectedCityNames}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
              if (opts.length === 0) return;
              setSelectedCityNames(opts.slice(0, 4));
            }}
            size={4}
            data-testid="explorer-cities"
            style={inputStyle}
          >
            {CITY_COORDINATES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {selectedCityNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleCity(name)}
                data-testid={`city-chip-${name}`}
                style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: '999px',
                  background: 'var(--brand, #0d9488)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                aria-label={`Remove ${name}`}
              >
                {name} ✕
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-pollutant" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.pollutant', 'Pollutant')}
          </label>
          <select
            id="explorer-pollutant"
            value={pollutantKey}
            onChange={(e) => setPollutantKey(e.target.value)}
            data-testid="explorer-pollutant"
            style={inputStyle}
          >
            {POLLUTANTS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}{p.unit ? ` (${p.unit})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-view" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.view', 'View')}
          </label>
          <select
            id="explorer-view"
            value={view}
            onChange={(e) => setView(e.target.value)}
            data-testid="explorer-view"
            style={inputStyle}
          >
            {VIEWS.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-chart" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.chartType', 'Chart Type')}
          </label>
          <select
            id="explorer-chart"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            data-testid="explorer-chart-type"
            style={inputStyle}
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
          </select>
        </div>
      </div>

      {/* ── Date preset row ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            data-testid={`preset-${p.id}`}
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--line, #e2e8f0)',
              background: activePreset === p.id ? 'var(--brand, #0d9488)' : 'var(--card, #fff)',
              color: activePreset === p.id ? '#fff' : 'var(--ink, #0f172a)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Date range inputs ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-start" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.startDate', 'Start Date')}
          </label>
          <input
            id="explorer-start"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setActivePreset(''); }}
            data-testid="explorer-start-date"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="explorer-end" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('historicalExplorer.endDate', 'End Date')}
          </label>
          <input
            id="explorer-end"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setActivePreset(''); }}
            data-testid="explorer-end-date"
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          data-testid="explorer-export-csv"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            borderRadius: '6px',
            background: 'var(--brand, #0d9488)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            alignSelf: 'flex-end',
            height: '38px',
          }}
        >
          {t('historicalExplorer.exportCSV', 'Export CSV')}
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div
        data-testid="explorer-stats"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
      >
        <StatBox
          label={t('historicalExplorer.mean', '{{pollutant}} Mean', { pollutant: pollutant.label })}
          value={overallStats.mean == null ? '—' : `${overallStats.mean} ${pollutant.unit}`}
        />
        <StatBox
          label={t('historicalExplorer.min', 'Min')}
          value={overallStats.min == null ? '—' : `${overallStats.min} ${pollutant.unit}`}
        />
        <StatBox
          label={t('historicalExplorer.max', 'Max')}
          value={overallStats.max == null ? '—' : `${overallStats.max} ${pollutant.unit}`}
        />
        <StatBox
          label={t('historicalExplorer.halfRange', 'Half-range Δ')}
          value={halfRangeChange == null ? '—' : `${halfRangeChange > 0 ? '+' : ''}${halfRangeChange}%`}
          tone={halfRangeChange == null ? 'neutral' : halfRangeChange > 0 ? 'bad' : 'good'}
        />
      </div>

      {/* ── Main chart ───────────────────────────────────────────── */}
      <h3 style={sectionHeaderStyle}>
        {t('historicalExplorer.chartTitle', '{{pollutant}} — {{view}} view', {
          pollutant: pollutant.label,
          view,
        })}
      </h3>
      <div data-testid="explorer-main-chart" style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #e2e8f0)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={pollutant.out}
                name={pollutant.label}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {view === 'daily' && (
                <Line
                  type="monotone"
                  dataKey="ma"
                  name={t('historicalExplorer.movingAverage', '7-pt MA')}
                  stroke={CHART_COLORS[1]}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              )}
              {pollutant.safeLimit != null && (
                <ReferenceLine
                  y={pollutant.safeLimit}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  label={{ value: 'Safe limit', fontSize: 10, fill: '#ef4444' }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #e2e8f0)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={pollutant.out} name={pollutant.label} fill={CHART_COLORS[0]} />
              {pollutant.safeLimit != null && (
                <ReferenceLine y={pollutant.safeLimit} stroke="#ef4444" strokeDasharray="2 2" />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Comparison chart (only when >1 city) ────────────────── */}
      {selectedCities.length > 1 && compareData.length > 0 && (
        <>
          <h3 style={sectionHeaderStyle}>
            {t('historicalExplorer.compareTitle', 'Multi-city comparison — {{pollutant}}', {
              pollutant: pollutant.label,
            })}
          </h3>
          <div data-testid="explorer-compare-chart" style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #e2e8f0)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {selectedCities.map((city, i) => (
                  <Line
                    key={city.name}
                    type="monotone"
                    dataKey={city.name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── Highest periods ─────────────────────────────────────── */}
      {highestPeriods.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={sectionHeaderStyle}>
            {t('historicalExplorer.highestPeriods', 'Highest {{pollutant}} periods', {
              pollutant: pollutant.label,
            })}
          </h3>
          <ol data-testid="explorer-highest-periods" style={{ paddingLeft: '1.5rem' }}>
            {highestPeriods.map((p) => (
              <li key={p.start} style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                <strong>{p.label}</strong> — {p.value} {pollutant.unit}
                <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>
                  ({p.days} {p.days === 1 ? 'day' : 'days'})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid var(--line, #e2e8f0)',
  background: 'var(--card, #fff)',
  color: 'var(--ink, #0f172a)',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  outline: 'none',
};

const sectionHeaderStyle = {
  fontSize: '1.1rem',
  fontWeight: 500,
  margin: '0 0 1rem 0',
  color: 'var(--ink, #0f172a)',
};

function StatBox({ label, value, tone = 'neutral' }) {
  const toneColor =
    tone === 'bad' ? '#ef4444' : tone === 'good' ? '#10b981' : 'inherit';
  return (
    <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.04)' }}>
      <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0 0 0.25rem' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: toneColor, fontFamily: '"Fraunces", serif' }}>
        {value}
      </p>
    </div>
  );
}
