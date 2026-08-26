import React, { useState } from 'react';
import { useSensorHealth } from '../hooks/useSensorHealth';

/**
 * @component SensorHealthDashboard
 * @description Administrative dashboard visualizing sensor health scores, uptime, and upcoming maintenance needs.
 */
const SensorHealthDashboard = () => {
    // Mock sensor ID for demonstration; in real app, this comes from router or context
    const [selectedSensorId, setSelectedSensorId] = useState('sensor_001');
    const { metrics, alerts, loading, error, acknowledgeAlert } = useSensorHealth(selectedSensorId);
    const [noteModal, setNoteModal] = useState({ open: false, alertId: null, notes: '' });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading health metrics...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Predictive Maintenance Dashboard</h2>

            {/* Health Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Overall Health Score</h3>
                    <div className={`text-5xl font-bold ${getScoreColor(metrics?.healthScore || 0)}`}>
                        {metrics?.healthScore || '--'}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">out of 100</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Uptime (30 Days)</h3>
                    <div className="text-4xl font-bold text-blue-600">{metrics?.uptimePercentage || '98.5'}%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Active Alerts</h3>
                    <div className="text-4xl font-bold text-red-600">
                        {alerts.filter(a => !a.acknowledged).length}
                    </div>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Maintenance Alerts</h3>
                    <select
                        value={selectedSensorId}
                        onChange={(e) => setSelectedSensorId(e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="sensor_001">Sensor 001 (Downtown)</option>
                        <option value="sensor_002">Sensor 002 (Industrial Zone)</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-400">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Detected At</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Severity</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.length > 0 ? (
                                alerts.map((alert) => (
                                    <tr key={alert.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">{new Date(alert.detectedAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium">{alert.alertType}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                                    alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{alert.description}</td>
                                        <td className="px-6 py-4">
                                            {alert.acknowledged ? (
                                                <span className="text-green-600 font-medium">Resolved</span>
                                            ) : (
                                                <span className="text-red-600 font-medium">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!alert.acknowledged && (
                                                <button
                                                    onClick={() => setNoteModal({ open: true, alertId: alert.id, notes: '' })}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Acknowledge
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No alerts for this sensor. It is operating normally.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Acknowledge Modal */}
            {noteModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Acknowledge Alert</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Please provide resolution notes or maintenance actions taken.
                        </p>
                        <textarea
                            value={noteModal.notes}
                            onChange={(e) => setNoteModal({ ...noteModal, notes: e.target.value })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-4"
                            rows="4"
                            placeholder="e.g., Cleaned PM2.5 sensor lens, recalibrated..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setNoteModal({ open: false, alertId: null, notes: '' })}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    acknowledgeAlert(noteModal.alertId, noteModal.notes);
                                    setNoteModal({ open: false, alertId: null, notes: '' });
                                }}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                            >
                                Confirm Acknowledgment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SensorHealthDashboard;
