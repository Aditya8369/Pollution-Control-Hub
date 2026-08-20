import React from 'react';
import { MicroclimateZoneReading } from '../../services/MicroclimateModel';
import { Sun, Thermometer, Trees, ShieldAlert, Zap, Compass } from 'lucide-react';

interface CardProps {
  zone: MicroclimateZoneReading;
  onSelect: (zone: MicroclimateZoneReading) => void;
}

export const MicroclimateZoneCardTile: React.FC<CardProps> = ({ zone, onSelect }) => {
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moderate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'High':
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
            <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {zone.urbanType}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{zone.zoneName}</h3>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getRiskBadge(zone.heatRiskLevel)}`}>
            {zone.heatRiskLevel}
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Ambient / Surface Temp:</span>
            <span className="font-extrabold text-gray-900 text-sm">{zone.ambientTempCelsius}°C / {zone.surfaceTempCelsius}°C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Heat Island Delta:</span>
            <span className="font-bold text-red-600 font-mono">+{zone.heatIslandIntensityDeltaC}°C vs Rural</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Green Canopy Cover:</span>
            <span className="font-bold text-emerald-600 font-mono">{zone.greenCanopyCoverPercentage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Albedo Reflectance Index:</span>
            <span className="font-bold text-indigo-600 font-mono">{zone.albedoReflectanceIndex}</span>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs font-medium text-amber-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Intervention: <strong>{zone.recommendedIntervention}</strong></span>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(zone)}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Sun className="w-3.5 h-3.5" />
        Schedule Heat Mitigation Project
      </button>
    </div>
  );
};
