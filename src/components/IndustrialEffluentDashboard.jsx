/**
 * Enterprise Architectural Specification & Header:
 * Module: Industrial Wastewater Effluent Telemetry Dashboard (Main Dashboard Component)
 * File: src/components/IndustrialEffluentDashboard.jsx
 * Standard: React Functional Component with Recharts, Secondary Treatment Removal Simulator,
 *           Plant Compliance Profiles, and CPCB Discharge Limit Analytics.
 */

import React, { useState } from 'react';
import { effluentDataStore, calculateEffluentTreatmentRemoval } from './effluentData';
import { StatCard, EffluentSourceCard, DischargeZoneCard, EffluentGoalCard } from './EffluentCards';
import { HourlyEffluentChart, PlantEffluentChart, SourceBodCodChart } from './EffluentCharts';

export default function IndustrialEffluentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState('EFF-01');
  const [flowKld, setFlowKld] = useState(500);
  const [searchTerm, setSearchTerm] = useState('');

  const treatmentResult = calculateEffluentTreatmentRemoval(selectedSourceId, flowKld);

  const filteredSources = effluentDataStore.sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 text-xl">💧</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Industrial Wastewater Effluent Surveillance Command</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Continuous Discharge Monitoring System (CCTMS), BOD/COD ratios, heavy metal loading & ETP simulation
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {['overview', 'sources', 'zones', 'treatment', 'mitigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Average Outfall BOD" value="184.2" unit="mg/L" trend="▲ Exceeds 30 mg/L limit" isAlert={true} />
        <StatCard title="CPCB Violation Alerts" value="42" unit="Events" trend="▲ +8% vs yesterday" isAlert={true} />
        <StatCard title="CCTMS Online Stations" value="74" unit="/ 78 Units" trend="✔ 94.8% Operational" isAlert={false} />
        <StatCard title="ETP Treatment Efficiency" value="82.4" unit="%" trend="▲ +1.8% month-over-month" isAlert={false} />
      </section>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>📈</span> 24-Hour BOD/COD Effluent Telemetry Trend
              </h3>
              <HourlyEffluentChart data={effluentDataStore.hourlyTrends} />
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🏭</span> Plant Outfall BOD & CPCB Exceedances
              </h3>
              <PlantEffluentChart data={effluentDataStore.plantProfiles} />
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Top Industrial Wastewater Sources & BOD/COD Load</h3>
            <SourceBodCodChart data={effluentDataStore.sources} />
          </div>
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">Industrial Wastewater Discharge Inventory</h3>
            <input
              type="text"
              placeholder="Search effluent sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-4 py-2 rounded-xl outline-none focus:border-amber-500 w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => (
              <EffluentSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {effluentDataStore.zones.map((zone) => (
            <DischargeZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}

      {/* Tab 4: Treatment Modeler */}
      {activeTab === 'treatment' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Effluent Treatment Plant (ETP) Simulator</h3>
            <p className="text-xs text-slate-400 font-mono">
              Models secondary biological treatment removal efficiency and daily mass loading (Kg/day)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Select Industrial Effluent Stream</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl outline-none focus:border-amber-500 font-mono"
              >
                {effluentDataStore.sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.avgBodMgL} mg/L BOD)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Wastewater Flow Rate ({flowKld} KLD)</label>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={flowKld}
                onChange={(e) => setFlowKld(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RAW BOD LOAD</span>
                <span className="text-lg font-bold text-amber-400">{treatmentResult.rawBodLoadKgDay} kg/day</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TREATED BOD (EFFLUENT)</span>
                <span className="text-lg font-bold text-blue-400">{treatmentResult.treatedBod} mg/L</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TREATED COD</span>
                <span className="text-lg font-bold text-purple-400">{treatmentResult.treatedCod} mg/L</span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TREATED BOD MASS</span>
                <span className="text-lg font-bold text-emerald-400">{treatmentResult.treatedBodLoadKgDay} kg/day</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs text-center font-bold ${
              treatmentResult.isCompliantPostTreatment ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}>
              {treatmentResult.isCompliantPostTreatment 
                ? `✔ ETP COMPLIANT: Post-treatment BOD (${treatmentResult.treatedBod} mg/L) meets 30 mg/L CPCB discharge standard!`
                : `⚠️ ETP NON-COMPLIANT: Post-treatment BOD (${treatmentResult.treatedBod} mg/L) exceeds 30 mg/L CPCB discharge limit!`
              }
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Mitigation */}
      {activeTab === 'mitigation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {effluentDataStore.goals.map((goal) => (
            <EffluentGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
