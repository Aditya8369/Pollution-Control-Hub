/**
 * @fileoverview Utility functions to format aggregated data into downloadable, regulation-ready structures.
 */

import { formatCSV } from './csv';

/**
 * Converts compliance report data to CSV format.
 * @param {Object} report - The compliance report object.
 * @returns {string} CSV formatted string.
 */
export const exportToCSV = (report) => {
    const safeReport = report || {};
    const headers = ['Timestamp', 'Pollutant', 'Recorded Value', 'Threshold', 'Standard', 'Severity'];
    const exceedances = Array.isArray(safeReport.exceedances) ? safeReport.exceedances : [];

    const rows = exceedances.map((ex) => [
        ex?.timestamp,
        ex?.pollutant,
        ex?.recordedValue,
        ex?.threshold,
        ex?.standard,
        ex?.severity,
    ]);

    const metadataRows = [
        `Report ID: ${safeReport.id ?? ''}`,
        `Period: ${safeReport.startDate ?? ''} to ${safeReport.endDate ?? ''}`,
        `Standard: ${safeReport.standard ?? ''}`,
        `Total Exceedances: ${safeReport.totalExceedances ?? ''}`,
        `Generated At: ${safeReport.generatedAt ?? ''}`,
        '',
    ];

    const dataCsv = formatCSV([headers, ...rows], ',');
    return [...metadataRows, dataCsv].join('\n');
};

/**
 * Converts compliance report data to a formatted JSON structure.
 * @param {Object} report - The compliance report object.
 * @returns {string} JSON formatted string.
 */
export const exportToJSON = (report) => {
    return JSON.stringify(report, null, 2);
};
