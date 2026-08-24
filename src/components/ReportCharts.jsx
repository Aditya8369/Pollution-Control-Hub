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
import { IMPACT_SECTORS, POLLUTANT_PARAMETERS } from './reportTypes';

const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#06b6d4', '#10b981'];

const ChartTooltip = ({ active, payload, label }) => {
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
 * Multi-pollutant line chart over months.
 */
const AirQualityTrendChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      🌬️ Air Quality Trends (12 Months)
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="pm10" name="PM10" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="no2" name="NO₂" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="o3" name="O₃" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Water quality comparison bar chart.
 */
const WaterQualityChart = ({ data }) => (
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
      💧 Water Quality Parameters
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Current Level" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.exceeds ? '#ef4444' : '#22c55e'} />
          ))}
        </Bar>
        <Bar dataKey="standard" name="Standard Limit" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.3} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Noise level area chart.
 */
const NoiseLevelChart = ({ data }) => (
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
      🔊 24-Hour Noise Levels
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="noiseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={3} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Day Limit', fill: '#f59e0b', fontSize: 9 }} />
        <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Night Limit', fill: '#ef4444', fontSize: 9 }} />
        <Area type="monotone" dataKey="level" name="Noise Level (dB)" stroke="#8b5cf6" fill="url(#noiseGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Economic impact breakdown pie chart.
 */
const EconomicImpactPie = ({ data }) => {
  const pieData = [
    { name: 'Healthcare', value: data.healthcareCost, color: '#ef4444' },
    { name: 'Lost Productivity', value: data.lostProductivity, color: '#f59e0b' },
    { name: 'Property Impact', value: data.propertyValueImpact, color: '#8b5cf6' },
    { name: 'Tourism Loss', value: data.tourismLoss, color: '#3b82f6' },
    { name: 'Remediation', value: data.environmentalRemediation, color: '#22c55e' },
  ];

  return (
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
        💰 Economic Impact Breakdown
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1 }}>
          {pieData.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.65rem', color: '#475569' }}>{entry.name}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#1e293b', marginLeft: 'auto' }}>
                ${(entry.value / 1000000).toFixed(0)}M
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Economic monthly trend bar chart.
 */
const EconomicTrendChart = ({ data }) => (
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
      📈 Monthly Economic Cost vs Savings
    </h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="savings" name="Savings" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Impact sector radar chart.
 */
const ImpactRadarChart = ({ sectors }) => {
  const data = sectors.map(s => ({
    sector: s.icon + ' ' + s.label.substring(0, 8),
    weight: s.weight * 100,
  }));

  return (
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
        🎯 Impact Sector Weighting
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="sector" tick={{ fontSize: 10, fill: '#64748b' }} />
          <PolarRadiusAxis angle={90} domain={[0, 30]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name="Weight" dataKey="weight" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

/**
 * Report type distribution pie.
 */
const ReportTypePie = ({ reports }) => {
  const typeCounts = {};
  reports.forEach(r => {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  });
  const data = Object.entries(typeCounts).map(([key, count], idx) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        📊 Reports by Type
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1 }}>
          {data.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.65rem', color: '#475569' }}>{entry.name}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1e293b', marginLeft: 'auto' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export {
  AirQualityTrendChart,
  WaterQualityChart,
  NoiseLevelChart,
  EconomicImpactPie,
  EconomicTrendChart,
  ImpactRadarChart,
  ReportTypePie,
  ChartTooltip,
};
