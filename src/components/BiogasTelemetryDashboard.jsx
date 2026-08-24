import React, { useState, useEffect } from 'react';

export default function BiogasTelemetryDashboard() {
  const [telemetry, setTelemetry] = useState({ recoveryRate: 0, status: 'Normal' });

  useEffect(() => {
    // Simulated real-time telemetry stream
    const interval = setInterval(() => {
      setTelemetry({
        recoveryRate: (Math.random() * 20 + 80).toFixed(2),
        status: 'Optimal'
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-teal-800">Biogas Recovery Telemetry</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-teal-50 rounded-lg">
          <p className="text-sm text-gray-600">Recovery Rate</p>
          <p className="text-2xl font-semibold text-teal-900">{telemetry.recoveryRate} m³/h</p>
        </div>
        <div className="p-4 bg-teal-50 rounded-lg">
          <p className="text-sm text-gray-600">System Status</p>
          <p className="text-2xl font-semibold text-teal-900">{telemetry.status}</p>
        </div>
      </div>
    </div>
  );
}
