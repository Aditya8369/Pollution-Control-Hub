import React, { useState } from 'react';
import { useSensorHealth } from '../hooks/useSensorHealth';

/**
 * Reads a numeric metric off the health record without confusing "zero" with "absent".
 *
 * `sensor_health_scores.health_score` is `INTEGER CHECK (health_score >= 0 AND
 * health_score <= 100)` and `uptime_percentage` is `DECIMAL(5,2)`. Zero is legal and
 * meaningful in both — it is what a sensor that has dropped out entirely looks like,
 * which is the case this dashboard exists to surface. `value || fallback` treated that
 * sensor as having no data at all.
 *
 * @param {unknown} value
 * @returns {number|null} The number, or null when there is genuinely nothing to show.
 */
export function readMetric(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Colour band for a health score.
 *
 * `null` gets a neutral grey rather than the red that `getScoreColor(score || 0)`
 * produced — an unknown score is not a failing score, and colouring it red during the
 * first load made every sensor flash as critical before its data arrived.
 *
 * @param {number|null} score
 */
export function getScoreColor(score) {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
}

/**
 * A percentage for display, or an explicit "no measurement" marker.
 *
 * The previous `metrics?.uptimePercentage || '98.5'` rendered a specific, plausible,
 * reassuring figure whenever the field was missing or zero. Nothing on screen
 * distinguished it from a measured value, so a sensor with no uptime data and a sensor
 * with 98.5% uptime looked identical.
 *
 * @param {number|null} value
 * @returns {string}
 */
export function formatPercentage(value) {
    if (value === null) return 'No data';
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/**
 * @component SensorHealthDashboard
 * @description Administrative dashboard visualizing sensor health scores, uptime, and upcoming maintenance needs.
 */
const SensorHealthDashboard = () => {
    // Mock sensor ID for demonstration; in real app, this comes from router or context
    const [selectedSensorId, setSelectedSensorId] = useState('sensor_001');
    const {
        metrics,
        alerts,
        loading,
        refreshing,
        error,
        refetch,
        acknowledgeAlert,
    } = useSensorHealth(selectedSensorId);
    const [noteModal, setNoteModal] = useState({ open: false, alertId: null, notes: '' });
    const [isAcknowledging, setIsAcknowledging] = useState(false);

    const healthScore = readMetric(metrics?.healthScore);
    const uptime = readMetric(metrics?.uptimePercentage);

    // Only the first load blanks the page. A 30-second refresh that did this would
    // unmount the acknowledgment modal — and the resolution notes typed into it —
    // twice a minute.
    if (loading) {
        return <div className="p-8 text-center text-gray-500" data-testid="health-loading">Loading health metrics...</div>;
    }

    // A failure with nothing behind it is the whole page; a failure with data already
    // on screen is a banner over that data. Either way it offers a way back, which the
    // latched error state did not.
    if (error && !metrics && alerts.length === 0) {
        return (
            <div className="p-8 text-center" data-testid="health-error">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={refetch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    const handleConfirmAcknowledge = async () => {
        setIsAcknowledging(true);
        const succeeded = await acknowledgeAlert(noteModal.alertId, noteModal.notes);
        setIsAcknowledging(false);
        // The notes are the only copy of what the engineer just wrote, so the modal
        // stays open on failure rather than discarding them.
        if (succeeded) setNoteModal({ open: false, alertId: null, notes: '' });
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Predictive Maintenance Dashboard</h2>
                {refreshing && (
                    <span className="text-xs text-gray-400" data-testid="health-refreshing">Refreshing…</span>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    data-testid="health-error-banner"
                    className="mb-6 flex items-center justify-between gap-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300"
                >
                    <span className="text-sm">{error} — showing the last successful reading.</span>
                    <button onClick={refetch} className="text-sm font-semibold underline whitespace-nowrap">
                        Retry
                    </button>
                </div>
            )}

            {/* Health Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Overall Health Score</h3>
                    <div className={`text-5xl font-bold ${getScoreColor(healthScore)}`} data-testid="health-score">
                        {healthScore === null ? '--' : healthScore}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">out of 100</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Uptime (30 Days)</h3>
                    <div
                        className={`text-4xl font-bold ${uptime === null ? 'text-gray-400' : 'text-blue-600'}`}
                        data-testid="uptime"
                    >
                        {formatPercentage(uptime)}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Active Alerts</h3>
                    <div className="text-4xl font-bold text-red-600" data-testid="active-alert-count">
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
                        aria-label="Sensor"
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" data-testid="acknowledge-modal">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Acknowledge Alert</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Please provide resolution notes or maintenance actions taken.
                        </p>
                        <textarea
                            value={noteModal.notes}
                            onChange={(e) => setNoteModal({ ...noteModal, notes: e.target.value })}
                            aria-label="Resolution notes"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-4"
                            rows="4"
                            placeholder="e.g., Cleaned PM2.5 sensor lens, recalibrated..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setNoteModal({ open: false, alertId: null, notes: '' })}
                                disabled={isAcknowledging}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAcknowledge}
                                disabled={isAcknowledging}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                            >
                                {isAcknowledging ? 'Saving…' : 'Confirm Acknowledgment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SensorHealthDashboard;
