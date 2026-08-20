import React from 'react';
import { HeatMitigationIntervention } from '../../services/MicroclimateModel';
import { Trees, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

interface ComponentProps {
  interventions: HeatMitigationIntervention[];
}

export const HeatMitigationList: React.FC<ComponentProps> = ({ interventions }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Urban Heat Island Mitigation Projects</h3>
          <p className="text-sm text-gray-500">Active cool-roof, urban canopy, and permeable pavement intervention projects</p>
        </div>
        <span className="bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full text-xs">
          {interventions.length} Projects Scheduled
        </span>
      </div>

      {interventions.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Trees className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No heat mitigation projects scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interventions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{item.zoneName}</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {item.interventionType}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span>Cost: ${item.estimatedCostUsd.toLocaleString()}</span>
                  <span>•</span>
                  <span>Target Temp Impact: -{item.projectedTempReductionC}°C</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="w-4 h-4" /> {item.fundingStatus}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
