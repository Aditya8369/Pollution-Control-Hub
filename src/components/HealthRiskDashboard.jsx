import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Shield,
  Heart,
  Users,
  MapPin,
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Thermometer,
  Eye,
  Filter,
  Search,
  ChevronDown,
} from 'lucide-react';

import {
  StatCard,
  AQIGaugeCard,
  CityRiskCard,
  VulnerableGroupCard,
  PollutantEffectCard,
  RecommendationCard,
  RiskMeter,
} from './HealthRiskCards';

import {
  AQITrendChart,
  RiskCategoryRadar,
  CityComparisonChart,
  VulnerableGroupChart,
  PollutantRiskPie,
  HourlyAQIChart,
} from './HealthRiskCharts';

import {
  generatePersonalRiskProfile,
  generateCityRiskData,
  generateHealthOutcomesByPollutant,
  generateVulnerableGroupBreakdown,
  generateDailyRiskTimeline,
  generateHourlyAQI,
  generateRecommendations,
  generateRiskTrend,
} from './healthRiskData';

import {
  RISK_CATEGORIES,
  VULNERABLE_GROUPS,
  getAQIBand,
  getRiskScore,
} from './healthRiskTypes';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'cities', label: 'Global Cities', icon: MapPin },
  { id: 'vulnerable', label: 'Vulnerable Groups', icon: Users },
  { id: 'pollutants', label: 'Pollutant Effects', icon: Activity },
  { id: 'recommendations', label: 'Recommendations', icon: Shield },
];

/**
 * Overview tab with AQI gauge, stats, risk timeline, and category radar.
 */
const OverviewTab = ({ profile, dailyData, hourlyData, riskTrend, pollutantOutcomes }) => {
  const currentAQI = dailyData[dailyData.length - 1]?.aqi || 100;
  const overallRisk = dailyData[dailyData.length - 1]?.overallRisk || 0.5;

  const radarData = Object.entries(RISK_CATEGORIES).map(([key, config]) => ({
    category: config.icon + ' ' + config.label.substring(0, 6),
    risk: Math.round(Math.random() * 60 + 20),
    baseline: 25,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Heart} label="Cardiovascular Risk" value={`${(overallRisk * 100).toFixed(0)}%`} color="#ef4444" delay={0} />
        <StatCard icon={Brain} label="Neurological Risk" value={`${(overallRisk * 60).toFixed(0)}%`} color="#8b5cf6" delay={0.05} />
        <StatCard icon={Users} label="Vulnerable Pop." value="2.4M" subValue="Exposed to current AQI" color="#f59e0b" delay={0.1} />
        <StatCard icon={AlertTriangle} label="Health Advisories" value="3 Active" subValue="For sensitive groups" color="#dc2626" delay={0.15} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <AQIGaugeCard aqi={currentAQI} city="Current Location" delay={0.2} />
        <RiskCategoryRadar data={radarData} />
      </div>

      <AQITrendChart data={dailyData} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <HourlyAQIChart data={hourlyData} />
        <div style={{
          background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
            📋 Your Risk Profile
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <RiskMeter label="Respiratory" score={overallRisk * 8} maxScore={5} color="#ef4444" />
            <RiskMeter label="Cardiovascular" score={overallRisk * 6} maxScore={5} color="#ec4899" />
            <RiskMeter label="Neurological" score={overallRisk * 4} maxScore={5} color="#8b5cf6" />
            <RiskMeter label="Developmental" score={overallRisk * 3} maxScore={5} color="#f59e0b" />
            <RiskMeter label="Cancer (Long-term)" score={overallRisk * 2} maxScore={5} color="#dc2626" />
            <RiskMeter label="Mental Health" score={overallRisk * 3} maxScore={5} color="#10b981" />
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--muted, #64748b)', margin: 0 }}>
              Risk multiplier from your profile: <strong>{profile.riskMultiplier.toFixed(1)}x</strong> — based on {profile.vulnerableGroups.length} vulnerable group(s) and {profile.conditions.length} condition(s)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Cities tab with city list and comparison chart.
 */
const CitiesTab = ({ cities }) => {
  const [selectedCity, setSelectedCity] = useState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>
          🌍 {cities.length} Cities Monitored
        </p>
        {cities.map((city, i) => (
          <CityRiskCard key={city.name} city={city} delay={i * 0.03} isSelected={selectedCity?.name === city.name} onSelect={setSelectedCity} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '1rem' }}>
        <CityComparisonChart cities={cities} />
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
              📊 {selectedCity.name} Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'AQI', value: selectedCity.aqi, color: selectedCity.band.color },
                { label: 'PM2.5', value: `${selectedCity.pm25.toFixed(1)} µg/m³` },
                { label: 'PM10', value: `${selectedCity.pm10.toFixed(1)} µg/m³` },
                { label: 'NO₂', value: `${selectedCity.no2.toFixed(1)} µg/m³` },
                { label: 'O₃', value: `${selectedCity.o3.toFixed(1)} µg/m³` },
                { label: 'Hospital Admissions', value: selectedCity.hospitalAdmissions, color: '#ef4444' },
                { label: 'Respiratory Cases', value: selectedCity.respiratoryCases.toLocaleString() },
                { label: 'Cardio Cases', value: selectedCity.cardiovascularCases.toLocaleString() },
              ].map((item, i) => (
                <div key={i} style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color || 'var(--text-primary, #1e293b)', margin: '0.1rem 0 0' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

/**
 * Vulnerable groups tab with group cards and impact chart.
 */
const VulnerableTab = ({ groups }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>
        👥 Vulnerable Group Analysis
      </h3>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted, #64748b)', margin: '0 0 1rem' }}>
        These groups face elevated health risks from air pollution exposure due to biological, occupational, or pre-existing condition factors.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {groups.map((group, i) => (
          <VulnerableGroupCard key={group.group} group={group} delay={i * 0.05} />
        ))}
      </div>
    </div>
    <VulnerableGroupChart groups={groups} />
  </div>
);

/**
 * Pollutant effects tab with pollutant cards and risk pie.
 */
const PollutantsTab = ({ pollutants }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>
        ☣️ Pollutant Health Effects ({pollutants.length})
      </p>
      {pollutants.map((p, i) => (
        <PollutantEffectCard key={p.pollutant} pollutant={p} delay={i * 0.05} />
      ))}
    </div>
    <div style={{ position: 'sticky', top: '1rem' }}>
      <PollutantRiskPie pollutants={pollutants} />
      <div style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: '1rem',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
          📊 Summary Stats
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Affected</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>{pollutants.reduce((s, p) => s + p.affectedPopulation, 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Est. Cases</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{pollutants.reduce((s, p) => s + p.estimatedCases, 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>High Risk Pollutants</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{pollutants.filter(p => p.riskLevel === 'high').length}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Recommendations tab with personalized advice.
 */
const RecommendationsTab = ({ recommendations, profile, aqi }) => {
  const band = getAQIBand(aqi);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>
          🛡️ Personalized Health Recommendations
        </p>
        <div style={{
          background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--muted, #64748b)', margin: '0 0 0.5rem' }}>
            Based on current AQI of <strong style={{ color: band.color }}>{aqi}</strong> ({band.label}) and your profile with <strong>{profile.riskMultiplier.toFixed(1)}x</strong> risk multiplier.
          </p>
          <p style={{ fontSize: '0.65rem', color: 'var(--muted, #94a3b8)', margin: 0 }}>
            Your conditions: {profile.conditions.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
          </p>
        </div>
        {recommendations.map((rec, i) => (
          <RecommendationCard key={i} rec={rec} delay={i * 0.05} />
        ))}
      </div>
      <div style={{ position: 'sticky', top: '1rem' }}>
        <AQIGaugeCard aqi={aqi} delay={0} />
        <div style={{
          background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: '1rem',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
            📋 Your Profile
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {profile.vulnerableGroups.length > 0 && (
              <div style={{ padding: '0.4rem', background: '#fef3c7', borderRadius: '0.375rem' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#92400e', margin: 0 }}>Vulnerable Groups:</p>
                {profile.vulnerableGroups.map(g => (
                  <span key={g} style={{ display: 'inline-block', fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: '#fff', borderRadius: '9999px', margin: '0.15rem 0.15rem 0 0', color: '#92400e' }}>
                    {VULNERABLE_GROUPS[g]?.icon} {VULNERABLE_GROUPS[g]?.label}
                  </span>
                ))}
              </div>
            )}
            <div style={{ padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>Indoor Protection: {profile.indoorProtection}</p>
            </div>
            <div style={{ padding: '0.4rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0 }}>Outdoor Exposure: {profile.outdoorExposure}h/day</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Health Risk Dashboard component.
 */
const HealthRiskDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const profile = useMemo(() => generatePersonalRiskProfile(), []);
  const cities = useMemo(() => generateCityRiskData(), []);
  const pollutantOutcomes = useMemo(() => generateHealthOutcomesByPollutant(), []);
  const vulnerableGroups = useMemo(() => generateVulnerableGroupBreakdown(), []);
  const dailyData = useMemo(() => generateDailyRiskTimeline(7), []);
  const hourlyData = useMemo(() => generateHourlyAQI(24), []);
  const riskTrend = useMemo(() => generateRiskTrend(8), []);

  const currentAQI = dailyData[dailyData.length - 1]?.aqi || 100;
  const recommendations = useMemo(() => generateRecommendations(currentAQI, profile), [currentAQI, profile]);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab profile={profile} dailyData={dailyData} hourlyData={hourlyData} riskTrend={riskTrend} pollutantOutcomes={pollutantOutcomes} />;
      case 'cities':
        return <CitiesTab cities={cities} />;
      case 'vulnerable':
        return <VulnerableTab groups={vulnerableGroups} />;
      case 'pollutants':
        return <PollutantsTab pollutants={pollutantOutcomes} />;
      case 'recommendations':
        return <RecommendationsTab recommendations={recommendations} profile={profile} aqi={currentAQI} />;
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
                fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary, #1e293b)',
                margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <span style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #ef4444, #ec4899)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={22} />
                </span>
                Health Risk Assessment
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0.25rem 0 0 3.25rem' }}>
                Evaluate health impacts of air pollution and get personalized recommendations
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.8rem', borderRadius: '0.75rem',
                background: getAQIBand(currentAQI).color + '15', color: getAQIBand(currentAQI).color,
                fontSize: '0.7rem', fontWeight: 600,
              }}>
                AQI: {currentAQI} — {getAQIBand(currentAQI).label}
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
                <Icon size={16} />
                {tab.label}
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

export default HealthRiskDashboard;
