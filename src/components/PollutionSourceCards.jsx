import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MapPin,
  Wind,
  Thermometer,
  Droplets,
  Users,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  Shield,
  Activity,
  Radio,
  Bell,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  SOURCE_TYPES,
  POLLUTANT_TYPES,
  SEVERITY_LEVELS,
  SOURCE_STATUS,
  getSeverityConfig,
  getSourceTypeConfig,
  formatTimestamp,
} from './pollutionSourceTypes';

/**
 * Stat card with icon, value, label, and optional trend indicator.
 */
const StatCard = ({ icon: Icon, label, value, subValue, color = '#6366f1', trend, trendValue, delay = 0 }) => {
  const isPositive = trend === 'up';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.75rem',
              background: `${color}15`,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0, lineHeight: 1.2 }}>{value}</p>
          </div>
        </div>
        {trendValue !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              background: isPositive ? '#dcfce7' : '#fee2e2',
              color: isPositive ? '#16a34a' : '#dc2626',
            }}
          >
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
 * Pollution source card with status badge, severity, location, and pollutant summary.
 */
const SourceCard = ({ source, delay = 0, isSelected, onSelect, onExpand }) => {
  const [expanded, setExpanded] = useState(false);
  const sevConfig = getSeverityConfig(source.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={() => onSelect && onSelect(source)}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '1rem',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{source.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{source.name}</p>
              <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700, background: `${source.statusConfig.color}15`, color: source.statusConfig.color }}>
                {source.statusConfig.icon} {source.statusConfig.label}
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted, #94a3b8)', margin: '0.2rem 0 0' }}>
              <MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {source.location} • {source.coordinates}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: sevConfig.color,
              }}
            >
              {source.particulateMatter.toFixed(0)}
            </span>
            <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>PM µg/m³</p>
          </div>
        </div>

        {/* Quick metrics */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--muted, #64748b)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wind size={10} /> {source.windSpeed} m/s {source.windDirection}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Thermometer size={10} /> {source.temperature}°C</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Droplets size={10} /> {source.humidity}%</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={10} /> {(source.affectedPopulation / 1000).toFixed(0)}K</span>
        </div>

        {/* Severity bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ flex: 1, height: '0.35rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(source.particulateMatter / 3, 100)}%`,
              background: sevConfig.color,
              borderRadius: '9999px',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: sevConfig.color }}>{sevConfig.label}</span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); onExpand && onExpand(source); }}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.35rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            fontSize: '0.65rem',
            color: 'var(--muted, #94a3b8)',
          }}
        >
          {expanded ? 'Show less' : 'Show details'}
          <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          style={{ padding: '0 1.25rem 1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}
        >
          <div style={{ paddingTop: '0.75rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '0.5rem' }}>Pollutant Levels vs WHO Limits</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {Object.entries(source.pollutants).slice(0, 6).map(([key, p]) => {
                const config = POLLUTANT_TYPES[key];
                if (!config) return null;
                const pct = p.whoLimit ? Math.min((p.value / p.whoLimit) * 100, 150) : Math.min(p.value / 2, 100);
                return (
                  <div key={key} style={{ padding: '0.4rem', background: p.exceedsLimit ? '#fef2f2' : '#f8fafc', borderRadius: '0.5rem', border: p.exceedsLimit ? '1px solid #fecaca' : '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, color: config.color }}>{config.label}</span>
                      {p.exceedsLimit && <XCircle size={10} color="#ef4444" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: '0.15rem 0' }}>
                      {p.value.toFixed(1)} <span style={{ fontSize: '0.55rem', fontWeight: 500, color: '#94a3b8' }}>{p.unit}</span>
                    </p>
                    {p.whoLimit && (
                      <div style={{ height: '0.2rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: p.exceedsLimit ? '#ef4444' : '#22c55e', borderRadius: '9999px' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '9999px', color: '#64748b' }}>
                📍 Radius: {source.radius}m
              </span>
              <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '9999px', color: '#64748b' }}>
                🏫 Nearest school: {source.nearestSchool}km
              </span>
              <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '9999px', color: '#64748b' }}>
                🏥 Nearest hospital: {source.nearestHospital}km
              </span>
              <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '9999px', color: '#64748b' }}>
                📊 Reports: {source.reportCount}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Timeline event item for the event feed.
 */
const TimelineEvent = ({ event, delay = 0 }) => {
  const sevConfig = getSeverityConfig(event.severity);
  const typeConfig = getSourceTypeConfig(event.sourceType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        background: sevConfig.color === '#dc2626' ? '#fef2f2' : sevConfig.color === '#ef4444' ? '#fff7ed' : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '0.6rem',
        height: '0.6rem',
        borderRadius: '9999px',
        background: sevConfig.color,
        flexShrink: 0,
        marginTop: '0.3rem',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>
          {typeConfig.icon} {event.sourceName}
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted, #64748b)', margin: '0.2rem 0 0' }}>{event.event}</p>
        <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.2rem 0 0' }}>
          <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
          {event.timeLabel}
        </p>
      </div>
      <span style={{
        fontSize: '0.55rem',
        padding: '0.15rem 0.4rem',
        borderRadius: '9999px',
        fontWeight: 700,
        background: `${sevConfig.color}15`,
        color: sevConfig.color,
        flexShrink: 0,
      }}>
        {sevConfig.label}
      </span>
    </motion.div>
  );
};

/**
 * Severity summary badge row.
 */
const SeverityBadge = ({ severity, count, delay = 0 }) => {
  const config = getSeverityConfig(severity);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.75rem',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{config.icon}</span>
      <div>
        <p style={{ fontSize: '1rem', fontWeight: 800, color: config.color, margin: 0 }}>{count}</p>
        <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>{config.label}</p>
      </div>
    </motion.div>
  );
};

/**
 * Source type breakdown card.
 */
const SourceTypeCard = ({ typeData, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.6rem 0.75rem',
      borderRadius: '0.5rem',
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
    }}
  >
    <span style={{ fontSize: '1.25rem' }}>{typeData.icon}</span>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{typeData.label}</p>
      <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>{typeData.count} sources</p>
    </div>
    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: typeData.color }}>{typeData.count}</span>
  </motion.div>
);

/**
 * Active alert banner for critical/emergency sources.
 */
const AlertBanner = ({ source, delay = 0 }) => {
  const sevConfig = getSeverityConfig(source.severity);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
      }}
    >
      <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
          {source.name} — {sevConfig.label}
        </p>
        <p style={{ fontSize: '0.65rem', color: '#b91c1c', margin: '0.15rem 0 0' }}>
          PM: {source.particulateMatter.toFixed(0)} µg/m³ • Affected: {(source.affectedPopulation / 1000).toFixed(0)}K people
        </p>
      </div>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
        {sevConfig.icon} {sevConfig.label}
      </span>
    </motion.div>
  );
};

export {
  StatCard,
  SourceCard,
  TimelineEvent,
  SeverityBadge,
  SourceTypeCard,
  AlertBanner,
};
