import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Heart,
  Brain,
  Activity,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  MapPin,
  Clock,
  Thermometer,
} from 'lucide-react';

import {
  RISK_CATEGORIES,
  VULNERABLE_GROUPS,
  HEALTH_OUTCOMES,
  RECOMMENDATION_LEVELS,
  getAQIBand,
  getRiskScore,
} from './healthRiskTypes';
import { DisclosureButton } from './ui/PressableCard';

/**
 * Stat card with icon, value, and optional trend.
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
 * AQI gauge card with color-coded band and recommendation.
 */
const AQIGaugeCard = ({ aqi, city, delay = 0 }) => {
  const band = getAQIBand(aqi);
  const rec = RECOMMENDATION_LEVELS[band.recommendation];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted, #64748b)', margin: '0 0 0.5rem' }}>Air Quality Index</p>
      <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 1rem' }}>
        <svg viewBox="0 0 120 120" width="140" height="140">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke={band.color}
            strokeWidth="10"
            strokeDasharray={`${Math.min(aqi / 500, 1) * 314} 314`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: band.color, margin: 0 }}>{aqi}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>{band.label}</p>
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: band.color, margin: '0 0 0.25rem' }}>{rec.icon} {rec.label}</p>
      <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
        {rec.actions.slice(0, 3).map((action, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0', fontSize: '0.65rem', color: 'var(--text-secondary, #475569)' }}>
            <CheckCircle2 size={10} color={band.color} />
            {action}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * City risk comparison card.
 */
const CityRiskCard = ({ city, delay = 0, isSelected, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25 }}
    onClick={() => onSelect && onSelect(city)}
    style={{
      background: 'var(--bg-card, #ffffff)',
      border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <MapPin size={16} color={city.band.color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{city.name}</p>
        <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
          Pop at risk: {(city.vulnerablePopulation / 1000).toFixed(0)}K
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: '1.1rem', fontWeight: 900, color: city.band.color,
        }}>{city.aqi}</span>
        <span style={{
          display: 'block', fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.4rem',
          borderRadius: '9999px', background: `${city.band.color}15`, color: city.band.color,
        }}>{city.band.label}</span>
      </div>
    </div>
    {/* AQI mini bar */}
    <div style={{ marginTop: '0.5rem', height: '0.3rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(city.aqi / 5, 100)}%`, background: city.band.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
    </div>
  </motion.div>
);

/**
 * Vulnerable group risk card.
 */
const VulnerableGroupCard = ({ group, delay = 0 }) => {
  const riskColors = { low: '#22c55e', moderate: '#f59e0b', high: '#f97316', critical: '#ef4444' };
  const color = riskColors[group.riskLevel] || '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.75rem',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{group.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{group.label}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>{group.description}</p>
        </div>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, padding: '0.2rem 0.5rem',
          borderRadius: '9999px', background: `${color}15`, color,
        }}>
          {group.riskLevel.toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '0.3rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{(group.population / 1000).toFixed(0)}K</p>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>Population</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.3rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color, margin: 0 }}>{group.symptomsReported.toLocaleString()}</p>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>Symptoms</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.3rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>{group.hospitalizations}</p>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>Hospitalized</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Pollutant health effects card.
 */
const PollutantEffectCard = ({ pollutant, delay = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const riskColor = pollutant.riskLevel === 'high' ? '#ef4444' : pollutant.riskLevel === 'moderate' ? '#f59e0b' : '#22c55e';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        borderLeft: `3px solid ${riskColor}`,
      }}
    >
      <DisclosureButton
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        controls={panelId}
        label={`${pollutant.label} health risks, ${pollutant.riskLevel} risk`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{pollutant.label}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
            Level: {pollutant.currentLevel.toFixed(1)} • {pollutant.affectedPopulation.toLocaleString()} affected
          </p>
        </div>
        <span style={{
          fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.4rem',
          borderRadius: '9999px', background: `${riskColor}15`, color: riskColor,
        }}>
          {pollutant.riskLevel.toUpperCase()}
        </span>
        <ChevronDown aria-hidden="true" size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </DisclosureButton>
      {expanded && (
        <motion.div
          id={panelId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          style={{ marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}
        >
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.4rem' }}>Health Risks:</p>
          {pollutant.risks.map((risk, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0', fontSize: '0.6rem', color: 'var(--text-secondary, #475569)' }}>
              <AlertTriangle size={10} color={riskColor} />
              {risk}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '9999px', color: '#64748b' }}>
              Est. cases: {pollutant.estimatedCases.toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Recommendation action card.
 */
const RecommendationCard = ({ rec, delay = 0 }) => {
  const priorityStyles = {
    safe: { bg: '#dcfce7', border: '#bbf7d0', color: '#166534' },
    normal: { bg: '#f0fdf4', border: '#d9f99d', color: '#3f6212' },
    important: { bg: '#fef3c7', border: '#fde68a', color: '#92400e' },
    required: { bg: '#fee2e2', border: '#fecaca', color: '#991b1b' },
    critical: { bg: '#fef2f2', border: '#fca5a5', color: '#7f1d1d' },
    restrict: { bg: '#ffedd5', border: '#fed7aa', color: '#9a3412' },
    recommended: { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
    optional: { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
    indoor_only: { bg: '#fee2e2', border: '#fecaca', color: '#991b1b' },
    reduced: { bg: '#fef3c7', border: '#fde68a', color: '#92400e' },
    increase: { bg: '#dbeafe', border: '#bfdbfe', color: '#1e40af' },
    check: { bg: '#f3e8ff', border: '#d8b4fe', color: '#6b21a8' },
  };
  const style = priorityStyles[rec.priority] || priorityStyles.normal;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{
        padding: '0.6rem 0.8rem',
        borderRadius: '0.5rem',
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: style.color, margin: 0 }}>{rec.label}</p>
      <p style={{ fontSize: '0.65rem', color: style.color, margin: '0.2rem 0 0', opacity: 0.8 }}>{rec.description}</p>
    </motion.div>
  );
};

/**
 * Health outcome risk meter.
 */
const RiskMeter = ({ label, score, maxScore = 5, color, delay = 0 }) => {
  const pct = (score / maxScore) * 100;
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #475569)' }}>{label}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{score.toFixed(1)}/{maxScore}</span>
      </div>
      <div style={{ height: '0.35rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '9999px' }}
        />
      </div>
    </div>
  );
};

export {
  StatCard,
  AQIGaugeCard,
  CityRiskCard,
  VulnerableGroupCard,
  PollutantEffectCard,
  RecommendationCard,
  RiskMeter,
};
