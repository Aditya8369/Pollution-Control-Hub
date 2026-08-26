/**
 * @fileoverview Formats aggregated compliance data into downloadable, regulation-ready structures.
 */

import { formatMetadataRow, formatRow, formatTable } from './csv';

/** The exceedance table's columns, in order. */
const EXCEEDANCE_HEADERS = [
  'Timestamp',
  'Pollutant',
  'Recorded Value',
  'Threshold',
  'Standard',
  'Severity',
];

/**
 * The exceedances on a report, or an empty list.
 *
 * `report.exceedances.map(...)` threw a TypeError when the API returned a report
 * without the key -- surfaced to the user as a Download button that does
 * nothing. A report with no exceedances and a report missing the field are both
 * "no rows to write"; neither is a reason to fail the export.
 *
 * @param {any} report
 * @returns {any[]}
 */
function exceedancesOf(report) {
  return Array.isArray(report?.exceedances) ? report.exceedances : [];
}

/**
 * Converts compliance report data to CSV.
 *
 * Every value goes through the shared writer in `./csv`, so a delimiter, quote
 * or newline inside a pollutant name or a severity note no longer shifts the
 * remaining columns, and a value beginning `=` is not executed when the file is
 * opened. See #1052.
 *
 * @param {any} report - The compliance report object.
 * @param {string} [delimiter] - Field separator. Defaults to a comma.
 * @returns {string} CSV formatted string.
 */
export const exportToCSV = (report, delimiter = ',') => {
  const exceedances = exceedancesOf(report);

  const rows = exceedances.map((ex) => [
    ex?.timestamp,
    ex?.pollutant,
    ex?.recordedValue,
    ex?.threshold,
    ex?.standard,
    ex?.severity,
  ]);

  const preamble = [
    formatMetadataRow('Report ID', report?.id, delimiter),
    formatMetadataRow('Period', periodOf(report), delimiter),
    formatMetadataRow('Standard', report?.standard, delimiter),
    // Counted from the rows actually written rather than read from
    // `totalExceedances`, so the header cannot disagree with the table under it.
    formatMetadataRow('Total Exceedances', exceedances.length, delimiter),
    formatMetadataRow('Generated At', report?.generatedAt, delimiter),
    formatRow([], delimiter),
  ];

  return [...preamble, formatTable(EXCEEDANCE_HEADERS, rows, delimiter)].join('\n');
};

/**
 * The reporting period as one value.
 *
 * Left blank rather than rendered as "undefined to undefined" when the report
 * carries no dates.
 *
 * @param {any} report
 * @returns {string}
 */
function periodOf(report) {
  const start = report?.startDate;
  const end = report?.endDate;
  if (!start && !end) return '';
  return `${start ?? '?'} to ${end ?? '?'}`;
}

/**
 * Converts compliance report data to a formatted JSON structure.
 *
 * @param {any} report - The compliance report object.
 * @returns {string} JSON formatted string.
 */
export const exportToJSON = (report) => {
  return JSON.stringify(report ?? null, null, 2);
};
