/**
 * Enterprise Architectural Specification & Header:
 * Module: Enterprise Noise Pollution & Acoustic Telemetry Dashboard (Main Dashboard Component)
 * File: src/components/NoisePollutionDashboard.jsx
 * Standard: React Functional Component with Recharts, Dynamic Inverse-Square Attenuation Modeler,
 *           District Acoustic Risk Profiles, and WHO Sound Exposure Compliance Analytics.
 */

import React, { useState } from 'react';
import { acousticMitigationData, generateNoiseComparison } from './noiseData';
import { StatCard, NoiseSourceCard, NoiseZoneCard, NoiseGoalCard } from './NoiseCards';
import { HourlyNoiseChart, DistrictNoiseChart, SourceDecibelChart } from './NoiseCharts';

export default function NoisePollutionDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState('SRC-01');
  const [targetDistance, setTargetDistance] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');

  const comparison = generateNoiseComparison(selectedSourceId, targetDistance);

  const filteredSources = acousticMitigationData.sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 text-xl">🔊</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Urban Acoustic & Noise Surveillance Command</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Real-time decibel (dBA) telemetry, WHO noise exposure modeling, and acoustic barrier planning
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {['overview', 'sources', 'zones', 'modeler', 'mitigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="City Average Sound Level" value="68.4" unit="dBA" trend="▲ +2.1 dBA peak hour" isAlert={false} />
        <StatCard title="WHO Noise Violations Today" value="84" unit="Alerts" trend="▲ +12% vs yesterday" isAlert={true} />
        <StatCard title="Active Acoustic Sensors" value="164" unit="/ 170 Units" trend="✔ 96.4% Operational" isAlert={false} />
        <StatCard title="Quiet Zone Compliance" value="92.5" unit="%" trend="▲ +3.2% month-over-month" isAlert={false} />
      </section>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>📈</span> 24-Hour Decibel & Traffic Telemetry Trend
              </h3>
              <HourlyNoiseChart data={acousticMitigationData.hourlyTrends} />
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🏙️</span> District Average Sound Level & WHO Violations
              </h3>
              <DistrictNoiseChart data={acousticMitigationData.districtProfiles} />
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Top Urban Noise Sources & Max Intensity</h3>
            <SourceDecibelChart data={acousticMitigationData.sources} />
          </div>
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">Urban Noise Emission Inventory</h3>
            <input
              type="text"
              placeholder="Search noise sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-4 py-2 rounded-xl outline-none focus:border-blue-500 w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <NoiseSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {acousticMitigationData.zones.map((zone) => (
            <NoiseZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      {/* Tab 4: Modeler */}
      {activeTab === 'modeler' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Acoustic Inverse-Square Attenuation Modeler</h3>
            <p className="text-xs text-slate-400 font-mono">
              Calculates sound pressure decay over distance using logarithmic geometric spreading approximation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Select Noise Source</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-mono"
              >
                {acousticMitigationData.sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.avgDba} dBA)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Distance to Receiver ({targetDistance} meters)</label>
              <input
                type="range"
                min="1"
                max="100"
                value={targetDistance}
                onChange={(e) => setTargetDistance(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SOURCE BASELINE</span>
                <span className="text-lg font-bold text-amber-400">{comparison.source.avgDba} dBA</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ESTIMATED AT {targetDistance}M</span>
                <span className="text-lg font-bold text-blue-400">{comparison.estimatedDbaAtDistance} dBA</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ESTIMATED PEAK</span>
                <span className="text-lg font-bold text-red-400">{comparison.estimatedPeakAtDistance} dBA</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">QUIET BUFFER REQ</span>
                <span className="text-lg font-bold text-emerald-400">{comparison.recommendedBufferMeters} m</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs text-center font-bold ${
              comparison.isWhoExceeded ? 'bg-red-950/60 border-red-500/50 text-red-300' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            }`}>
              {comparison.isWhoExceeded 
                ? `⚠️ WARNING: Calculated level (${comparison.estimatedDbaAtDistance} dBA) exceeds WHO 55 dBA daytime residential quiet limit!`
                : `✔ SAFE: Calculated sound level (${comparison.estimatedDbaAtDistance} dBA) complies with WHO urban standard.`
              }
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mitigation */}
      {activeTab === 'mitigation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {acousticMitigationData.goals.map((goal) => (
            <NoiseGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
