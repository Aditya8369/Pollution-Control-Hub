import React, { useState } from 'react';
import { generateComplianceReport, downloadComplianceReport } from '../services/complianceEngine';
import { exportToCSV, exportToJSON } from '../utils/reportExporter';

/**
 * @component ComplianceReportGenerator
 * @description UI for selecting date ranges, regulatory standards, and triggering report generation.
 */
const ComplianceReportGenerator = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [standard, setStandard] = useState('CPCB');
    const [isGenerating, setIsGenerating] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            setError('Please select both start and end dates.');
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const data = await generateComplianceReport(startDate, endDate, standard);
            setReport(data);
        } catch (err) {
            setError(err.message || 'Failed to generate report. Check permissions.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (format) => {
        if (!report) return;
        if (format === 'csv') {
            const csv = exportToCSV(report);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compliance_${standard}_${startDate}.csv`;
            a.click();
        } else {
            const json = exportToJSON(report);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compliance_${standard}_${startDate}.json`;
            a.click();
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Regulatory Compliance Reporting</h2>

            <form onSubmit={handleGenerate} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Regulatory Standard</label>
                        <select
                            value={standard}
                            onChange={(e) => setStandard(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                            <option value="CPCB">CPCB (India)</option>
                            <option value="EPA">EPA (USA)</option>
                            <option value="WHO">WHO Global</option>
                        </select>
                    </div>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

                <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isGenerating ? 'Analyzing Data...' : 'Generate Report'}
                </button>
            </form>

            {report && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Report Generated</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {report.id}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDownload('csv')}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                Download CSV
                            </button>
                            <button
                                onClick={() => handleDownload('json')}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Download JSON
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Exceedances</div>
                            <div className="text-2xl font-bold text-red-600">{report.totalExceedances}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Standard</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{report.standard}</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Exceedance Details</h4>
                        <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-400">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Pollutant</th>
                                    <th className="px-4 py-2">Recorded</th>
                                    <th className="px-4 py-2">Limit</th>
                                    <th className="px-4 py-2">Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.exceedances.length > 0 ? (
                                    report.exceedances.map((ex, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-2">{new Date(ex.timestamp).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 font-medium">{ex.pollutant}</td>
                                            <td className="px-4 py-2 text-red-600 font-bold">{ex.recordedValue}</td>
                                            <td className="px-4 py-2">{ex.threshold}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${ex.severity === 'SEVERE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {ex.severity}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No exceedances found in this period. Good job!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceReportGenerator;
