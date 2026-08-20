import React from 'react';
import { CleanupDroneDispatchRecord } from '../../services/MarineWaterModel';
import { Navigation, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

interface ComponentProps {
  dispatches: CleanupDroneDispatchRecord[];
}

export const CleanupDroneDispatchList: React.FC<ComponentProps> = ({ dispatches }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Autonomous Water Cleanup & Sampling Fleet</h3>
          <p className="text-sm text-gray-500">Live surface skimmer & dispersant spray drone missions</p>
        </div>
        <span className="bg-cyan-50 text-cyan-700 font-bold px-3 py-1 rounded-full text-xs">
          {dispatches.length} Drone Missions Active
        </span>
      </div>

      {dispatches.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Navigation className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No marine drones currently deployed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{item.coastalZoneName}</span>
                  <span className="bg-cyan-100 text-cyan-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {item.droneType}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span>Buoy Node: {item.buoyNodeId}</span>
                  <span>•</span>
                  <span>Battery: {item.batteryStatusPercentage}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="w-4 h-4" /> {item.missionStatus}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
