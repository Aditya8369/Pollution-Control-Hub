import React, { useState, useEffect } from 'react';
import { fetchAnomalyData, overrideSensorState, acknowledgeAnomaly } from '../services/anomalyDetectionService';

/**
 * @component SensorAnomalyDashboard
 * @description Administrative UI for reviewing flagged anomalies, isolating faulty sensors, and overriding automated flags.
 */
const SensorAnomalyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overrideModal, setOverrideModal] = useState({ open: false, sensorId: '', state: 'ACTIVE', reason: '' });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const result = await fetchAnomalyData();
      setData(result);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (anomalyId) => {
    try {
      await acknowledgeAnomaly(anomalyId);
      await loadData();
    } catch (err) {
      alert('Failed to acknowledge anomaly.');
    }
  };

  const handleOverride = async () => {
    try {
      await overrideSensorState(overrideModal.sensorId, overrideModal.state, overrideModal.reason);
      setOverrideModal({ open: false, sensorId: '', state: 'ACTIVE', reason: '' });
      await loadData();
    } catch (err) {
      alert('Failed to override sensor state.');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[severity] || colors.LOW;
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sensor Anomaly & Isolation Dashboard</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Auto-refreshes every 30 seconds
        </div>
      </div>

      {/* Active Anomalies */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Anomalies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sensor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value / Expected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data?.anomalies.length > 0 ? data.anomalies.map((anomaly) => (
                <tr key={anomaly.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{anomaly.sensorId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{anomaly.type.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {anomaly.metricValue.toFixed(2)} 
                    <span className="text-gray-400 ml-2">
                      (Exp: {anomaly.expectedRange.min.toFixed(1)} - {anomaly.expectedRange.max.toFixed(1)})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleAcknowledge(anomaly.id)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      Acknowledge
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No active anomalies detected. All sensors operating within normal parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensor Isolation States */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sensor Isolation Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {data?.isolationStates.map((sensor) => (
            <div key={sensor.sensorId} className={`p-4 rounded-lg border ${sensor.state === 'ISOLATED' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 dark:text-white">{sensor.sensorId}</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${sensor.state === 'ISOLATED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                  {sensor.state}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {sensor.reason || 'Operating normally.'}
              </p>
              <button
                onClick={() => setOverrideModal({ open: true, sensorId: sensor.sensorId, state: sensor.state === 'ISOLATED' ? 'ACTIVE' : 'ISOLATED', reason: '' })}
                className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md transition-colors"
              >
                {sensor.state === 'ISOLATED' ? 'Reinstate Sensor' : 'Manually Isolate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Override Sensor State</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are changing the state of <strong>{overrideModal.sensorId}</strong> to <strong>{overrideModal.state}</strong>.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Override</label>
              <textarea
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                rows="3"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOverrideModal({ open: false, sensorId: '', state: 'ACTIVE', reason: '' })}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorAnomalyDashboard;
