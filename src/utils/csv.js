/**
 * @fileoverview Secure, RFC 4180 compliant CSV serialization utility
 * with formula injection (CSV injection) protection.
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes and escapes a single CSV cell value according to RFC 4180
 * and spreadsheet formula injection prevention rules.
 *
 * @param {any} value - The raw cell value.
 * @param {string} [delimiter=','] - The delimiter character (e.g. ',' or ';').
 * @returns {string} The escaped CSV cell string.
 */
export function escapeCSVCell(value, delimiter = ',') {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '';
    return String(value);
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  let str = String(value);

  // Neutralize formula injection if the string begins with =, +, -, @, \t, or \r
  if (str.length > 0 && FORMULA_PREFIXES.includes(str[0])) {
    str = `'${str}`;
  }

  // Quote if it contains delimiter, double quote, CR, or LF
  const needsQuotes =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats an array of cell values into a single CSV row string.
 *
 * @param {Array<any>} row - Array of cell values.
 * @param {string} [delimiter=','] - The delimiter character.
 * @returns {string} The formatted CSV row string.
 */
export function formatCSVRow(row, delimiter = ',') {
  if (!Array.isArray(row)) return '';
  return row.map((cell) => escapeCSVCell(cell, delimiter)).join(delimiter);
}

/**
 * Formats a 2D array of rows into a complete CSV string.
 *
 * @param {Array<Array<any>>} rows - 2D array of row data.
 * @param {string} [delimiter=','] - The delimiter character.
 * @returns {string} The formatted CSV content string.
 */
export function formatCSV(rows, delimiter = ',') {
  if (!Array.isArray(rows)) return '';
  return rows.map((row) => formatCSVRow(row, delimiter)).join('\n');
}
