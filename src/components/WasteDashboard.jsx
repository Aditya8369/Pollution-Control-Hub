import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Trash2,
  Recycle,
  Factory,
  MapPin,
  Leaf,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Truck,
} from 'lucide-react';

import {
  StatCard,
  FacilityCard,
  ZoneCard,
  CategoryCard,
  AlertCard,
  WasteStreamCard,
  DiversionGauge,
} from './WasteCards';

import {
  WeeklyCollectionChart,
  DiversionTrendChart,
  CategoryPieChart,
  CostRevenueChart,
  EmissionsChart,
  ZoneComparisonChart,
} from './WasteCharts';

import {
  generateFacilities,
  generateWasteStream,
  generateZoneStats,
  generateWeeklyData,
  generateCategoryBreakdown,
  generateEmissionsData,
  generateCostData,
  generateAlerts,
} from './wasteData';

import { WASTE_CATEGORIES, DIVERSION_TARGETS, formatTonnage, formatCurrency } from './wasteTypes';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'facilities', label: 'Facilities', icon: Factory },
  { id: 'zones', label: 'Zones', icon: MapPin },
  { id: 'categories', label: 'Categories', icon: Trash2 },
  { id: 'emissions', label: 'Emissions', icon: Leaf },
];

/**
 * Overview tab with stats, diversion gauges, charts, and alerts.
 */
const OverviewTab = ({ weeklyData, zones, costData, emissionsData, alerts }) => {
  const latest = weeklyData[weeklyData.length - 1];
  const totalWeekly = weeklyData.reduce((s, w) => s + w.totalCollected, 0);
  const avgDiversion = weeklyData.reduce((s, w) => s + w.diversionRate, 0) / weeklyData.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Trash2} label="Total Collected" value={formatTonnage(totalWeekly)} subValue="This 12-week period" color="#6366f1" delay={0} />
        <StatCard icon={Recycle} label="Recycling Rate" value={`${latest.diversionRate.toFixed(0)}%`} trend="up" trendValue={3.2} color="#22c55e" delay={0.05} />
        <StatCard icon={DollarSign} label="Annual Cost" value={`$${(costData.totalAnnualCost / 1000000).toFixed(1)}M`} subValue={`${formatCurrency(costData.costPerCapita)} per capita`} color="#ef4444" delay={0.1} />
        <StatCard icon={Leaf} label="Net Emissions" value={formatTonnage(emissionsData.netEmissions)} subValue={`${emissionsData.emissionReductionTrend > 0 ? '↑' : '↓'} ${Math.abs(emissionsData.emissionReductionTrend).toFixed(1)}%`} color="#8b5cf6" delay={0.15} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <DiversionGauge current={avgDiversion} target={50} label="2025 Diversion Goal" delay={0.2} />
        <DiversionGauge current={emissionsData.avoidedEmissionsRecycling + emissionsData.avoidedEmissionsComposting} target={emissionsData.totalAnnualEmissions} label="Emissions Offset" delay={0.25} />
        <DiversionGauge current={costData.budgetUtilization} target={100} label="Budget Utilization" delay={0.3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <WeeklyCollectionChart data={weeklyData} />
        <CategoryPieChart categories={generateCategoryBreakdown()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <DiversionTrendChart data={weeklyData} />
        <div style={{
          background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
            ⚠️ Active Alerts ({alerts.filter(a => !a.acknowledged).length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '250px', overflowY: 'auto' }}>
            {alerts.filter(a => !a.acknowledged).map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} delay={i * 0.03} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Facilities tab with facility list and detail panel.
 */
const FacilitiesTab = ({ facilities }) => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = typeFilter === 'all' ? facilities : facilities.filter(f => f.type === typeFilter);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedFacility ? '1fr 350px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button onClick={() => setTypeFilter('all')} style={{ padding: '0.3rem 0.6rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: typeFilter === 'all' ? '#6366f1' : '#f1f5f9', color: typeFilter === 'all' ? '#fff' : '#64748b' }}>
            All ({facilities.length})
          </button>
          {Object.entries(FACILITY_TYPES).slice(0, 5).map(([key, val]) => (
            <button key={key} onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)} style={{ padding: '0.3rem 0.6rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: typeFilter === key ? val.color : '#f1f5f9', color: typeFilter === key ? '#fff' : '#64748b' }}>
              {val.icon}
            </button>
          ))}
        </div>
        {filtered.map((fac, i) => (
          <FacilityCard key={fac.id} facility={fac} delay={i * 0.03} isSelected={selectedFacility?.id === fac.id} onSelect={setSelectedFacility} />
        ))}
      </div>
      {selectedFacility && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{selectedFacility.icon}</span>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>{selectedFacility.name}</h3>
                <p style={{ fontSize: '0.65rem', color: 'var(--muted, #94a3b8)', margin: '0.1rem 0 0' }}>{selectedFacility.zoneName} • Est. {selectedFacility.established}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Capacity', value: `${selectedFacility.currentLoad.toFixed(0)}%` },
                { label: 'Daily Throughput', value: `${selectedFacility.dailyThroughput.toFixed(0)} tons` },
                { label: 'Employees', value: selectedFacility.employees },
                { label: 'Status', value: selectedFacility.status },
                { label: 'Type', value: selectedFacility.type },
                { label: 'Capacity (tons)', value: selectedFacility.capacity },
              ].map((item, i) => (
                <div key={i} style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                  <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: '0.1rem 0 0' }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                <span>Capacity Load</span>
                <span>{selectedFacility.currentLoad.toFixed(0)}%</span>
              </div>
              <div style={{ height: '0.5rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${selectedFacility.currentLoad}%`,
                  background: selectedFacility.currentLoad > 90 ? '#ef4444' : selectedFacility.currentLoad > 70 ? '#f59e0b' : '#22c55e',
                  borderRadius: '9999px', transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Zones tab with zone cards and comparison chart.
 */
const ZonesTab = ({ zones }) => {
  const [selectedZone, setSelectedZone] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {zones.map((zone, i) => (
          <ZoneCard key={zone.id} zone={zone} delay={i * 0.03} isSelected={selectedZone?.id === zone.id} onSelect={setSelectedZone} />
        ))}
      </div>
      <ZoneComparisonChart zones={zones} />
    </div>
  );
};

/**
 * Categories tab with category breakdown and waste stream.
 */
const CategoriesTab = ({ categories, wasteStream }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const filtered = categoryFilter === 'all' ? wasteStream : wasteStream.filter(w => w.category === categoryFilter);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>📊 Category Breakdown</p>
        {categories.map((cat, i) => (
          <CategoryCard key={cat.category} cat={cat} delay={i * 0.03} />
        ))}
      </div>
      <div style={{ position: 'sticky', top: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button onClick={() => setCategoryFilter('all')} style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: categoryFilter === 'all' ? '#6366f1' : '#f1f5f9', color: categoryFilter === 'all' ? '#fff' : '#64748b' }}>All</button>
          {Object.entries(WASTE_CATEGORIES).slice(0, 5).map(([key, val]) => (
            <button key={key} onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)} style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: categoryFilter === key ? val.color : '#f1f5f9', color: categoryFilter === key ? '#fff' : '#64748b' }}>
              {val.icon}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '600px', overflowY: 'auto' }}>
          {filtered.slice(0, 20).map((stream, i) => (
            <WasteStreamCard key={stream.id} stream={stream} delay={i * 0.02} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Emissions tab with emissions charts and cost data.
 */
const EmissionsTab = ({ emissionsData, costData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard icon={Leaf} label="Total Emissions" value={formatTonnage(emissionsData.totalAnnualEmissions)} subValue="CO₂ equivalent" color="#ef4444" delay={0} />
      <StatCard icon={Recycle} label="Avoided (Recycling)" value={formatTonnage(emissionsData.avoidedEmissionsRecycling)} color="#22c55e" delay={0.05} />
      <StatCard icon={DollarSign} label="Green Energy" value={`${emissionsData.greenEnergyProduced.toFixed(1)} GWh`} color="#3b82f6" delay={0.1} />
      <StatCard icon={TrendingUp} label="Carbon Credits" value={emissionsData.carbonCreditsGenerated} color="#8b5cf6" delay={0.15} />
    </div>
    <EmissionsChart data={emissionsData.monthlyEmissions} />
    <CostRevenueChart data={costData.monthlyCosts} />
  </div>
);

/**
 * Main Waste Dashboard component.
 */
const WasteDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const facilities = useMemo(() => generateFacilities(15), []);
  const wasteStream = useMemo(() => generateWasteStream(50), []);
  const zones = useMemo(() => generateZoneStats(), []);
  const weeklyData = useMemo(() => generateWeeklyData(12), []);
  const categories = useMemo(() => generateCategoryBreakdown(), []);
  const emissionsData = useMemo(() => generateEmissionsData(), []);
  const costData = useMemo(() => generateCostData(), []);
  const alerts = useMemo(() => generateAlerts(10), []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab weeklyData={weeklyData} zones={zones} costData={costData} emissionsData={emissionsData} alerts={alerts} />;
      case 'facilities':
        return <FacilitiesTab facilities={facilities} />;
      case 'zones':
        return <ZonesTab zones={zones} />;
      case 'categories':
        return <CategoriesTab categories={categories} wasteStream={wasteStream} />;
      case 'emissions':
        return <EmissionsTab emissionsData={emissionsData} costData={costData} />;
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
                  background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Recycle size={22} />
                </span>
                Waste Management Tracker
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0.25rem 0 0 3.25rem' }}>
                Monitor collection, processing, recycling rates, and environmental impact
              </p>
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
                  background: isActive ? '#22c55e' : 'var(--bg-card, #ffffff)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
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

export default WasteDashboard;
