import React from 'react';
import { EmissionViolationAlert } from '../../services/IndustrialEmissionModel';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface ComponentProps {
  alerts: EmissionViolationAlert[];
  onAcknowledge: (alertId: string) => void;
}

export const EmissionViolationAlertList: React.FC<ComponentProps> = ({ alerts, onAcknowledge }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Regulatory Exceedance & Flare Alert Telemetry</h3>
          <p className="text-sm text-gray-500">Live regulatory stack violation incidents requiring automated mitigation response</p>
        </div>
        <span className="bg-red-50 text-red-700 font-bold px-3 py-1 rounded-full text-xs">
          {alerts.length} Active Alerts
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <ShieldAlert className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No active industrial emission exceedances recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{alert.facilityName}</span>
                  <span className="bg-red-100 text-red-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {alert.pollutantExceeded}: {alert.measuredValue} (Limit: {alert.permittedLimit})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span>Stack ID: {alert.stackId}</span>
                  <span>•</span>
                  <span>Severity: {alert.severityLevel}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {alert.mitigationActionTaken ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mitigation Active
                  </span>
                ) : (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Trigger Mitigation Response
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
