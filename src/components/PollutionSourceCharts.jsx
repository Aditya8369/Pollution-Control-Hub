import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SOURCE_TYPES, POLLUTANT_TYPES } from './pollutionSourceTypes';

const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#06b6d4', '#10b981'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      borderRadius: '0.75rem',
      padding: '0.6rem 0.8rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      border: '1px solid #e2e8f0',
      fontSize: '0.7rem',
    }}>
      <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 0.3rem' }}>{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: '#64748b', margin: '0.15rem 0' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: entry.color, marginRight: '0.35rem' }} />
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

/**
 * Area chart showing PM2.5 and PM10 trends over weeks.
 */
const WeeklyTrendChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      📈 Weekly Pollutant Trends
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pm10Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'WHO PM2.5', fill: '#ef4444', fontSize: 9 }} />
        <ReferenceLine y={45} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'WHO PM10', fill: '#f59e0b', fontSize: 9 }} />
        <Area type="monotone" dataKey="avgPM25" name="PM2.5 (µg/m³)" stroke="#ef4444" fill="url(#pm25Grad)" strokeWidth={2} />
        <Area type="monotone" dataKey="avgPM10" name="PM10 (µg/m³)" stroke="#f59e0b" fill="url(#pm10Grad)" strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Pie chart showing distribution of sources by type.
 */
const SourceTypePie = ({ sources }) => {
  const typeCounts = {};
  sources.forEach(s => {
    const label = s.type || 'unknown';
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const data = Object.entries(typeCounts)
    .map(([key, count]) => ({
      name: SOURCE_TYPES[key]?.label || key,
      value: count,
      color: SOURCE_TYPES[key]?.color || '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        🏭 Sources by Type
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {data.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary, #475569)' }}>{entry.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Bar chart showing active sources and alerts per week.
 */
const AlertsVsResolvedChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      🔔 Alerts vs Resolved
    </h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="alerts" name="New Alerts" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Area chart showing population exposure over time.
 */
const PopulationExposureChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      👥 Population Exposure Trend
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="populationExposed" name="Population Exposed" stroke="#8b5cf6" fill="url(#popGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Radar chart comparing pollutant levels across the top source.
 */
const PollutantRadar = ({ source }) => {
  if (!source) return null;
  const data = Object.entries(source.pollutants).slice(0, 6).map(([key, p]) => {
    const config = POLLUTANT_TYPES[key];
    return {
      pollutant: config?.label || key,
      value: p.whoLimit ? Math.min((p.value / p.whoLimit) * 100, 150) : Math.min(p.value / 2, 100),
      limit: 100,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>
        🎯 Pollutant Profile — {source.name}
      </h3>
      <p style={{ fontSize: '0.65rem', color: 'var(--muted, #94a3b8)', margin: '0 0 1rem' }}>Values relative to WHO limits (100% = limit)</p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="pollutant" tick={{ fontSize: 10, fill: '#64748b' }} />
          <PolarRadiusAxis angle={90} domain={[0, 150]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name="Level" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
          <Radar name="WHO Limit" dataKey="limit" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1} strokeDasharray="5 5" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

/**
 * Bar chart showing severity distribution of all sources.
 */
const SeverityBar = ({ sources }) => {
  const severityCounts = {};
  sources.forEach(s => {
    severityCounts[s.severity] = (severityCounts[s.severity] || 0) + 1;
  });
  const data = Object.entries(severityCounts)
    .map(([sev, count]) => ({ name: sev, count }))
    .sort((a, b) => b.count - a.count);

  const sevColors = { low: '#22c55e', moderate: '#f59e0b', high: '#f97316', critical: '#ef4444', emergency: '#dc2626' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        ⚠️ Severity Distribution
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Sources" radius={[0, 6, 6, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={sevColors[entry.name] || '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export {
  WeeklyTrendChart,
  SourceTypePie,
  AlertsVsResolvedChart,
  PopulationExposureChart,
  PollutantRadar,
  SeverityBar,
  ChartTooltip,
};
