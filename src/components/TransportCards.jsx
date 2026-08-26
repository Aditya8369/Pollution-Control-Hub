import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  Zap,
  Leaf,
  DollarSign,
  Activity,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  Thermometer,
  Users,
  Bike,
} from 'lucide-react';
import { TRANSPORT_MODES, formatEmissions, formatDistance, formatDuration } from './transportTypes';

/**
 * Stat card with icon, value, label, and trend.
 */
const StatCard = ({ icon: Icon, label, value, subValue, color = '#6366f1', trend, trendValue, delay = 0 }) => {
  const isPositive = trend === 'up';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
            background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0, lineHeight: 1.2 }}>{value}</p>
          </div>
        </div>
        {trendValue !== undefined && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '9999px',
            background: isPositive ? '#dcfce7' : '#fee2e2', color: isPositive ? '#16a34a' : '#dc2626',
          }}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trendValue)}%
          </span>
        )}
      </div>
      {subValue && <p style={{ fontSize: '0.7rem', color: 'var(--muted, #94a3b8)', margin: '0.5rem 0 0' }}>{subValue}</p>}
    </motion.div>
  );
};

/**
 * Mode comparison row card for the planner.
 */
const ModeComparisonCard = ({ mode, rank, delay = 0 }) => {
  const healthColors = { excellent: '#22c55e', good: '#f59e0b', low: '#94a3b8' };
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem',
        borderRadius: '0.5rem', background: rank === 0 ? '#f0fdf4' : 'var(--bg-card, #ffffff)',
        border: rank === 0 ? '1px solid #bbf7d0' : '1px solid var(--border-color, #e2e8f0)',
      }}
    >
      <span style={{
        width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 800, background: rank === 0 ? '#22c55e' : rank < 3 ? '#f59e0b' : '#e2e8f0',
        color: rank < 3 ? '#fff' : '#64748b', flexShrink: 0,
      }}>{rank + 1}</span>
      <span style={{ fontSize: '1.1rem' }}>{mode.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{mode.label}</p>
        <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
          {formatDuration(mode.duration)} • {formatDistance(mode.distance)}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: mode.co2 === 0 ? '#22c55e' : '#ef4444', margin: 0 }}>
            {mode.co2 === 0 ? '0' : mode.co2.toFixed(1)}
          </p>
          <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>kg CO₂</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {mode.cost === 0 ? 'Free' : `$${mode.cost.toFixed(2)}`}
          </p>
          <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>cost</p>
        </div>
        {mode.calories > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>{Math.round(mode.calories)}</p>
            <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>cal</p>
          </div>
        )}
        {rank === 0 && <Leaf size={14} color="#22c55e" />}
      </div>
    </motion.div>
  );
};

/**
 * District infrastructure card.
 */
const DistrictCard = ({ district, delay = 0, isSelected, onSelect }) => {
  const aqiColor = district.airQualityIndex > 150 ? '#ef4444' : district.airQualityIndex > 100 ? '#f59e0b' : '#22c55e';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={() => onSelect && onSelect(district)}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <MapPin size={16} color={aqiColor} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{district.name}</p>
          <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
            Pop: {(district.population / 1000).toFixed(0)}K • {district.area} km²
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem',
            borderRadius: '9999px', background: `${aqiColor}15`, color: aqiColor,
          }}>AQI {district.airQualityIndex}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.6rem' }}>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#f0fdf4', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#16a34a', margin: 0 }}>{district.bikeLanes}</p>
          <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>bike lanes</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#eff6ff', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', margin: 0 }}>{district.evChargers}</p>
          <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>EV chargers</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#f5f3ff', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8b5cf6', margin: 0 }}>{district.transitStops}</p>
          <p style={{ fontSize: '0.4rem', color: '#94a3b8', margin: 0 }}>transit stops</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Alternative fuel card.
 */
const FuelCard = ({ fuel, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25 }}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem',
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '0.5rem', borderLeft: `3px solid ${fuel.color}`,
    }}
  >
    <span style={{ fontSize: '1.2rem' }}>{fuel.icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{fuel.label}</p>
      <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
        {fuel.stations} stations • {fuel.adoptionRate.toFixed(1)}% adoption
      </p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#22c55e', margin: 0 }}>-{fuel.co2Reduction}%</p>
      <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>CO₂ reduction</p>
    </div>
  </motion.div>
);

/**
 * Goal progress card with gauge.
 */
const GoalCard = ({ goal, delay = 0 }) => {
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const isComplete = goal.current >= goal.target;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{goal.icon}</span>
      <p style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)', margin: '0.3rem 0 0' }}>{goal.label}</p>
      <p style={{ fontSize: '1.1rem', fontWeight: 900, color: isComplete ? '#22c55e' : '#6366f1', margin: '0.2rem 0' }}>
        {typeof goal.current === 'number' && goal.current > 1000 ? `${(goal.current / 1000).toFixed(0)}K` : goal.current.toFixed(1)}{goal.unit === '%' ? '%' : ''}
      </p>
      <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>of {goal.target.toLocaleString()} {goal.unit}</p>
      <div style={{ height: '0.25rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', marginTop: '0.3rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: isComplete ? '#22c55e' : '#6366f1', borderRadius: '9999px' }} />
      </div>
    </motion.div>
  );
};

/**
 * Air quality zone card.
 */
const AirQualityZoneCard = ({ zone, delay = 0 }) => {
  const color = zone.aqi > 150 ? '#ef4444' : zone.aqi > 100 ? '#f59e0b' : '#22c55e';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem', borderLeft: `3px solid ${color}`,
        background: zone.aqi > 150 ? '#fef2f2' : zone.aqi > 100 ? '#fffbeb' : '#f0fdf4',
      }}
    >
      <MapPin size={14} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{zone.name}</p>
        <p style={{ fontSize: '0.5rem', color: 'var(--muted, #94a3b8)', margin: '0.05rem 0 0' }}>
          Green transport: {zone.greenTransportShare.toFixed(0)}% • EV: {zone.evPercentage.toFixed(0)}%
        </p>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 900, color }}>{zone.aqi}</span>
    </motion.div>
  );
};

export {
  StatCard,
  ModeComparisonCard,
  DistrictCard,
  FuelCard,
  GoalCard,
  AirQualityZoneCard,
};
