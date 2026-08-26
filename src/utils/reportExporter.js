/**
 * @fileoverview Utility functions to format aggregated data into downloadable, regulation-ready structures.
 */

/**
 * Converts compliance report data to CSV format.
 * @param {Object} report - The compliance report object.
 * @returns {string} CSV formatted string.
 */
export const exportToCSV = (report) => {
    const headers = ['Timestamp', 'Pollutant', 'Recorded Value', 'Threshold', 'Standard', 'Severity'];
    const rows = report.exceedances.map(ex => [
        ex.timestamp,
        ex.pollutant,
        ex.recordedValue,
        ex.threshold,
        ex.standard,
        ex.severity
    ]);

    const csvContent = [
        `Report ID: ${report.id}`,
        `Period: ${report.startDate} to ${report.endDate}`,
        `Standard: ${report.standard}`,
        `Total Exceedances: ${report.totalExceedances}`,
        `Generated At: ${report.generatedAt}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
};

/**
 * Converts compliance report data to a formatted JSON structure.
 * @param {Object} report - The compliance report object.
 * @returns {string} JSON formatted string.
 */
export const exportToJSON = (report) => {
    return JSON.stringify(report, null, 2);
};
