import React from 'react';
import { IndustrialStackReading } from '../../services/IndustrialEmissionModel';
import { Factory, AlertTriangle, ShieldCheck, Flame, Gauge, Wind } from 'lucide-react';

interface CardProps {
  stack: IndustrialStackReading;
  onSelect: (stack: IndustrialStackReading) => void;
}

export const IndustrialStackCardTile: React.FC<CardProps> = ({ stack, onSelect }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fully Compliant':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Warning Threshold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {stack.industryCategory}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{stack.facilityName}</h3>
            <p className="text-xs text-gray-500 font-mono">Stack Node: {stack.stackId} • {stack.locationRegion}</p>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusBadge(stack.regulatoryLimitStatus)}`}>
            {stack.regulatoryLimitStatus}
          </span>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="p-3 bg-gray-50 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">SO2 Gas Concentration:</span>
            <span className={`font-extrabold text-sm ${stack.so2Ppm > 250 ? 'text-red-600' : 'text-gray-900'}`}>{stack.so2Ppm} PPM</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">NOx Gas Concentration:</span>
            <span className={`font-extrabold text-sm ${stack.noxPpm > 300 ? 'text-red-600' : 'text-gray-900'}`}>{stack.noxPpm} PPM</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Particulate Matter (PM):</span>
            <span className="font-extrabold text-gray-900 text-sm">{stack.pmMgM3} mg/m³</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">CO2 Concentration:</span>
            <span className="font-extrabold text-gray-900 text-sm">{stack.co2Percentage}%</span>
          </div>
        </div>

        {/* Flow & Score */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-gray-500 font-medium">Compliance Scorecard:</span>
          <span className="font-bold text-emerald-600 font-mono">{stack.complianceScore} / 100</span>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(stack)}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Factory className="w-3.5 h-3.5" />
        Inspect Flare Telemetry Details
      </button>
    </div>
  );
};
