/**
 * Enterprise Architectural Specification & Header:
 * Module: Urban Ambient Electromagnetic Field (EMF) Telemetry Dashboard (Main Dashboard Component)
 * File: src/components/AmbientEmfDashboard.jsx
 * Standard: React Functional Component with Recharts, Distance Attenuation Modeler,
 *           Station Spectrum Profiles, and ICNIRP Safety Guideline Analytics.
 */

import React, { useState } from 'react';
import { emfDataStore, calculateEmfDistanceAttenuation } from './emfData';
import { StatCard, EmfSourceCard, EmfZoneCard, EmfGoalCard } from './EmfCards';
import { HourlyEmfChart, StationEmfChart, SourcePowerDensityChart } from './EmfCharts';

export default function AmbientEmfDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState('EMF-01');
  const [targetDistance, setTargetDistance] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const attenuationResult = calculateEmfDistanceAttenuation(selectedSourceId, targetDistance);

  const filteredSources = emfDataStore.sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 text-xl">📡</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Urban Ambient Electromagnetic Field (EMF) Command</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            RF radiation spectrum meters, 5G base station telemetry, magnetic field (µT) & ICNIRP compliance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {['overview', 'sources', 'zones', 'attenuation', 'mitigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="City Average Power Density" value="6.4" unit="W/m²" trend="▲ Peak hour (ICNIRP 10 W/m²)" isAlert={false} />
        <StatCard title="ICNIRP Limit Exceedance Alerts" value="38" unit="Events" trend="▲ +14% vs yesterday" isAlert={true} />
        <StatCard title="Spectrum Monitoring Meters" value="88" unit="/ 90 Units" trend="✔ 97.7% Operational" isAlert={false} />
        <StatCard title="Residential Zone Compliance" value="96.2" unit="%" trend="▲ +0.5% month-over-month" isAlert={false} />
      </section>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>📈</span> 24-Hour Power Density & Traffic Telemetry Trend
              </h3>
              <HourlyEmfChart data={emfDataStore.hourlyTrends} />
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🛰️</span> Station Power Density & ICNIRP Exceedances
              </h3>
              <StationEmfChart data={emfDataStore.stationProfiles} />
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Top RF & Power Grid EMF Sources</h3>
            <SourcePowerDensityChart data={emfDataStore.sources} />
          </div>
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">Electromagnetic Emission Source Inventory</h3>
            <input
              type="text"
              placeholder="Search EMF sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <EmfSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {emfDataStore.zones.map((zone) => (
            <EmfZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      {/* Tab 4: Distance Attenuation Modeler */}
      {activeTab === 'attenuation' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">EMF Inverse-Square Distance Attenuation Modeler</h3>
            <p className="text-xs text-slate-400 font-mono">
              Calculates electromagnetic power density decay over distance from RF antennas or power lines
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Select EMF Emission Source</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-cyan-500 font-mono"
              >
                {emfDataStore.sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.avgPowerDensityWm2} W/m²)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Distance from Source ({targetDistance} meters)</label>
              <input
                type="range"
                min="1"
                max="100"
                value={targetDistance}
                onChange={(e) => setTargetDistance(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SOURCE BASELINE</span>
                <span className="text-lg font-bold text-cyan-400">{attenuationResult.source.avgPowerDensityWm2} W/m²</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POWER DENSITY AT {targetDistance}M</span>
                <span className="text-lg font-bold text-amber-400">{attenuationResult.estimatedPowerDensity} W/m²</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ICNIRP LIMIT</span>
                <span className="text-lg font-bold text-purple-400">10.0 W/m²</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">REQUIRED SAFE BUFFER</span>
                <span className="text-lg font-bold text-emerald-400">{attenuationResult.recommendedBufferMeters} m</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs text-center font-bold ${
              attenuationResult.isIcnirpCompliant ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}>
              {attenuationResult.isIcnirpCompliant 
                ? `✔ ICNIRP COMPLIANT: Estimated power density (${attenuationResult.estimatedPowerDensity} W/m²) is within the 10.0 W/m² public safety limit!`
                : `⚠️ ICNIRP NON-COMPLIANT: Estimated power density (${attenuationResult.estimatedPowerDensity} W/m²) exceeds the 10.0 W/m² public safety limit!`
              }
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mitigation */}
      {activeTab === 'mitigation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emfDataStore.goals.map((goal) => (
            <EmfGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
