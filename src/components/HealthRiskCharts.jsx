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
import { RISK_CATEGORIES } from './healthRiskTypes';

const CHART_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#06b6d4', '#10b981'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', borderRadius: '0.75rem', padding: '0.6rem 0.8rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', fontSize: '0.7rem',
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
 * AQI trend over time with risk band shading.
 */
const AQITrendChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      📊 Daily AQI & Risk Trend
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="dayLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis yAxisId="aqi" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 350]} />
        <YAxis yAxisId="risk" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 1]} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine yAxisId="aqi" y={100} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Unhealthy SG', fill: '#f59e0b', fontSize: 9 }} />
        <ReferenceLine yAxisId="aqi" y={200} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Unhealthy', fill: '#ef4444', fontSize: 9 }} />
        <Area yAxisId="aqi" type="monotone" dataKey="aqi" name="AQI" stroke="#6366f1" fill="url(#riskGrad)" strokeWidth={2} />
        <Line yAxisId="risk" type="monotone" dataKey="overallRisk" name="Overall Risk" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Risk by category radar chart.
 */
const RiskCategoryRadar = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      🎯 Risk Profile by Category
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
        <Radar name="Current Risk" dataKey="risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
        <Radar name="Baseline" dataKey="baseline" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1} strokeDasharray="5 5" />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * City AQI comparison bar chart.
 */
const CityComparisonChart = ({ cities }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      🌍 Global City Comparison
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={cities} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 400]} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={100} stroke="#f59e0b" strokeDasharray="5 5" />
        <ReferenceLine x={200} stroke="#ef4444" strokeDasharray="5 5" />
        <Bar dataKey="aqi" name="AQI" radius={[0, 6, 6, 0]}>
          {cities.map((entry, idx) => (
            <Cell key={idx} fill={entry.band.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Vulnerable group exposure bar chart.
 */
const VulnerableGroupChart = ({ groups }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      👥 Vulnerable Group Impact
    </h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={groups}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="symptomsReported" name="Symptoms Reported" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="hospitalizations" name="Hospitalizations" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Pollutant risk distribution pie chart.
 */
const PollutantRiskPie = ({ pollutants }) => {
  const riskCounts = { high: 0, moderate: 0, low: 0 };
  pollutants.forEach(p => { riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] || 0) + 1; });
  const data = [
    { name: 'High Risk', value: riskCounts.high, color: '#ef4444' },
    { name: 'Moderate', value: riskCounts.moderate, color: '#f59e0b' },
    { name: 'Low Risk', value: riskCounts.low, color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        ☣️ Pollutant Risk Distribution
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1 }}>
          {data.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #475569)' }}>{entry.name}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginLeft: 'auto' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Hourly AQI line chart.
 */
const HourlyAQIChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.5 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      ⏰ 24-Hour AQI Pattern
    </h3>
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={3} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 300]} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" />
        <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="aqi" name="AQI" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
);

export {
  AQITrendChart,
  RiskCategoryRadar,
  CityComparisonChart,
  VulnerableGroupChart,
  PollutantRiskPie,
  HourlyAQIChart,
  CustomTooltip,
};
