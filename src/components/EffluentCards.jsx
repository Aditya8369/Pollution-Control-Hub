/**
 * Enterprise Architectural Specification:
 * Module: Industrial Wastewater Effluent Cards UI Component Tier
 * File: src/components/EffluentCards.jsx
 * Domain: React Functional UI Components, Wastewater Outfall Telemetry Cards
 */

import React from 'react';
import { getEffluentRiskSeverity } from './effluentTypes';

export function StatCard({ title, value, unit, trend, isAlert }) {
  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
      isAlert ? 'bg-red-950/40 border-red-500/50 text-red-200' : 'bg-slate-900/60 border-slate-800 text-slate-100'
    }`}>
      <span className="text-xs uppercase font-mono text-slate-400 block mb-1">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono">{value}</span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
      </div>
      {trend && (
        <span className={`text-xs font-mono mt-2 block ${
          trend.includes('▲') ? 'text-red-400' : trend.includes('▼') ? 'text-emerald-400' : 'text-slate-400'
        }`}>
          {trend}
        </span>
      )}
    </div>
  );
}

export function EffluentSourceCard({ source }) {
  const severity = getEffluentRiskSeverity(source.avgBodMgL);

  return (
    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-sm text-slate-100">{source.name}</h4>
          <span className="px-2 py-0.5 text-[10px] font-mono rounded font-semibold" style={{ backgroundColor: `${severity.color}20`, color: severity.color, border: `1px solid ${severity.color}40` }}>
            {severity.level}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono block mb-3">{source.category}</span>
        
        <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-3">
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-500 block text-[9px]">BOD (5-DAY)</span>
            <span className="text-amber-400 font-bold text-sm">{source.avgBodMgL} mg/L</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-500 block text-[9px]">COD (CHEM)</span>
            <span className="text-blue-400 font-bold text-sm">{source.avgCodMgL} mg/L</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
            <span className="text-slate-500 block text-[9px]">CHROMIUM</span>
            <span className="text-red-400 font-bold text-sm">{source.totalChromiumPpm} ppm</span>
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60">
        Discharge Audit: <span className={source.avgBodMgL > 30 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
          {source.avgBodMgL > 30 ? 'Exceeds 30 mg/L CPCB Limit' : 'Within Standard'}
        </span>
      </div>
    </div>
  );
}

export function DischargeZoneCard({ zone }) {
  const severity = getEffluentRiskSeverity(zone.baselineBodMgL);

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">{zone.id}</span>
          <span className="text-xs font-mono font-bold" style={{ color: severity.color }}>{zone.baselineBodMgL} mg/L BOD</span>
        </div>
        <h4 className="font-bold text-sm text-slate-100 mb-1">{zone.name}</h4>
        <span className="text-xs text-slate-400 block font-mono">{zone.category}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono">
        <span className="text-slate-400">Outfall Status:</span>
        <span className="font-semibold" style={{ color: severity.color }}>{severity.label}</span>
      </div>
    </div>
  );
}

export function EffluentGoalCard({ goal }) {
  const isAchieved = goal.status === 'ACHIEVED';

  return (
    <div className={`p-4 rounded-xl border ${
      isAchieved ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm text-slate-100">{goal.title}</h4>
        <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
          isAchieved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
        }`}>
          {goal.status}
        </span>
      </div>

      <div className="flex justify-between items-baseline text-xs font-mono my-3">
        <span className="text-slate-400">Current vs Target BOD:</span>
        <span className="font-bold text-slate-200">{goal.currentBod} mg/L / <span className="text-emerald-400">{goal.targetBod} mg/L</span></span>
      </div>

      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
        <div 
          className={`h-full transition-all ${isAchieved ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, (goal.targetBod / goal.currentBod) * 100)}%` }}
        />
      </div>
    </div>
  );
}
