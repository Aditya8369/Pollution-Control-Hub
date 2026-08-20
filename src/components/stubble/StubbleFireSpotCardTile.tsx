import React from 'react';
import { ThermalFireSpotReading } from '../../services/AgriculturalStubbleModel';
import { Flame, Wind, Satellite, ShieldAlert, Compass, Sprout } from 'lucide-react';

interface CardProps {
  spot: ThermalFireSpotReading;
  onSelect: (spot: ThermalFireSpotReading) => void;
}

export const StubbleFireSpotCardTile: React.FC<CardProps> = ({ spot, onSelect }) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Isolated Farm':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moderate Cluster':
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
            <span className="bg-orange-50 text-orange-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {spot.cropType}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{spot.districtName}</h3>
            <p className="text-xs text-gray-500 font-mono">{spot.stateRegion}</p>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getSeverityBadge(spot.incidentSeverity)}`}>
            {spot.incidentSeverity}
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Active Thermal Fire Spots:</span>
            <span className="font-extrabold text-red-600 text-sm">{spot.fireSpotCount} Spots ({spot.estimatedAcresAffected} Acres)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">PM2.5 Regional Spike:</span>
            <span className="font-bold text-red-600 font-mono">+{spot.pm25SpikeContribution} µg/m³</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Smoke Plume Trajectory:</span>
            <span className="font-bold text-indigo-600 font-mono">{spot.plumeDirectionVector}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Satellite Telemetry Source:</span>
            <span className="font-bold text-slate-700">{spot.satelliteSource}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(spot)}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Sprout className="w-3.5 h-3.5" />
        Dispatch Bio-Decomposer Fleet
      </button>
    </div>
  );
};
