/**
 * Enterprise Architectural Specification & Header:
 * Module: Solar Radiation & UV Index Surveillance Dashboard (Main Dashboard Component)
 * File: src/components/SolarRadiationUvDashboard.jsx
 * Standard: React Functional Component with Recharts, Erythemal Burn Time Calculator,
 *           Station Solar Profiles, and WHO UV Safety Analytics.
 */

import React, { useState } from 'react';
import { uvDataStore, calculateBurnTimeMinutes } from './uvData';
import { StatCard, UvSourceCard, UvZoneCard, UvGoalCard } from './UvCards';
import { HourlyUvChart, StationUvChart, SourceSolarRadChart } from './UvCharts';

export default function SolarRadiationUvDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState('UV-01');
  const [skinType, setSkinType] = useState(2);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedSource = uvDataStore.sources.find((s) => s.id === selectedSourceId) || uvDataStore.sources[0];
  const burnResult = calculateBurnTimeMinutes(selectedSource.avgUvi, skinType);

  const filteredSources = uvDataStore.sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 text-xl">☀️</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Solar Radiation & Ultraviolet (UV) Index Command</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Erythemal solar irradiance telemetry, ozone layer Dobson units, and WHO UV safety compliance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {['overview', 'sources', 'zones', 'burnTime', 'mitigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Peak Midday UV Index" value="11.2" unit="UVI" trend="▲ Extreme (WHO >= 11)" isAlert={true} />
        <StatCard title="Solar Irradiance Peak" value="890" unit="W/m²" trend="▲ +15% clear sky" isAlert={false} />
        <StatCard title="Total Ozone Column" value="285" unit="Dobson Units" trend="▼ Normal seasonal dip" isAlert={false} />
        <StatCard title="Active UV Spectrometers" value="62" unit="/ 64 Units" trend="✔ 96.8% Operational" isAlert={false} />
      </section>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>📈</span> 24-Hour UV Index Telemetry Curve
              </h3>
              <HourlyUvChart data={uvDataStore.hourlyTrends} />
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🛰️</span> Station UV Index & Extreme Radiation Alerts
              </h3>
              <StationUvChart data={uvDataStore.stationProfiles} />
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Solar Irradiance & Ozone Layer Column</h3>
            <SourceSolarRadChart data={uvDataStore.sources} />
          </div>
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">Solar Exposure & Albedo Reflection Inventory</h3>
            <input
              type="text"
              placeholder="Search solar microclimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-4 py-2 rounded-xl outline-none focus:border-purple-500 w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <UvSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {uvDataStore.zones.map((zone) => (
            <UvZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      {/* Tab 4: Burn Time Modeler */}
      {activeTab === 'burnTime' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Erythemal Sunburn Dose Modeler</h3>
            <p className="text-xs text-slate-400 font-mono">
              Calculates safe unshielded solar exposure time (minutes) based on Fitzpatrick skin type and UV Index
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Select Solar Location / Microclimate</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-purple-500 font-mono"
              >
                {uvDataStore.sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.avgUvi} UVI)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Fitzpatrick Skin Sensitivity Type</label>
              <select
                value={skinType}
                onChange={(e) => setSkinType(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-purple-500 font-mono"
              >
                <option value={1}>Type 1: Very Fair (Always Burns)</option>
                <option value={2}>Type 2: Fair (Burns Easily)</option>
                <option value={3}>Type 3: Medium (Sometimes Burns)</option>
                <option value={4}>Type 4: Olive/Dark (Rarely Burns)</option>
              </select>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">UV INDEX LEVEL</span>
                <span className="text-lg font-bold text-purple-400">{burnResult.uvi} UVI</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SAFE UNPROTECTED TIME</span>
                <span className="text-lg font-bold text-amber-400">{burnResult.burnMin} Minutes</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RECOMMENDED SPF</span>
                <span className="text-lg font-bold text-cyan-400">SPF {burnResult.recommendedSpf}+</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SHADE ADVISORY</span>
                <span className="text-lg font-bold text-emerald-400">{burnResult.requiresShade ? 'REQUIRED' : 'OPTIONAL'}</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs text-center font-bold ${
              burnResult.uvi >= 8.0 ? 'bg-purple-950/60 border-purple-500/50 text-purple-300' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            }`}>
              {burnResult.uvi >= 8.0 
                ? `⚠️ WARNING: High UV Index (${burnResult.uvi} UVI)! Skin burn expected in under ${burnResult.burnMin} minutes without SPF ${burnResult.recommendedSpf}+ protection.`
                : `✔ MODERATE: Sunburn risk is low (${burnResult.burnMin} mins safe exposure time).`
              }
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mitigation */}
      {activeTab === 'mitigation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uvDataStore.goals.map((goal) => (
            <UvGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
