import React from 'react';
import { LandfillSectorReading } from '../../services/LandfillMethaneModel';
import { Flame, ShieldAlert, FlameKindling, Biohazard, Activity } from 'lucide-react';

interface CardProps {
  sector: LandfillSectorReading;
  onSelect: (sector: LandfillSectorReading) => void;
}

export const LandfillSectorCardTile: React.FC<CardProps> = ({ sector, onSelect }) => {
  const getHazardBadge = (level: string) => {
    switch (level) {
      case 'Low Risk':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moderate Warning':
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
            <span className="bg-green-50 text-green-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {sector.wasteTypeCategory}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{sector.landfillSiteName}</h3>
            <p className="text-xs text-gray-500 font-mono">Sector: {sector.sectorZoneId}</p>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getHazardBadge(sector.environmentalHazardLevel)}`}>
            {sector.environmentalHazardLevel}
          </span>
        </div>

        {/* Telemetry Grid */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Methane (CH4) Concentration:</span>
            <span className={`font-extrabold text-sm ${sector.methaneCh4Ppm > 800 ? 'text-red-600' : 'text-gray-900'}`}>{sector.methaneCh4Ppm} PPM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Subsurface Fire Risk:</span>
            <span className="font-bold text-red-600 font-mono">{sector.fireSubsurfaceRiskScore} / 100 Risk</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Surface Temp / Leachate pH:</span>
            <span className="font-bold text-slate-800 font-mono">{sector.surfaceTempCelsius}°C | {sector.leachatePercolationPh} pH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Biogas Recovery Status:</span>
            <span className="font-bold text-indigo-600">{sector.biogasRecoveryStatus}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(sector)}
        className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Biohazard className="w-3.5 h-3.5" />
        Dispatch Treatment & Vacuum Unit
      </button>
    </div>
  );
};
