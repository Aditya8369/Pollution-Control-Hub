import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToJSON } from './reportExporter';

describe('reportExporter', () => {
  it('correctly escapes commas, quotes, and formulas in compliance CSV exports', () => {
    const report = {
      id: 'R-1',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      standard: 'CPCB',
      totalExceedances: 1,
      generatedAt: '2026-02-01T00:00:00Z',
      exceedances: [
        {
          timestamp: '2026-01-04T05:00:00Z',
          pollutant: 'PM2.5, respirable',
          recordedValue: 210,
          threshold: 60,
          standard: 'CPCB',
          severity: '=HYPERLINK("http://example.com","click")',
        },
      ],
    };

    const csv = exportToCSV(report);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Report ID: R-1');
    expect(lines[1]).toBe('Period: 2026-01-01 to 2026-01-31');
    expect(lines[2]).toBe('Standard: CPCB');
    expect(lines[3]).toBe('Total Exceedances: 1');
    expect(lines[4]).toBe('Generated At: 2026-02-01T00:00:00Z');
    expect(lines[5]).toBe('');
    expect(lines[6]).toBe('Timestamp,Pollutant,Recorded Value,Threshold,Standard,Severity');
    expect(lines[7]).toBe('2026-01-04T05:00:00Z,"PM2.5, respirable",210,60,CPCB,"\'=HYPERLINK(""http://example.com"",""click"")"');
  });

  it('exports a header-only table without throwing when exceedances is absent or empty', () => {
    const reportWithoutExceedances = {
      id: 'R-EMPTY',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      standard: 'CPCB',
      totalExceedances: 0,
      generatedAt: '2026-02-01T00:00:00Z',
    };

    const csv = exportToCSV(reportWithoutExceedances);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Report ID: R-EMPTY');
    expect(lines[6]).toBe('Timestamp,Pollutant,Recorded Value,Threshold,Standard,Severity');
    expect(lines[7]).toBeUndefined();
  });

  it('does not write "undefined" literals when report metadata properties are missing', () => {
    const csv = exportToCSV({});
    expect(csv).not.toContain('undefined');
    expect(csv).toContain('Report ID: ');
    expect(csv).toContain('Period:  to ');
    expect(csv).toContain('Timestamp,Pollutant,Recorded Value,Threshold,Standard,Severity');
  });

  it('serializes compliance reports to formatted JSON with exportToJSON', () => {
    const report = { id: 'R-1', standard: 'CPCB' };
    const json = exportToJSON(report);
    expect(JSON.parse(json)).toEqual(report);
  });
});
