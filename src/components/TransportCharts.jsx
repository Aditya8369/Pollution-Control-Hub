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
} from 'recharts';
import { TRANSPORT_MODES, EMISSION_CATEGORIES } from './transportTypes';

const COLORS = ['#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#84cc16', '#fbbf24'];

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
 * Mode distribution pie chart.
 */
const ModePieChart = ({ data }) => {
  const pieData = data.filter(d => d.trips > 0).map(d => ({
    name: d.label,
    value: d.trips,
    color: d.color,
  })).slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        🚗 Transport Mode Distribution
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value">
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {pieData.slice(0, 6).map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.6rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ color: '#475569' }}>{entry.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1e293b' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Weekly CO2 emissions trend chart.
 */
const EmissionsTrendChart = ({ data }) => (
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
      🌍 Weekly CO₂ Emissions by Source
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="transportCO2" name="Transport" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
        <Area type="monotone" dataKey="powerCO2" name="Power" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
        <Area type="monotone" dataKey="industryCO2" name="Industry" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Emission category pie chart.
 */
const EmissionCategoryPie = () => {
  const data = Object.values(EMISSION_CATEGORIES).map(c => ({
    name: c.label,
    value: c.percentage,
    color: c.color,
  }));

  return (
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
        📊 City Emission Sources
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {data.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.6rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ color: '#475569' }}>{entry.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1e293b' }}>{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * District green score bar chart.
 */
const DistrictBarChart = ({ districts }) => (
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
      🗺️ District Green Score & Air Quality
    </h3>
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={districts}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-15} textAnchor="end" height={55} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="left" dataKey="greenScore" name="Green Score" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="airQualityIndex" name="AQI" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Mode CO2 comparison horizontal bar chart.
 */
const ModeCO2BarChart = ({ modes }) => (
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
      ⚖️ CO₂ Emissions per km by Mode
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={modes.filter(m => m.co2PerKm > 0).sort((a, b) => a.co2PerKm - b.co2PerKm)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="co2PerKm" name="kg CO₂/km" radius={[0, 6, 6, 0]}>
          {modes.filter(m => m.co2PerKm > 0).sort((a, b) => a.co2PerKm - b.co2PerKm).map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Green trips vs conventional trend.
 */
const GreenTripsTrend = ({ data }) => (
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
      🚴 Green vs Conventional Trips
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="greenTrips" name="Green Trips" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="conventionalTrips" name="Conventional" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.5} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  </motion.div>
);

export {
  ModePieChart,
  EmissionsTrendChart,
  EmissionCategoryPie,
  DistrictBarChart,
  ModeCO2BarChart,
  GreenTripsTrend,
  CustomTooltip,
};
