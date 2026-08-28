import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Lightbulb,
  Shield,
  TrendingUp,
  Users,
  Wind
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  ComplianceCard,
  ExecutiveSummaryCard,
  RecommendationCard,
  ReportItemCard,
  SectionIndicator,
  StatCard,
} from './ReportCards';

import {
  AirQualityTrendChart,
  EconomicImpactPie,
  EconomicTrendChart,
  ImpactRadarChart,
  NoiseLevelChart,
  ReportTypePie,
  WaterQualityChart,
} from './ReportCharts';

import {
  generateAirQualityData,
  generateComplianceData,
  generateEconomicImpactData,
  generateHealthImpactData,
  generateNoiseData,
  generateRecommendations,
  generateReportList,
  generateReportSummary,
  generateWaterQualityData,
} from './reportData';

import {
  REPORT_TYPES,
  SECTIONS,
  formatCurrency,
  formatNumber
} from './reportTypes';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'air_water', label: 'Air & Water', icon: Wind },
  { id: 'economic', label: 'Economic', icon: DollarSign },
  { id: 'compliance', label: 'Compliance', icon: Shield },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
];

/**
 * Overview tab with stats, summary, charts.
 */
const OverviewTab = ({ summary, airData, healthData, economicData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard icon={FileText} label="Total Reports" value={summary.totalReports} subValue="Across all types" color="#6366f1" delay={0} />
      <StatCard icon={CheckCircle2} label="Compliant" value={summary.compliantReports} subValue={`${Math.round(summary.compliantReports / summary.totalReports * 100)}% compliance rate`} color="#22c55e" delay={0.05} />
      <StatCard icon={AlertTriangle} label="Non-Compliant" value={summary.nonCompliantReports} color="#ef4444" delay={0.1} />
      <StatCard icon={TrendingUp} label="Avg Score" value={`${summary.avgScore}/100`} color="#f59e0b" delay={0.15} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard icon={Users} label="Population Exposed" value={formatNumber(healthData.totalExposedPopulation)} color="#8b5cf6" delay={0.2} />
      <StatCard icon={DollarSign} label="Total Economic Cost" value={`$${(economicData.totalCost / 1000000).toFixed(0)}M`} color="#ef4444" delay={0.25} />
      <StatCard icon={Wind} label="Respiratory Cases" value={formatNumber(healthData.respiratoryCases)} subValue={`${healthData.trends.respiratoryCasesChange > 0 ? '↑' : '↓'} ${Math.abs(healthData.trends.respiratoryCasesChange).toFixed(1)}%`} trend={healthData.trends.respiratoryCasesChange > 0 ? 'down' : 'up'} trendValue={Math.abs(healthData.trends.respiratoryCasesChange)} color="#f59e0b" delay={0.3} />
      <StatCard icon={Lightbulb} label="Green Jobs Created" value={formatNumber(economicData.greenJobsCreated)} color="#22c55e" delay={0.35} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <AirQualityTrendChart data={airData} />
      <ReportTypePie reports={summary.recentReports} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <EconomicImpactPie data={economicData} />
      <ImpactRadarChart sectors={economicData.sectorBreakdown} />
    </div>
  </div>
);

/**
 * Reports tab with report list and detail panel.
 */
const ReportsTab = ({ reports, summary, timeZone }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = typeFilter === 'all' ? reports : reports.filter(r => r.type === typeFilter);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button
            onClick={() => setTypeFilter('all')}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: typeFilter === 'all' ? '#6366f1' : '#f1f5f9', color: typeFilter === 'all' ? '#fff' : '#64748b',
            }}
          >All ({reports.length})</button>
          {Object.entries(REPORT_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: typeFilter === key ? val.color : '#f1f5f9', color: typeFilter === key ? '#fff' : '#64748b',
              }}
            >{val.icon} {val.label}</button>
          ))}
        </div>
        {filtered.map((rpt, i) => (
          <ReportItemCard key={rpt.id} report={rpt} delay={i * 0.03} isSelected={selectedReport?.id === rpt.id} onSelect={setSelectedReport} timeZone={timeZone}/>
        ))}
      </div>
      {selectedReport && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <ExecutiveSummaryCard report={selectedReport} timeZone={timeZone}/>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>📋 Sections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {Object.entries(SECTIONS).map(([key, sec]) => (
                <SectionIndicator key={key} section={sec} completed={Object.keys(SECTIONS).indexOf(key) < selectedReport.sectionsCompleted} />
              ))}
            </div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.75rem', borderRadius: '0.75rem', background: '#6366f1', color: '#fff',
            fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
          }}><Download size={16} /> Export Report as PDF</button>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Air & Water tab with air trend, water quality, noise level charts.
 */
const AirWaterTab = ({ airData, waterData, noiseData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <AirQualityTrendChart data={airData} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <WaterQualityChart data={waterData} />
      <NoiseLevelChart data={noiseData} />
    </div>
  </div>
);

/**
 * Economic tab with cost breakdown, trend, and impact sectors.
 */
const EconomicTab = ({ economicData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard icon={DollarSign} label="Total Annual Cost" value={`$${(economicData.totalCost / 1000000).toFixed(0)}M`} color="#ef4444" delay={0} />
      <StatCard icon={Users} label="Cost Per Capita" value={`$${economicData.costPerCapita}`} color="#8b5cf6" delay={0.05} />
      <StatCard icon={TrendingUp} label="GDP Impact" value={`${economicData.gdpImpact.toFixed(2)}%`} color="#f59e0b" delay={0.1} />
      <StatCard icon={Lightbulb} label="Clean Tech Investment" value={`$${(economicData.investmentInCleanTech / 1000000).toFixed(0)}M`} color="#22c55e" delay={0.15} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      <EconomicImpactPie data={economicData} />
      <ImpactRadarChart sectors={economicData.sectorBreakdown} />
    </div>
    <EconomicTrendChart data={economicData.monthlyTrend} />
  </div>
);

/**
 * Compliance tab with compliance cards for each pollutant.
 */
const ComplianceTab = ({ complianceData }) => {
  const compliant = complianceData.filter(c => c.status === 'compliant').length;
  const nonCompliant = complianceData.filter(c => c.status === 'non_compliant').length;
  const marginal = complianceData.filter(c => c.status === 'marginal').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a', margin: 0 }}>{compliant}</p>
          <p style={{ fontSize: '0.7rem', color: '#166534', margin: '0.2rem 0 0' }}>✅ Compliant</p>
        </div>
        <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#92400e', margin: 0 }}>{marginal}</p>
          <p style={{ fontSize: '0.7rem', color: '#92400e', margin: '0.2rem 0 0' }}>⚠️ Marginal</p>
        </div>
        <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#991b1b', margin: 0 }}>{nonCompliant}</p>
          <p style={{ fontSize: '0.7rem', color: '#991b1b', margin: '0.2rem 0 0' }}>❌ Non-Compliant</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.25rem' }}>📋 Regulatory Compliance Status</p>
        {complianceData.map((item, i) => (
          <ComplianceCard key={item.parameter} item={item} delay={i * 0.03} />
        ))}
      </div>
    </div>
  );
};

/**
 * Recommendations tab with prioritized action items.
 */
const RecommendationsTab = ({ recommendations, complianceData }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.25rem' }}>💡 Actionable Recommendations ({recommendations.length})</p>
      {recommendations.map((rec, i) => (
        <RecommendationCard key={rec.id} rec={rec} delay={i * 0.05} />
      ))}
    </div>
    <div style={{ position: 'sticky', top: '1rem' }}>
      <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>📊 Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>High Priority</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{recommendations.filter(r => r.priority === 'high').length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Medium Priority</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b' }}>{recommendations.filter(r => r.priority === 'medium').length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Est. Cost</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(recommendations.reduce((s, r) => s + r.estimatedCost, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Main Impact Report Dashboard component.
 */
const ImpactReportDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
   const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone,[]);
  const reports = useMemo(() => generateReportList(12,timeZone), []);
  const summary = useMemo(() => generateReportSummary(reports), [reports]);
  const airData = useMemo(() => generateAirQualityData(), []);
  const waterData = useMemo(() => generateWaterQualityData(), []);
  const noiseData = useMemo(() => generateNoiseData(), []);
  const healthData = useMemo(() => generateHealthImpactData(), []);
  const economicData = useMemo(() => generateEconomicImpactData(), []);
  const complianceData = useMemo(() => generateComplianceData(), []);
  const recommendations = useMemo(() => generateRecommendations(complianceData), [complianceData]);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab summary={summary} airData={airData} healthData={healthData} economicData={economicData} />;
      case 'reports':
        return <ReportsTab reports={reports} summary={summary} timeZone={timeZone}/>;
      case 'air_water':
        return <AirWaterTab airData={airData} waterData={waterData} noiseData={noiseData} />;
      case 'economic':
        return <EconomicTab economicData={economicData} />;
      case 'compliance':
        return <ComplianceTab complianceData={complianceData} />;
      case 'recommendations':
        return <RecommendationsTab recommendations={recommendations} complianceData={complianceData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary, #1e293b)',
                margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <span style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={22} />
                </span>
                Impact Report Generator
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0.25rem 0 0 3.25rem' }}>
                Generate comprehensive environmental impact reports with actionable insights
              </p>
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem',
              borderRadius: '0.75rem', background: '#6366f1', color: '#fff',
              fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}>
              <Download size={16} /> Generate New Report
            </button>
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
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1rem', borderRadius: '0.75rem',
                  border: isActive ? 'none' : '1px solid var(--border-color, #e2e8f0)',
                  background: isActive ? '#6366f1' : 'var(--bg-card, #ffffff)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </motion.div>

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

export default ImpactReportDashboard;
