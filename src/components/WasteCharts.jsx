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
import { WASTE_CATEGORIES, FACILITY_TYPES } from './wasteTypes';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#10b981', '#f97316', '#94a3b8'];

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
 * Weekly waste collection area chart.
 */
const WeeklyCollectionChart = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
      🗑️ Weekly Waste Collection
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="totalCollected" name="Total Collected (tons)" stroke="#6366f1" fill="url(#collGrad)" strokeWidth={2} />
        <Line type="monotone" dataKey="landfilled" name="Landfilled" stroke="#ef4444" strokeWidth={1.5} dot={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Diversion rate trend line chart.
 */
const DiversionTrendChart = ({ data }) => (
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
      ♻️ Diversion Rate Trend
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="diversionRate" name="Diversion Rate %" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Category breakdown pie chart.
 */
const CategoryPieChart = ({ categories }) => {
  const data = categories.map((c, i) => ({
    name: c.label,
    value: c.weeklyTons,
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
        📊 Waste by Category
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {data.slice(0, 7).map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.6rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ color: '#475569' }}>{entry.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1e293b' }}>{entry.value.toFixed(0)}t</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Monthly cost vs revenue bar chart.
 */
const CostRevenueChart = ({ data }) => (
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
      💰 Monthly Cost vs Revenue
    </h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Emissions stacked area chart.
 */
const EmissionsChart = ({ data }) => (
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
      🌍 Monthly Emissions by Source
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="landfill" name="Landfill" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.6} />
        <Area type="monotone" dataKey="incineration" name="Incineration" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
        <Area type="monotone" dataKey="transport" name="Transport" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/**
 * Zone recycling comparison bar chart.
 */
const ZoneComparisonChart = ({ zones }) => (
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
      🗺️ Zone Recycling Rates
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={zones}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="recyclingRate" name="Recycling %" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="compostingRate" name="Composting %" fill="#84cc16" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

export {
  WeeklyCollectionChart,
  DiversionTrendChart,
  CategoryPieChart,
  CostRevenueChart,
  EmissionsChart,
  ZoneComparisonChart,
  CustomTooltip,
};
