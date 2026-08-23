import React from 'react';

export default function HotspotAlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
      <h3 className="text-red-800 font-bold text-lg mb-2">⚠️ Active Hazard Hotspots Detected</h3>
      <ul className="space-y-1">
        {alerts.map((alert) => (
          <li key={alert.alert_id} className="text-sm text-red-700">
            Alert ID: {alert.alert_id} | Severity: {alert.severity_score.toFixed(1)} | Fire Risk: {(alert.fire_risk_probability * 100).toFixed(0)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
