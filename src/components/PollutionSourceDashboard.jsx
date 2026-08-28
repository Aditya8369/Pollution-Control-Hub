import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  MapPin,
  Clock,
  AlertTriangle,
  Activity,
  Radio,
  Users,
  Wind,
  Filter,
  Search,
  ChevronDown,
  Eye,
  Shield,
} from 'lucide-react';

import {
  StatCard,
  SourceCard,
  TimelineEvent,
  SeverityBadge,
  SourceTypeCard,
  AlertBanner,
} from './PollutionSourceCards';

import {
  WeeklyTrendChart,
  SourceTypePie,
  AlertsVsResolvedChart,
  PopulationExposureChart,
  PollutantRadar,
  SeverityBar,
} from './PollutionSourceCharts';

import {
  generatePollutionSources,
  generateSourceTimeline,
  generateAlertSummary,
  generateWeeklyTrend,
} from './pollutionSourceData';

import {
  SOURCE_TYPES,
  SEVERITY_LEVELS,
  SOURCE_STATUS,
  getSeverityConfig,
} from './pollutionSourceTypes';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sources', label: 'Sources', icon: Radio },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: Activity },
];

/**
 * Filter bar with search and severity filter.
 */
const FilterBar = ({ search, setSearch, severityFilter, setSeverityFilter, typeFilter, setTypeFilter }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
    <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
      <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
      <input
        type="text"
        placeholder="Search sources, locations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          paddingLeft: '2.25rem',
          paddingRight: '1rem',
          paddingTop: '0.6rem',
          paddingBottom: '0.6rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)',
          fontSize: '0.8rem',
          color: 'var(--text-primary, #1e293b)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
    <div style={{ position: 'relative' }}>
      <Filter size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
      <select
        value={severityFilter}
        onChange={(e) => setSeverityFilter(e.target.value)}
        style={{
          paddingLeft: '2rem',
          paddingRight: '2rem',
          paddingTop: '0.6rem',
          paddingBottom: '0.6rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)',
          fontSize: '0.8rem',
          color: 'var(--text-primary, #1e293b)',
          appearance: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="all">All Severities</option>
        {Object.entries(SEVERITY_LEVELS).map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>
    </div>
    <div style={{ position: 'relative' }}>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        style={{
          paddingLeft: '1rem',
          paddingRight: '2rem',
          paddingTop: '0.6rem',
          paddingBottom: '0.6rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)',
          fontSize: '0.8rem',
          color: 'var(--text-primary, #1e293b)',
          appearance: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="all">All Types</option>
        {Object.entries(SOURCE_TYPES).map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>
    </div>
  </div>
);

/**
 * Overview tab with stats, alert banners, severity badges, and charts.
 */
const OverviewTab = ({ sources, alertSummary, weeklyData }) => {
  const criticalSources = sources.filter(s => s.severity === 'critical' || s.severity === 'emergency');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Radio} label="Active Sources" value={alertSummary.activeSources} subValue={`${sources.length} total monitored`} color="#ef4444" delay={0} />
        <StatCard icon={AlertTriangle} label="Critical Alerts" value={alertSummary.criticalAlerts} color="#dc2626" delay={0.05} />
        <StatCard icon={Users} label="Population Exposed" value={`${(alertSummary.totalAffectedPopulation / 1000).toFixed(0)}K`} color="#8b5cf6" delay={0.1} />
        <StatCard icon={Activity} label="Avg PM Level" value={`${alertSummary.avgParticulateMatter}`} subValue="µg/m³ across sources" color="#f59e0b" delay={0.15} />
      </div>

      {/* Critical alerts */}
      {criticalSources.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.25rem' }}>🚨 Critical Alerts ({criticalSources.length})</p>
          {criticalSources.slice(0, 3).map((src, i) => (
            <AlertBanner key={src.id} source={src} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Severity badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {alertSummary.sourcesBySeverity.map((s, i) => (
          <SeverityBadge key={s.severity} severity={s.severity} count={s.count} delay={i * 0.05} />
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <WeeklyTrendChart data={weeklyData} />
        <SourceTypePie sources={sources} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <AlertsVsResolvedChart data={weeklyData} />
        <PopulationExposureChart data={weeklyData} />
      </div>
    </div>
  );
};

/**
 * Sources tab with filtered card grid and detail panel.
 */
const SourcesTab = ({ sources, search, severityFilter, typeFilter }) => {
  const [selectedSource, setSelectedSource] = useState(null);

  const filtered = useMemo(() => {
    return sources.filter(s => {
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.location.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sources, severityFilter, typeFilter, search]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedSource ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>
          {filtered.length} Sources {severityFilter !== 'all' && `• ${SEVERITY_LEVELS[severityFilter]?.label}`} {typeFilter !== 'all' && `• ${SOURCE_TYPES[typeFilter]?.label}`}
        </p>
        {filtered.map((src, i) => (
          <SourceCard
            key={src.id}
            source={src}
            delay={i * 0.03}
            isSelected={selectedSource?.id === src.id}
            onSelect={setSelectedSource}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted, #94a3b8)' }}>
            <Filter size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.85rem' }}>No sources match your filters</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedSource && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            position: 'sticky',
            top: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{selectedSource.icon}</span>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{selectedSource.name}</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted, #94a3b8)', margin: '0.2rem 0 0' }}>{selectedSource.location}</p>
            </div>
            <button
              onClick={() => setSelectedSource(null)}
              style={{ marginLeft: 'auto', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
            >
              ✕
            </button>
          </div>

          <PollutantRadar source={selectedSource} />

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '0.5rem' }}>Quick Info</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Status', value: `${selectedSource.statusConfig.icon} ${selectedSource.statusConfig.label}` },
                { label: 'Severity', value: `${selectedSource.severityConfig.icon} ${selectedSource.severityConfig.label}` },
                { label: 'Wind', value: `${selectedSource.windSpeed} m/s ${selectedSource.windDirection}` },
                { label: 'Temperature', value: `${selectedSource.temperature}°C` },
                { label: 'Humidity', value: `${selectedSource.humidity}%` },
                { label: 'Radius', value: `${selectedSource.radius}m` },
                { label: 'Affected Pop.', value: `${(selectedSource.affectedPopulation / 1000).toFixed(0)}K` },
                { label: 'Reports', value: selectedSource.reportCount },
              ].map((item, i) => (
                <div key={i} style={{ padding: '0.4rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: '0.1rem 0 0' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mini trend */}
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '0.5rem' }}>24h PM Trend</p>
            <TrendBars trend={selectedSource.historicalTrend} />
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * The 24-hour PM trend, as bars scaled to the series maximum.
 *
 * `maxVal` used to be computed inside the map, so `Math.max` ran over the whole series
 * once per bar. Pulling the series into its own component is the tidiest place to hoist
 * it — there is no room for a `const` inside the JSX expression it lived in.
 */
const TrendBars = ({ trend }) => {
  const values = Array.isArray(trend) ? trend : [];
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '50px' }} data-testid="trend-bars">
      {values.map((val, i) => {
        const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const color = val > 100 ? '#ef4444' : val > 50 ? '#f59e0b' : '#22c55e';
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${height}%`,
              background: color,
              borderRadius: '2px 2px 0 0',
              minHeight: '2px',
              transition: 'height 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Timeline tab with event feed.
 */
const TimelineTab = ({ timeline, sources }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
    <div style={{
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 1rem' }}>
        ⏱️ Event Timeline ({timeline.length} events)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
        {timeline.map((event, i) => (
          <TimelineEvent key={event.id} event={event} delay={i * 0.02} />
        ))}
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
      {/* The dashboard's own sources, not a fresh random draw. Calling the
          generator here gave this chart twenty sources unrelated to the ones
          every other tab counts — and, because the call sat in the render body,
          a different twenty on every keystroke in the search box. */}
      <SeverityBar sources={sources} />
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>ℹ️ About Timeline</h3>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted, #64748b)', margin: 0, lineHeight: 1.5 }}>
          Events are generated from monitoring stations, community reports, and automated detection systems.
          Critical events trigger immediate notifications to affected communities.
        </p>
      </div>
    </div>
  </div>
);

/**
 * Analytics tab with comprehensive charts.
 */
const AnalyticsTab = ({ sources, weeklyData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <WeeklyTrendChart data={weeklyData} />
      <SourceTypePie sources={sources} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <AlertsVsResolvedChart data={weeklyData} />
      <SeverityBar sources={sources} />
    </div>
    <PopulationExposureChart data={weeklyData} />
  </div>
);

/**
 * Main Pollution Source Dashboard component.
 */
const PollutionSourceDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const sources = useMemo(() => generatePollutionSources(20), []);
  const timeline = useMemo(() => generateSourceTimeline(sources), [sources]);
  const alertSummary = useMemo(() => generateAlertSummary(sources), [sources]);
  const weeklyData = useMemo(() => generateWeeklyTrend(8), []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab sources={sources} alertSummary={alertSummary} weeklyData={weeklyData} />;
      case 'sources':
        return <SourcesTab sources={sources} search={search} severityFilter={severityFilter} typeFilter={typeFilter} />;
      case 'timeline':
        return <TimelineTab timeline={timeline} sources={sources} />;
      case 'analytics':
        return <AnalyticsTab sources={sources} weeklyData={weeklyData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #f8fafc)',
      padding: '1.5rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--text-primary, #1e293b)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Radio size={22} />
                </span>
                Pollution Source Tracker
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0.25rem 0 0 0 3.25rem' }}>
                Real-time monitoring and tracking of pollution sources across your region
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '0.75rem',
                background: '#dcfce7',
                color: '#16a34a',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', animation: 'pulse 2s infinite' }} />
                Live Monitoring
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '0.75rem',
                  border: isActive ? 'none' : '1px solid var(--border-color, #e2e8f0)',
                  background: isActive ? '#6366f1' : 'var(--bg-card, #ffffff)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Filter bar */}
        {(activeTab === 'sources' || activeTab === 'overview') && (
          <FilterBar
            search={search}
            setSearch={setSearch}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />
        )}

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PollutionSourceDashboard;
