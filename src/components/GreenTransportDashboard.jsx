import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  MapPin,
  Navigation,
  Leaf,
  Zap,
  TrendingUp,
  AlertTriangle,
  Users,
  Bike,
  Route,
  Fuel,
  Wind,
} from 'lucide-react';

import {
  StatCard,
  ModeComparisonCard,
  DistrictCard,
  FuelCard,
  GoalCard,
  AirQualityZoneCard,
} from './TransportCards';

import {
  ModePieChart,
  EmissionsTrendChart,
  EmissionCategoryPie,
  DistrictBarChart,
  ModeCO2BarChart,
  GreenTripsTrend,
} from './TransportCharts';

import {
  generateCommuteRoutes,
  generateModeDistribution,
  generateWeeklyEmissions,
  generateDistrictInfrastructure,
  generateAirQualityImpact,
  generateAlternativeFuelData,
  generateTransportGoals,
  generateTripComparison,
} from './transportData';

import { TRANSPORT_MODES, formatEmissions, formatDistance, formatDuration } from './transportTypes';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'planner', label: 'Route Planner', icon: Route },
  { id: 'districts', label: 'Districts', icon: MapPin },
  { id: 'fuels', label: 'Alternative Fuels', icon: Fuel },
  { id: 'airquality', label: 'Air Quality Impact', icon: Wind },
];

/**
 * Overview tab with stats, mode distribution, goals, and trends.
 */
const OverviewTab = ({ modes, weeklyData, goals, routes }) => {
  const totalTrips = modes.reduce((s, m) => s + m.trips, 0);
  const greenModes = modes.filter(m => m.co2PerKm < 0.05);
  const greenTrips = greenModes.reduce((s, m) => s + m.trips, 0);
  const greenShare = ((greenTrips / totalTrips) * 100).toFixed(1);
  const totalCO2 = modes.reduce((s, m) => s + m.totalKm * m.co2PerKm, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Bike} label="Green Mode Share" value={`${greenShare}%`} trend="up" trendValue={4.2} subValue={`${greenTrips} of ${totalTrips} trips`} color="#22c55e" delay={0} />
        <StatCard icon={Route} label="Total Trips" value={totalTrips.toLocaleString()} color="#6366f1" delay={0.05} />
        <StatCard icon={Leaf} label="Transport CO₂" value={formatEmissions(totalCO2)} trend="down" trendValue={8.5} color="#ef4444" delay={0.1} />
        <StatCard icon={Zap} label="EV Adoption" value={`${modes.find(m => m.mode === 'ev')?.trips || 0} trips`} color="#10b981" delay={0.15} />
      </div>

      {/* Goals grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
        {goals.map((g, i) => (
          <GoalCard key={g.id} goal={g} delay={i * 0.05} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <ModePieChart data={modes} />
        <EmissionsTrendChart data={weeklyData} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <GreenTripsTrend data={weeklyData} />
        <EmissionCategoryPie />
      </div>
    </div>
  );
};

/**
 * Route planner tab with comparison of all modes for a given distance.
 */
const PlannerTab = ({ routes }) => {
  const [distance, setDistance] = useState(10);
  const comparison = useMemo(() => generateTripComparison(distance), [distance]);
  const bestGreen = comparison.find(m => m.co2 === 0);
  const worstPolluter = [...comparison].reverse()[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Distance selector */}
        <div style={{
          background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
            🗺️ Compare Transport Modes
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Distance:</label>
            <input
              type="range" min="1" max="50" value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#6366f1' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6366f1', minWidth: '50px' }}>{distance} km</span>
          </div>
        </div>

        {/* Mode comparison list */}
        {comparison.map((mode, i) => (
          <ModeComparisonCard key={mode.mode} mode={{ ...mode, distance }} rank={i} delay={i * 0.03} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
        <ModeCO2BarChart modes={Object.values(TRANSPORT_MODES)} />
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', margin: '0 0 0.5rem' }}>🌿 Greenest Option</h3>
          {bestGreen && (
            <p style={{ fontSize: '0.7rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              {bestGreen.icon} <strong>{bestGreen.label}</strong> produces <strong>0 kg CO₂</strong> and burns <strong>{Math.round(bestGreen.calories)} calories</strong> for {distance} km — completely free and zero-emission!
            </p>
          )}
        </div>
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '1rem', padding: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.5rem' }}>⚠️ Highest Emitter</h3>
          {worstPolluter && (
            <p style={{ fontSize: '0.7rem', color: '#991b1b', margin: 0, lineHeight: 1.5 }}>
              {worstPolluter.icon} <strong>{worstPolluter.label}</strong> emits <strong>{worstPolluter.co2.toFixed(1)} kg CO₂</strong> for {distance} km — consider switching to {bestGreen?.label} or {comparison[1]?.label}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Districts tab with infrastructure cards and comparison chart.
 */
const DistrictsTab = ({ districts }) => {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {districts.map((d, i) => (
          <DistrictCard key={d.name} district={d} delay={i * 0.03} isSelected={selected?.name === d.name} onSelect={setSelected} />
        ))}
      </div>
      <DistrictBarChart districts={districts} />
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
            📊 {selected.name} — Infrastructure Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {[
              { label: 'Population', value: (selected.population / 1000).toFixed(0) + 'K' },
              { label: 'Area', value: selected.area + ' km²' },
              { label: 'Bike Lanes', value: selected.bikeLaneKm.toFixed(1) + ' km' },
              { label: 'EV Chargers', value: selected.evChargers },
              { label: 'Transit Stops', value: selected.transitStops },
              { label: 'Transit Cover', value: selected.transitCoverage.toFixed(0) + '%' },
              { label: 'Bike Share', value: selected.bikeShare + ' stations' },
              { label: 'Avg Commute', value: selected.avgCommute.toFixed(0) + ' min' },
              { label: 'Green Score', value: selected.greenScore + '/100' },
              { label: 'Pop Density', value: selected.populationDensity + '/km²' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', margin: '0.15rem 0 0' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Alternative fuels tab.
 */
const FuelsTab = ({ fuels }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.75rem' }}>
        ⚡ Alternative Fuel Adoption
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {fuels.map((fuel, i) => (
          <FuelCard key={fuel.fuel} fuel={fuel} delay={i * 0.05} />
        ))}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
      {fuels.map((fuel, i) => (
        <motion.div
          key={fuel.fuel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          style={{
            background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '0.75rem', padding: '1rem', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{fuel.icon}</span>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b', margin: '0.3rem 0 0' }}>{fuel.label}</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22c55e', margin: '0.2rem 0' }}>-{fuel.co2Reduction}%</p>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0 }}>CO₂ reduction</p>
          <div style={{ marginTop: '0.5rem', height: '0.3rem', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fuel.adoptionRate}%`, background: fuel.color, borderRadius: '9999px' }} />
          </div>
          <p style={{ fontSize: '0.5rem', color: '#94a3b8', marginTop: '0.2rem' }}>{fuel.adoptionRate.toFixed(0)}% adopted</p>
        </motion.div>
      ))}
    </div>
  </div>
);

/**
 * Air quality impact tab.
 */
const AirQualityTab = ({ zones }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.25rem' }}>
        🌬️ Air Quality by Transport Zone
      </p>
      {zones.sort((a, b) => b.aqi - a.aqi).map((zone, i) => (
        <AirQualityZoneCard key={zone.id} zone={zone} delay={i * 0.03} />
      ))}
    </div>
    <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: '0 0 0.5rem' }}>📊 Zone Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <div style={{ padding: '0.4rem', background: '#fee2e2', borderRadius: '0.375rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', fontWeight: 900, color: '#991b1b', margin: 0 }}>{zones.filter(z => z.aqi > 150).length}</p>
            <p style={{ fontSize: '0.5rem', color: '#991b1b', margin: 0 }}>Unhealthy Zones</p>
          </div>
          <div style={{ padding: '0.4rem', background: '#dcfce7', borderRadius: '0.375rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', fontWeight: 900, color: '#166534', margin: 0 }}>{zones.filter(z => z.aqi <= 100).length}</p>
            <p style={{ fontSize: '0.5rem', color: '#166534', margin: 0 }}>Good/Moderate Zones</p>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.6rem', color: '#64748b', margin: '0 0 0.3rem' }}>Average green transport share:</p>
          <p style={{ fontSize: '1rem', fontWeight: 900, color: '#22c55e', margin: 0 }}>
            {(zones.reduce((s, z) => s + z.greenTransportShare, 0) / zones.length).toFixed(1)}%
          </p>
        </div>
      </div>
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1rem',
      }}>
        <p style={{ fontSize: '0.7rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
          💡 Zones with higher green transport share show <strong>25-40% lower NO₂ levels</strong>. Increasing cycling infrastructure by 50% could reduce transport emissions by 12% city-wide.
        </p>
      </div>
    </div>
  </div>
);

/**
 * Main Green Transport Dashboard component.
 */
const GreenTransportDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const routes = useMemo(() => generateCommuteRoutes(20), []);
  const modes = useMemo(() => generateModeDistribution(), []);
  const weeklyData = useMemo(() => generateWeeklyEmissions(12), []);
  const districts = useMemo(() => generateDistrictInfrastructure(), []);
  const airQualityZones = useMemo(() => generateAirQualityImpact(), []);
  const fuels = useMemo(() => generateAlternativeFuelData(), []);
  const goals = useMemo(() => generateTransportGoals(), []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab modes={modes} weeklyData={weeklyData} goals={goals} routes={routes} />;
      case 'planner':
        return <PlannerTab routes={routes} />;
      case 'districts':
        return <DistrictsTab districts={districts} />;
      case 'fuels':
        return <FuelsTab fuels={fuels} />;
      case 'airquality':
        return <AirQualityTab zones={airQualityZones} />;
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
                  <Navigation size={22} />
                </span>
                Green Transport Planner
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0.25rem 0 0 3.25rem' }}>
                Compare transport modes, track emissions, and plan sustainable commutes
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

export default GreenTransportDashboard;
