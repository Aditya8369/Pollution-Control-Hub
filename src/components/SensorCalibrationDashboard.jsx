import React, { useState, useEffect } from 'react';
import { submitCalibrationReading, fetchCalibrationStatus, toggleCorrectionFactor } from '../services/calibrationService';

/**
 * @component SensorCalibrationDashboard
 * @description Administrative and community UI for submitting reference readings and viewing active drift correction factors.
 */
const SensorCalibrationDashboard = () => {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        lowCostSensorId: '',
        referenceSensorId: '',
        pollutant: 'PM25',
        lowCostReading: '',
        referenceReading: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const data = await fetchCalibrationStatus();
            setStatusData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await submitCalibrationReading({
                ...formData,
                lowCostReading: parseFloat(formData.lowCostReading),
                referenceReading: parseFloat(formData.referenceReading),
                submittedBy: 'current_user_id', // Replace with actual auth user ID
            });
            setFormData({ ...formData, lowCostReading: '', referenceReading: '' });
            await loadStatus();
            alert('Calibration reading submitted successfully!');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            await toggleCorrectionFactor(id, !currentStatus);
            await loadStatus();
        } catch (err) {
            alert('Failed to update factor status.');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            EXCELLENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            GOOD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            NEEDS_CALIBRATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            OFFLINE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return colors[status] || colors.OFFLINE;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sensor Calibration & Drift Correction</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Submit co-located reference readings to improve low-cost sensor accuracy through automated linear regression.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submission Form */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Submit Calibration Reading</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low-Cost Sensor ID</label>
                            <input
                                type="text"
                                value={formData.lowCostSensorId}
                                onChange={(e) => setFormData({ ...formData, lowCostSensorId: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., LC-001"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Sensor ID</label>
                            <input
                                type="text"
                                value={formData.referenceSensorId}
                                onChange={(e) => setFormData({ ...formData, referenceSensorId: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., REF-001"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pollutant</label>
                            <select
                                value={formData.pollutant}
                                onChange={(e) => setFormData({ ...formData, pollutant: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="PM25">PM2.5</option>
                                <option value="PM10">PM10</option>
                                <option value="NO2">NO2</option>
                                <option value="O3">O3</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low-Cost Reading</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.lowCostReading}
                                    onChange={(e) => setFormData({ ...formData, lowCostReading: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Reading</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.referenceReading}
                                    onChange={(e) => setFormData({ ...formData, referenceReading: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Reading'}
                        </button>
                    </form>
                </div>

                {/* Active Correction Factors */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Correction Factors & Sensor Status</h3>

                    {statusData?.coefficients && statusData.coefficients.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sensor</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pollutant</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Formula (y = mx + c)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">R²</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {statusData.coefficients.map((coef) => (
                                        <tr key={coef.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{coef.lowCostSensorId}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{coef.pollutant}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                y = {coef.slope}x + {coef.intercept}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{coef.rSquared}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${coef.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {coef.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleToggle(coef.id, coef.isActive)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${coef.isActive
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                                                        }`}
                                                >
                                                    {coef.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No active correction factors computed yet. Submit co-located readings to generate them.
                        </div>
                    )}

                    {/* Accuracy Improvement Visualization */}
                    {statusData?.accuracyStatus && statusData.accuracyStatus.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Sensor Accuracy Improvement</h4>
                            <div className="space-y-4">
                                {statusData.accuracyStatus.map((sensor) => (
                                    <div key={sensor.sensorId} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-900 dark:text-white">{sensor.sensorName} ({sensor.pollutant})</span>
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(sensor.status)}`}>
                                                {sensor.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>Raw Accuracy</span>
                                                    <span>{sensor.rawAccuracy}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${sensor.rawAccuracy}%` }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>Calibrated Accuracy</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400">{sensor.calibratedAccuracy}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sensor.calibratedAccuracy}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SensorCalibrationDashboard;
