import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  Recycle,
  Truck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Factory,
  Leaf,
  Thermometer,
} from 'lucide-react';
import { WASTE_CATEGORIES, FACILITY_TYPES, WASTE_STATUS, formatTonnage, formatCurrency } from './wasteTypes';

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
 * Facility card with capacity gauge and status.
 */
const FacilityCard = ({ facility, delay = 0, isSelected, onSelect }) => {
  const loadColor = facility.currentLoad > 90 ? '#ef4444' : facility.currentLoad > 70 ? '#f59e0b' : '#22c55e';
  const statusColors = { operational: '#22c55e', maintenance: '#f59e0b', overcapacity: '#ef4444' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={() => onSelect && onSelect(facility)}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{facility.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facility.name}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>{facility.zoneName}</p>
        </div>
        <span style={{
          fontSize: '0.5rem', fontWeight: 700, padding: '0.15rem 0.35rem',
          borderRadius: '9999px', background: `${statusColors[facility.status] || '#94a3b8'}15`,
          color: statusColors[facility.status] || '#94a3b8', textTransform: 'uppercase',
        }}>{facility.status}</span>
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
          <span>Capacity: {facility.currentLoad.toFixed(0)}%</span>
          <span>{facility.dailyThroughput.toFixed(0)} tons/day</span>
        </div>
        <div style={{ height: '0.3rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${facility.currentLoad}%`, background: loadColor,
            borderRadius: '9999px', transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Zone stats card.
 */
const ZoneCard = ({ zone, delay = 0, isSelected, onSelect }) => {
  const complianceColors = { compliant: '#22c55e', marginal: '#f59e0b', non_compliant: '#ef4444' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={() => onSelect && onSelect(zone)}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <MapPin size={16} color={complianceColors[zone.compliance] || '#94a3b8'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{zone.name}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
            Pop: {(zone.population / 1000).toFixed(0)}K • {zone.type}
          </p>
        </div>
        <span style={{
          fontSize: '0.5rem', fontWeight: 700, padding: '0.15rem 0.35rem',
          borderRadius: '9999px', background: `${complianceColors[zone.compliance]}15`,
          color: complianceColors[zone.compliance],
        }}>{zone.compliance}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.6rem' }}>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{zone.dailyWaste.toFixed(0)}</p>
          <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>tons/day</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#f0fdf4', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', margin: 0 }}>{zone.recyclingRate.toFixed(0)}%</p>
          <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>recycling</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.25rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{zone.collectionEfficiency.toFixed(0)}%</p>
          <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>collected</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Category breakdown card.
 */
const CategoryCard = ({ cat, delay = 0 }) => {
  const trendIcons = { increasing: '📈', stable: '➡️', decreasing: '📉' };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.8rem',
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.5rem',
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{cat.label}</p>
        <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
          {cat.dailyTons.toFixed(0)} tons/day • {cat.recyclingRate.toFixed(0)}% recycled
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: cat.color }}>{cat.weeklyTons.toFixed(0)}</span>
        <p style={{ fontSize: '0.45rem', color: '#94a3b8', margin: 0 }}>tons/wk {trendIcons[cat.trend]}</p>
      </div>
    </motion.div>
  );
};

/**
 * Alert item card.
 */
const AlertCard = ({ alert, delay = 0 }) => {
  const sevColors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
  const color = sevColors[alert.severity] || '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem',
        borderRadius: '0.5rem', borderLeft: `3px solid ${color}`,
        background: alert.acknowledged ? '#f8fafc' : (alert.severity === 'critical' ? '#fef2f2' : alert.severity === 'high' ? '#fff7ed' : '#f8fafc'),
      }}
    >
      <AlertTriangle size={14} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{alert.text}</p>
        <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>{alert.zone}</p>
      </div>
      {alert.acknowledged && <CheckCircle2 size={14} color="#22c55e" style={{ flexShrink: 0 }} />}
    </motion.div>
  );
};

/**
 * Waste stream item card.
 */
const WasteStreamCard = ({ stream, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.2 }}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem',
      borderRadius: '0.5rem', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
    }}
  >
    <span style={{ fontSize: '1rem' }}>{stream.icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{stream.category} — {stream.zoneName}</p>
      <p style={{ fontSize: '0.55rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
        {stream.weight.toFixed(1)} tons • {stream.statusConfig.icon} {stream.statusConfig.label} • {stream.contaminationRate.toFixed(0)}% contaminated
      </p>
    </div>
  </motion.div>
);

/**
 * Diversion rate progress ring.
 */
const DiversionGauge = ({ current, target, label, delay = 0 }) => {
  const pct = Math.min(current / target, 1);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted, #64748b)', margin: '0 0 0.75rem' }}>{label}</p>
      <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 0.75rem' }}>
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={current >= target ? '#22c55e' : '#6366f1'} strokeWidth="8"
            strokeDasharray={`${pct * 251} 251`} strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: current >= target ? '#22c55e' : '#6366f1', margin: 0 }}>{current.toFixed(0)}%</p>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>of {target}%</p>
        </div>
      </div>
    </motion.div>
  );
};

export {
  StatCard,
  FacilityCard,
  ZoneCard,
  CategoryCard,
  AlertCard,
  WasteStreamCard,
  DiversionGauge,
};
