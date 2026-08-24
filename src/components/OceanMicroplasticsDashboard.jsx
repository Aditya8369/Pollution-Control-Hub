/**
 * Enterprise Architectural Specification & Header:
 * Module: Ocean & Coastal Microplastics Telemetry Dashboard (Main Dashboard Component)
 * File: src/components/OceanMicroplasticsDashboard.jsx
 * Standard: React Functional Component with Recharts, Skimmer Filtration Efficiency Simulator,
 *           Station Plastic Profiles, and NOAA Marine Plastic Guidelines.
 */

import React, { useState } from 'react';
import { microplasticsDataStore, calculateSkimmerFiltrationEfficiency } from './microplasticsData';
import { StatCard, MicroplasticsSourceCard, OceanZoneCard, MicroplasticsGoalCard } from './MicroplasticsCards';
import { HourlyMicroplasticsChart, StationMicroplasticsChart, SourceParticleSizeChart } from './MicroplasticsCharts';

export default function OceanMicroplasticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState('MP-01');
  const [flowM3Hour, setFlowM3Hour] = useState(1000);
  const [searchTerm, setSearchTerm] = useState('');

  const filtrationResult = calculateSkimmerFiltrationEfficiency(selectedSourceId, flowM3Hour);

  const filteredSources = microplasticsDataStore.sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/30 text-xl">🌊</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Ocean & Coastal Microplastics Surveillance Command</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Marine microplastics density (Particles/m³), polymer spectrographic analysis & NOAA safety compliance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {['overview', 'sources', 'zones', 'filtration', 'mitigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Average Marine Plastic Density" value="742" unit="Particles/m³" trend="▲ Exceeds 50 /m³ NOAA standard" isAlert={true} />
        <StatCard title="NOAA Marine Plastic Alerts" value="56" unit="Violations" trend="▲ +18% vs yesterday" isAlert={true} />
        <StatCard title="Active Hydro-Optical Sensors" value="70" unit="/ 72 Units" trend="✔ 97.2% Operational" isAlert={false} />
        <StatCard title="Coastal Skimmer Removal Rate" value="88.4" unit="%" trend="▲ +4.2% month-over-month" isAlert={false} />
      </section>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>📈</span> 24-Hour Microplastic Drift & Density Telemetry
              </h3>
              <HourlyMicroplasticsChart data={microplasticsDataStore.hourlyTrends} />
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🛰️</span> Station Microplastic Concentration & NOAA Alerts
              </h3>
              <StationMicroplasticsChart data={microplasticsDataStore.stationProfiles} />
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Top Marine Microplastic Sources & Polymer Particle Size</h3>
            <SourceParticleSizeChart data={microplasticsDataStore.sources} />
          </div>
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">Marine Microplastic Source Inventory</h3>
            <input
              type="text"
              placeholder="Search plastic sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-4 py-2 rounded-xl outline-none focus:border-teal-500 w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <MicroplasticsSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {microplasticsDataStore.zones.map((zone) => (
            <OceanZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      {/* Tab 4: Skimmer Filtration Modeler */}
      {activeTab === 'filtration' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Coastal Skimmer Filtration Efficiency Modeler</h3>
            <p className="text-xs text-slate-400 font-mono">
              Calculates plastic particle removal rate (Particles/hour) based on mesh size and seawater intake volume
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Select Plastic Pollution Stream</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-teal-500 font-mono"
              >
                {microplasticsDataStore.sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.avgParticlesPerM3} /m³)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Skimmer Water Flow Rate ({flowM3Hour} m³/h)</label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={flowM3Hour}
                onChange={(e) => setFlowM3Hour(parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RAW DENSITY</span>
                <span className="text-lg font-bold text-teal-400">{filtrationResult.source.avgParticlesPerM3} /m³</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POST-FILTRATION DENSITY</span>
                <span className="text-lg font-bold text-blue-400">{filtrationResult.postFiltrationDensity} /m³</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">REMOVAL EFFICIENCY</span>
                <span className="text-lg font-bold text-amber-400">{filtrationResult.removalEfficiencyPercent}%</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">PARTICLES REMOVED / HR</span>
                <span className="text-lg font-bold text-emerald-400">{filtrationResult.totalParticlesRemovedPerHour.toLocaleString()}</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs text-center font-bold ${
              filtrationResult.isCompliantPostFiltration ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}>
              {filtrationResult.isCompliantPostFiltration 
                ? `✔ NOAA COMPLIANT: Post-filtration plastic density (${filtrationResult.postFiltrationDensity} /m³) meets the 50 /m³ safe marine standard!`
                : `⚠️ NOAA NON-COMPLIANT: Post-filtration density (${filtrationResult.postFiltrationDensity} /m³) exceeds the 50 /m³ safe marine standard!`
              }
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mitigation */}
      {activeTab === 'mitigation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {microplasticsDataStore.goals.map((goal) => (
            <MicroplasticsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
