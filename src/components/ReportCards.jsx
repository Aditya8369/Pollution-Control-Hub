import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useId, useState } from 'react';
import { formatReportTimestamp } from '../utils/localDay';

import { COMPLIANCE_STATUSES, formatCurrency } from './reportTypes';
import { DisclosureButton } from './ui/PressableCard';

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
 * Report list item card.
 */
const ReportItemCard = ({ report, delay = 0, isSelected, onSelect, timeZone }) => {
  const statusConfig = COMPLIANCE_STATUSES[report.status] || COMPLIANCE_STATUSES.pending_review;
  const progress = Math.round((report.sectionsCompleted / report.totalSections) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={() => onSelect && onSelect(report)}
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
          background: `${report.typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
        }}>
          {report.typeConfig.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title}</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--muted, #94a3b8)', margin: '0.15rem 0 0' }}>
            <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
             {formatReportTimestamp(report.date, timeZone)} • {report.author} • {report.pages} pages
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontSize: '1.2rem', fontWeight: 900,
            color: report.overallScore >= 80 ? '#22c55e' : report.overallScore >= 60 ? '#f59e0b' : '#ef4444',
          }}>{report.overallScore}</span>
          <span style={{ display: 'block', fontSize: '0.5rem', color: '#94a3b8' }}>Score</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
        <span style={{
          fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.4rem',
          borderRadius: '9999px', background: `${statusConfig.color}15`, color: statusConfig.color,
        }}>{statusConfig.icon} {statusConfig.label}</span>
        <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: '#f1f5f9', color: '#64748b' }}>
          {report.typeConfig.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: '#94a3b8' }}>
          {report.sectionsCompleted}/{report.totalSections} sections
        </span>
      </div>
      <div style={{ marginTop: '0.5rem', height: '0.25rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: report.overallScore >= 80 ? '#22c55e' : '#f59e0b', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
      </div>
    </motion.div>
  );
};

/**
 * Compliance status indicator card.
 */
const ComplianceCard = ({ item, delay = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const statusConfig = COMPLIANCE_STATUSES[item.status] || COMPLIANCE_STATUSES.pending_review;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '0.75rem', padding: '0.75rem 1rem', borderLeft: `3px solid ${statusConfig.color}`,
      }}
    >
      <DisclosureButton
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        controls={panelId}
        label={`${item.label} compliance detail, ${item.percentOfStandard || 'unknown'}% of standard`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <span aria-hidden="true" style={{ fontSize: '1rem' }}>{statusConfig.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{item.label}</p>
          <p style={{ fontSize: '0.6rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>
            Current: {item.currentValue} {item.unit} • Standard: {item.annualStandard} {item.unit}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: statusConfig.color }}>{item.percentOfStandard || '—'}%</span>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>of standard</p>
        </div>
        <ChevronDown aria-hidden="true" size={14} color="#94a3b8" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </DisclosureButton>
      {expanded && (
        <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', background: '#f8fafc', borderRadius: '9999px', color: '#64748b' }}>
              Trend: {item.trend === 'improving' ? '📈' : item.trend === 'worsening' ? '📉' : '➡️'} {item.trend}
            </span>
            <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', background: '#f8fafc', borderRadius: '9999px', color: '#64748b' }}>
              Annual Standard: {item.annualStandard} {item.unit}
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
    high: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
    medium: { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
    low: { bg: '#f0fdf4', border: '#d9f99d', color: '#166534' },
  };
  const style = priorityStyles[rec.priority] || priorityStyles.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '9999px', background: `${style.color}20`, color: style.color, textTransform: 'uppercase' }}>
          {rec.priority}
        </span>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: style.color, margin: 0 }}>{rec.title}</p>
      </div>
      <p style={{ fontSize: '0.65rem', color: style.color, margin: '0 0 0.4rem', opacity: 0.8 }}>{rec.description}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', background: '#fff', borderRadius: '9999px', color: '#64748b' }}>
          💰 {formatCurrency(rec.estimatedCost)}
        </span>
        <span style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', background: '#fff', borderRadius: '9999px', color: '#64748b' }}>
          ⏱ {rec.timeframe}
        </span>
        <span style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', background: '#fff', borderRadius: '9999px', color: '#64748b' }}>
          📉 {rec.expectedReduction}
        </span>
      </div>
    </motion.div>
  );
};

/**
 * Report executive summary card.
 */
const ExecutiveSummaryCard = ({ report, delay = 0, timeZone }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
      <FileText size={20} color="#6366f1" />
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>Executive Summary</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
      {[
        { label: 'Air Quality Score', value: `${report.overallScore}/100`, color: report.overallScore >= 80 ? '#22c55e' : '#f59e0b' },
        { label: 'Compliance Rate', value: `${report.sectionsCompleted}/${report.totalSections}`, color: '#6366f1' },
        { label: 'Report Date', value: formatReportTimestamp(report.date, timeZone), color: '#8b5cf6' },
      ].map((item, i) => (
        <div key={i} style={{ padding: '0.6rem', background: '#f8fafc', borderRadius: '0.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
          <p style={{ fontSize: '1rem', fontWeight: 800, color: item.color, margin: '0.2rem 0 0' }}>{item.value}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

/**
 * Section completion indicator.
 */
const SectionIndicator = ({ section, completed, delay = 0 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem',
    background: completed ? '#f0fdf4' : '#f8fafc', borderRadius: '0.375rem',
    border: completed ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
  }}>
    {completed ? <CheckCircle2 size={12} color="#22c55e" /> : <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid #d1d5db' }} />}
    <span style={{ fontSize: '0.65rem', color: completed ? '#166534' : '#64748b', fontWeight: completed ? 600 : 400 }}>
      {section.icon} {section.label}
    </span>
  </div>
);

export {
  ComplianceCard, ExecutiveSummaryCard, RecommendationCard, ReportItemCard, SectionIndicator, StatCard
};

