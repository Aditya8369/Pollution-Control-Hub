import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateComplianceReport, normaliseReport } from '../services/complianceEngine';
import { exportToCSV, exportToJSON } from '../utils/reportExporter';
import { downloadFile, safeFilenamePart } from '../utils/downloadFile';

/**
 * Why the range needs checking beyond "both boxes are filled".
 *
 * The form only ever asserted presence, so an end date before the start date was submitted
 * happily and the server was asked for a negative period.
 *
 * @param {string} startDate - `yyyy-mm-dd` from the date input.
 * @param {string} endDate - `yyyy-mm-dd` from the date input.
 * @returns {string|null} The problem with the range, or null when it is usable.
 */
export function describeRangeProblem(startDate, endDate) {
    if (!startDate || !endDate) return 'Please select both start and end dates.';

    const start = Date.parse(startDate);
    const end = Date.parse(endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) {
        return 'Please select both start and end dates.';
    }
    if (end < start) {
        return 'The end date must not be before the start date.';
    }
    return null;
}

/**
 * The download's filename.
 *
 * The old name carried only the start date, so two reports for different periods that
 * happen to share a start date overwrote each other in the downloads folder. Every part is
 * run through `safeFilenamePart` because all three come from form input.
 *
 * @param {string} standard
 * @param {string} startDate
 * @param {string} endDate
 * @param {'csv'|'json'} extension
 * @returns {string}
 */
export function reportFilename(standard, startDate, endDate, extension) {
    return [
        'compliance',
        safeFilenamePart(standard, 'standard'),
        safeFilenamePart(startDate, 'start'),
        safeFilenamePart(endDate, 'end'),
    ].join('_') + `.${extension}`;
}

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

    // An in-flight report can outlive the panel, and a second Generate should not race
    // the first one's response into state.
    const requestRef = useRef(null);
    useEffect(() => () => requestRef.current?.abort(), []);

    // `exceedances` is optional over the wire: a compliant period is reasonably reported
    // as `{ totalExceedances: 0 }` with no list at all. Both the table below and the CSV
    // exporter read it directly, which made the outcome this feature exists to report --
    // nothing breached -- the one that crashed the panel.
    const safeReport = useMemo(() => normaliseReport(report), [report]);

    const handleGenerate = async (e) => {
        e.preventDefault();

        const problem = describeRangeProblem(startDate, endDate);
        if (problem) {
            setError(problem);
            return;
        }

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        setIsGenerating(true);
        setError(null);
        try {
            const data = await generateComplianceReport(startDate, endDate, standard, controller.signal);
            if (controller.signal.aborted) return;
            setReport(data);
        } catch (err) {
            if (controller.signal.aborted || err?.name === 'AbortError') return;
            setError(err.message || 'Failed to generate report. Check permissions.');
        } finally {
            if (!controller.signal.aborted) setIsGenerating(false);
        }
    };

    const handleDownload = (format) => {
        if (!safeReport) return;

        const isCsv = format === 'csv';
        const content = isCsv ? exportToCSV(safeReport) : exportToJSON(safeReport);
        const mimeType = isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';

        // Goes through the shared helper, which attaches the anchor before clicking it and
        // revokes the object URL afterwards. Neither branch used to revoke, so every
        // download pinned its blob in memory until the tab was closed.
        downloadFile(content, mimeType, reportFilename(standard, startDate, endDate, format));
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Regulatory Compliance Reporting</h2>

            {/* noValidate: the native bubble is not reliably announced and disappears on
                the next interaction. describeRangeProblem produces the same message for
                every failure, into a role="alert" that a screen reader will read out. The
                `required` attributes stay for the aria-required they imply. */}
            <form noValidate onSubmit={handleGenerate} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label htmlFor="compliance-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input
                            id="compliance-start-date"
                            type="date"
                            aria-invalid={error ? true : undefined}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="compliance-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <input
                            id="compliance-end-date"
                            type="date"
                            aria-invalid={error ? true : undefined}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="compliance-standard" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Regulatory Standard</label>
                        <select
                            id="compliance-standard"
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

                {error && (
                    <div role="alert" className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isGenerating ? 'Analyzing Data...' : 'Generate Report'}
                </button>
            </form>

            {safeReport && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Report Generated</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {safeReport.id}</p>
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

                    {/* The grid declares four columns and only ever had two tiles in it.
                        The period and the generation time were already on the report and
                        nowhere on screen, which is what the empty half was for. */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Exceedances</div>
                            <div className="text-2xl font-bold text-red-600">{safeReport.totalExceedances}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Standard</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{safeReport.standard}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Period</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {safeReport.startDate} to {safeReport.endDate}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Generated</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {safeReport.generatedAt ? new Date(safeReport.generatedAt).toLocaleString() : '—'}
                            </div>
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
                                {safeReport.exceedances.length > 0 ? (
                                    safeReport.exceedances.map((ex, idx) => (
                                        <tr key={ex.id ?? `${ex.timestamp}-${ex.pollutant}-${idx}`} className="border-b dark:border-gray-700">
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
