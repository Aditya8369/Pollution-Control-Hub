/**
 * RFC 4180 CSV writing.
 *
 * Both exporters in this codebase used to build a row by joining values straight
 * onto the delimiter:
 *
 *   rows.map(row => row.join(','))
 *
 * which is correct only while no value contains the delimiter, a quote or a
 * newline. A pollutant labelled `PM2.5, respirable`, or a station named
 * `Anand Vihar, Delhi`, produces one extra column on that row and nothing else --
 * no parse error, the row simply reads as different data under the wrong
 * headings. On the compliance export that is a document going to a regulator.
 *
 * Two separate concerns live here, and they are not the same thing:
 *
 *   1. *Quoting* makes the file valid CSV, so a parser reads back the values
 *      that were written.
 *   2. *Formula neutralisation* stops a spreadsheet executing a value as code
 *      when a human opens the file. A cell whose text starts with `=`, `+`, `-`,
 *      `@`, tab or CR is evaluated by Excel, LibreOffice and Google Sheets alike.
 *      Quoting does not prevent this -- the quotes are consumed by the parser
 *      before the cell text is examined.
 */

/** The delimiter used when a caller does not choose one. */
export const DEFAULT_DELIMITER = ',';

/**
 * Characters that make a spreadsheet treat the rest of the cell as a formula.
 *
 * Tab and CR are in here because a leading one is stripped during import, which
 * exposes whatever follows -- so `\t=cmd` is `=cmd` by the time it is evaluated.
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Whether a rendered value would be read as a formula.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeFormula(text) {
  return typeof text === 'string' && text.length > 0 && FORMULA_TRIGGERS.includes(text[0]);
}

/**
 * A value as cell text.
 *
 * `null`, `undefined` and `NaN` are all "no value here" and become an empty
 * cell. They were previously template-interpolated, so a report missing
 * `generatedAt` exported the literal string `undefined` -- which is worse than
 * blank, because it looks like data.
 *
 * A `Date` is written as an ISO string rather than via `toString()`, whose output
 * is locale- and timezone-dependent and contains commas.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function toCellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/**
 * One field, quoted and escaped for `delimiter`.
 *
 * Quoting is applied only when it is needed, so an ordinary file still reads as
 * an ordinary file in a text editor.
 *
 * Formula triggers are neutralised by prefixing a single quote -- the convention
 * every major spreadsheet reads as "the rest of this cell is text". A human sees
 * the original value; the application does not run it. Deleting the character or
 * inserting a space would change what the value says, which is not acceptable in
 * an export that is meant to be a record.
 *
 * @param {unknown} value
 * @param {string} [delimiter]
 * @returns {string}
 */
export function escapeField(value, delimiter = DEFAULT_DELIMITER) {
  let text = toCellText(value);

  if (looksLikeFormula(text)) {
    text = `'${text}`;
  }

  const needsQuoting =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r');

  if (!needsQuoting) return text;

  // A literal quote is written as two quotes, per RFC 4180 section 2.7.
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * A row of values as one CSV line.
 *
 * @param {unknown[]} values
 * @param {string} [delimiter]
 * @returns {string}
 */
export function formatRow(values, delimiter = DEFAULT_DELIMITER) {
  if (!Array.isArray(values)) return '';
  return values.map((value) => escapeField(value, delimiter)).join(delimiter);
}

/**
 * A header row and its data rows as a CSV document.
 *
 * Lines are joined with `\n`. RFC 4180 specifies CRLF, but every consumer in
 * practice accepts LF, and a lone LF is what the rest of this codebase writes.
 *
 * @param {unknown[]} headers
 * @param {unknown[][]} rows
 * @param {string} [delimiter]
 * @returns {string}
 */
export function formatTable(headers, rows, delimiter = DEFAULT_DELIMITER) {
  const lines = [formatRow(headers, delimiter)];
  for (const row of Array.isArray(rows) ? rows : []) {
    lines.push(formatRow(row, delimiter));
  }
  return lines.join('\n');
}

/**
 * A `Label: value` preamble line, with the value escaped.
 *
 * The compliance export opens with a block of these above the table. They were
 * built by template interpolation, so a value containing the delimiter or a
 * newline broke the preamble in the same way an unescaped field breaks a row.
 *
 * The label is emitted as its own field so the pair survives as two cells rather
 * than one string a reader has to split by eye.
 *
 * @param {string} label
 * @param {unknown} value
 * @param {string} [delimiter]
 * @returns {string}
 */
export function formatMetadataRow(label, value, delimiter = DEFAULT_DELIMITER) {
  return formatRow([`${label}:`, value], delimiter);
}
