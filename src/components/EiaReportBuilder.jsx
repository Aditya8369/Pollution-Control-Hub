import React, { useState, useEffect } from 'react';
import { generateEiaReport, fetchEiaReportStatus, downloadEiaReport } from '../services/eiaService';

/**
 * @component EiaReportBuilder
 * @description Form-based UI for inputting project coordinates, assessment radius, duration, and selecting target pollutants.
 */
const EiaReportBuilder = () => {
    const [formData, setFormData] = useState({
        projectName: '',
        centerLat: 28.6139,
        centerLng: 77.2090,
        radiusMeters: 5000,
        durationMonths: 12,
        targetPollutants: ['PM25', 'PM10', 'NO2'],
    });

    const [currentReport, setCurrentReport] = useState(null);
    const [polling, setPolling] = useState(false);
    const [error, setError] = useState(null);

    const availablePollutants = ['PM25', 'PM10', 'NO2', 'SO2', 'CO', 'O3'];

    const handlePollutantToggle = (pollutant) => {
        setFormData(prev => ({
            ...prev,
            targetPollutants: prev.targetPollutants.includes(pollutant)
                ? prev.targetPollutants.filter(p => p !== pollutant)
                : [...prev.targetPollutants, pollutant],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.targetPollutants.length === 0) {
            setError('Please select at least one target pollutant.');
            return;
        }
        setError(null);
        try {
            const report = await generateEiaReport(formData);
            setCurrentReport(report);
            setPolling(true);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        let interval;
        if (polling && currentReport?.status === 'GENERATING') {
            interval = setInterval(async () => {
                try {
                    const updated = await fetchEiaReportStatus(currentReport.id);
                    setCurrentReport(updated);
                    if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
                        setPolling(false);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000); // Poll every 3 seconds
        }
        return () => clearInterval(interval);
    }, [polling, currentReport]);

    const getStatusBadge = (status) => {
        const styles = {
            GENERATING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return styles[status] || styles.GENERATING;
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">EIA Baseline Report Generator</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Generate standardized Environmental Impact Assessment baseline reports for municipal planning.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Form */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Configuration</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                            <input
                                type="text"
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., New Industrial Zone"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.centerLat}
                                    onChange={(e) => setFormData({ ...formData, centerLat: parseFloat(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.centerLng}
                                    onChange={(e) => setFormData({ ...formData, centerLng: parseFloat(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Assessment Radius: {formData.radiusMeters} m
                            </label>
                            <input
                                type="range"
                                min="1000"
                                max="20000"
                                step="1000"
                                value={formData.radiusMeters}
                                onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })}
                                className="w-full accent-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Months)</label>
                            <select
                                value={formData.durationMonths}
                                onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months</option>
                                <option value={12}>12 Months</option>
                                <option value={24}>24 Months</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Pollutants</label>
                            <div className="space-y-2">
                                {availablePollutants.map(p => (
                                    <label key={p} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.targetPollutants.includes(p)}
                                            onChange={() => handlePollutantToggle(p)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{p}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={polling}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {polling ? 'Generating Report...' : 'Generate Baseline Report'}
                        </button>
                    </form>
                </div>

                {/* Results Display */}
                <div className="lg:col-span-2">
                    {!currentReport ? (
                        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="mt-2">Configure and generate a report to view results here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentReport.projectName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Report ID: {currentReport.id}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusBadge(currentReport.status)}`}>
                                    {currentReport.status}
                                </span>
                            </div>

                            {currentReport.status === 'GENERATING' && (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Aggregating 12-month historical data and computing statistical summaries...</p>
                                </div>
                            )}

                            {currentReport.status === 'COMPLETED' && currentReport.summary && (
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className={`w-4 h-4 rounded-full ${currentReport.summary.overallComplianceStatus === 'COMPLIANT' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">Overall Compliance Status</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {currentReport.summary.overallComplianceStatus === 'COMPLIANT'
                                                    ? 'All pollutants are within regulatory limits.'
                                                    : 'One or more pollutants exceeded regulatory thresholds.'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pollutant</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mean</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">98th %ile</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Limit</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {currentReport.summary.statistics.map((stat, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{stat.pollutant}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{stat.mean} {stat.unit}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{stat.percentile98} {stat.unit}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{stat.max} {stat.unit}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{stat.regulatoryLimit} {stat.unit}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${stat.isCompliant
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                }`}>
                                                                {stat.isCompliant ? 'Compliant' : `Exceeded (${stat.exceedanceDays}d)`}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => downloadEiaReport(currentReport.id, 'json')}
                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                        >
                                            Download JSON
                                        </button>
                                        <button
                                            onClick={() => downloadEiaReport(currentReport.id, 'csv')}
                                            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                                        >
                                            Download CSV
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentReport.status === 'FAILED' && (
                                <div className="p-12 text-center text-red-600 dark:text-red-400">
                                    <p className="font-semibold">Report generation failed.</p>
                                    <p className="text-sm mt-2">Please check your configuration and try again.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EiaReportBuilder;
