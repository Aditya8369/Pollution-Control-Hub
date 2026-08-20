import React from 'react';
import { MarineBuoyNodeReading } from '../../services/MarineWaterModel';
import { Waves, AlertTriangle, ShieldCheck, Droplets, Anchor, Navigation } from 'lucide-react';

interface CardProps {
  buoy: MarineBuoyNodeReading;
  onSelect: (buoy: MarineBuoyNodeReading) => void;
}

export const MarineBuoyCardTile: React.FC<CardProps> = ({ buoy, onSelect }) => {
  const getSafetyBadge = (status: string) => {
    switch (status) {
      case 'Safe for Swimming':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Caution Advised':
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
            <span className="bg-cyan-50 text-cyan-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {buoy.waterCategory}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{buoy.coastalZoneName}</h3>
            <p className="text-xs text-gray-500 font-mono">Buoy ID: {buoy.buoyNodeId}</p>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getSafetyBadge(buoy.bathingSafetyStatus)}`}>
            {buoy.bathingSafetyStatus}
          </span>
        </div>

        {/* Water Quality Telemetry */}
        <div className="p-3 bg-gray-50 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">Dissolved Oxygen:</span>
            <span className={`font-extrabold text-sm ${buoy.dissolvedOxygenMgL < 4.0 ? 'text-red-600' : 'text-emerald-600'}`}>{buoy.dissolvedOxygenMgL} mg/L</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Microplastics Index:</span>
            <span className="font-extrabold text-gray-900 text-sm">{buoy.microplasticsPpm} PPM</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Oil Slick Status:</span>
            <span className={`font-extrabold text-sm ${buoy.oilSlickDetected ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
              {buoy.oilSlickDetected ? 'SLICK DETECTED' : 'Clear Water'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Turbidity / pH:</span>
            <span className="font-extrabold text-gray-900 text-sm">{buoy.turbidityNtu} NTU | {buoy.phLevel} pH</span>
          </div>
        </div>

        {/* Ecosystem Score */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-gray-500 font-medium">Marine Health Score:</span>
          <span className="font-bold text-cyan-700 font-mono">{buoy.marineEcosystemHealthScore} / 100</span>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(buoy)}
        className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Waves className="w-3.5 h-3.5" />
        Dispatch Skimmer & Sampling Drone
      </button>
    </div>
  );
};
