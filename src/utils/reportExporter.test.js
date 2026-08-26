import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToJSON } from './reportExporter';

/**
 * Cover for #1052, at the level a reviewer of the compliance export cares about:
 * the file that reaches a regulator has the values under the right headings.
 */

const REPORT = {
  id: 'R-2026-014',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  standard: 'CPCB',
  totalExceedances: 2,
  generatedAt: '2026-02-01T00:00:00Z',
  exceedances: [
    {
      timestamp: '2026-01-04T05:00:00Z',
      pollutant: 'PM2.5, respirable',
      recordedValue: 210,
      threshold: 60,
      standard: 'CPCB',
      severity: 'SEVERE',
    },
    {
      timestamp: '2026-01-11T09:00:00Z',
      pollutant: 'NO2',
      recordedValue: 0,
      threshold: 80,
      standard: 'CPCB',
      severity: 'MODERATE',
    },
  ],
};

/** @param {string} csv */
function tableOf(csv) {
  const lines = csv.split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('Timestamp'));
  return lines.slice(headerIndex);
}

/**
 * A small RFC 4180 reader. Splitting on the delimiter is exactly the bug under
 * test, so the assertions cannot use it -- a correctly quoted row would still
 * split inside its quotes and look broken.
 *
 * @param {string} line
 * @param {string} [delimiter]
 * @returns {string[]}
 */
function parseLine(line, delimiter = ',') {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') { inQuotes = true; continue; }
    if (char === delimiter) { fields.push(field); field = ''; continue; }
    field += char;
  }
  fields.push(field);
  return fields;
}

describe('exportToCSV (#1052)', () => {
  it('keeps every data row at the header width', () => {
    const rows = tableOf(exportToCSV(REPORT));
    const width = parseLine(rows[0]).length;
    expect(width).toBe(6);

    // Row one carries `PM2.5, respirable`. Unescaped, it produced seven fields
    // under six headings and everything after Pollutant read one column left.
    for (const row of rows.slice(1)) {
      expect(parseLine(row).length, row).toBe(width);
    }

    expect(parseLine(rows[1])[1]).toBe('PM2.5, respirable');
    expect(parseLine(rows[1])[5]).toBe('SEVERE');
  });

  it('quotes the value containing the delimiter rather than splitting on it', () => {
    expect(exportToCSV(REPORT)).toContain('"PM2.5, respirable"');
  });

  it('writes a genuine zero rather than dropping it', () => {
    const rows = tableOf(exportToCSV(REPORT));
    // A recorded NO2 of 0 is a measurement, not a missing value.
    expect(parseLine(rows[2])[2]).toBe('0');
  });

  it('neutralises a value that would run as a formula', () => {
    const csv = exportToCSV({
      ...REPORT,
      exceedances: [{ ...REPORT.exceedances[0], severity: '=HYPERLINK("http://x","c")' }],
    });

    expect(csv).not.toMatch(/,=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });

  it('escapes the preamble as well as the table', () => {
    const csv = exportToCSV({ ...REPORT, standard: 'CPCB, 2026 revision' });
    expect(csv).toContain('"CPCB, 2026 revision"');
  });

  it('exports a header-only table when the report has no exceedances', () => {
    const csv = exportToCSV({ ...REPORT, exceedances: [] });
    expect(tableOf(csv)).toEqual(['Timestamp,Pollutant,Recorded Value,Threshold,Standard,Severity']);
  });

  it('does not throw when the report has no exceedances array at all', () => {
    // Previously a TypeError, surfaced to the user as a dead Download button.
    const withoutExceedances = { ...REPORT };
    delete withoutExceedances.exceedances;
    expect(() => exportToCSV(withoutExceedances)).not.toThrow();
    expect(exportToCSV(withoutExceedances)).toContain('Timestamp,Pollutant');
  });

  it('does not throw on an empty report object', () => {
    expect(() => exportToCSV({})).not.toThrow();
    expect(() => exportToCSV(undefined)).not.toThrow();
  });

  it('leaves a missing field blank rather than writing the word undefined', () => {
    const csv = exportToCSV({ ...REPORT, generatedAt: undefined });
    expect(csv).not.toContain('undefined');
    expect(csv).toContain('Generated At:,');
  });

  it('counts the exceedances it actually wrote', () => {
    // `totalExceedances` says 99; two rows are written. The header must not
    // contradict the table underneath it.
    const csv = exportToCSV({ ...REPORT, totalExceedances: 99 });
    expect(csv).toContain('Total Exceedances:,2');
  });

  it('honours a caller-supplied delimiter throughout', () => {
    const csv = exportToCSV(REPORT, ';');
    expect(csv).toContain('Timestamp;Pollutant');
    // The comma inside the pollutant name is no longer special here.
    expect(csv).toContain('PM2.5, respirable');
  });
});

describe('exportToJSON', () => {
  it('pretty-prints the report', () => {
    expect(exportToJSON(REPORT)).toBe(JSON.stringify(REPORT, null, 2));
  });

  it('emits null rather than undefined for a missing report', () => {
    // `JSON.stringify(undefined)` returns undefined, not a string, which then
    // reaches `new Blob([undefined])` as the text "undefined".
    expect(exportToJSON(undefined)).toBe('null');
  });
});
