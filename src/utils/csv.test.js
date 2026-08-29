import { describe, it, expect } from 'vitest';
import { escapeCSVCell, formatCSVRow, formatCSV } from './csv';

describe('escapeCSVCell', () => {
  it('converts null, undefined, and NaN to empty string', () => {
    expect(escapeCSVCell(null)).toBe('');
    expect(escapeCSVCell(undefined)).toBe('');
    expect(escapeCSVCell(NaN)).toBe('');
  });

  it('preserves plain strings and numbers', () => {
    expect(escapeCSVCell('Delhi')).toBe('Delhi');
    expect(escapeCSVCell(123)).toBe('123');
    expect(escapeCSVCell(0)).toBe('0');
    expect(escapeCSVCell(45.67)).toBe('45.67');
    expect(escapeCSVCell(-15)).toBe('-15');
    expect(escapeCSVCell(true)).toBe('true');
    expect(escapeCSVCell(false)).toBe('false');
  });

  it('quotes cells containing commas, quotes, and newlines (RFC 4180)', () => {
    expect(escapeCSVCell('PM2.5, respirable')).toBe('"PM2.5, respirable"');
    expect(escapeCSVCell('Anand Vihar, Delhi')).toBe('"Anand Vihar, Delhi"');
    expect(escapeCSVCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    expect(escapeCSVCell('Line1\r\nLine2')).toBe('"Line1\r\nLine2"');
    expect(escapeCSVCell('Quote "inside"')).toBe('"Quote ""inside"""');
  });

  it('neutralizes spreadsheet formula injection (=, +, -, @, \\t, \\r)', () => {
    expect(escapeCSVCell('=HYPERLINK("http://example.com","click")')).toBe(
      '"\'=HYPERLINK(""http://example.com"",""click"")"'
    );
    expect(escapeCSVCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(escapeCSVCell('+12345')).toBe("'+12345");
    expect(escapeCSVCell('-cmd|/C calc')).toBe("'-cmd|/C calc");
    expect(escapeCSVCell('@cmd')).toBe("'@cmd");
    expect(escapeCSVCell('\tmalicious')).toBe("'\tmalicious");
    expect(escapeCSVCell('\r\nmalicious')).toBe('"\'\r\nmalicious"');
  });

  it('handles custom delimiters (such as semicolon)', () => {
    expect(escapeCSVCell('A;B', ';')).toBe('"A;B"');
    expect(escapeCSVCell('A,B', ';')).toBe('A,B');
  });
});

describe('formatCSVRow', () => {
  it('formats an array of cell values into a single delimited row', () => {
    const row = ['2026-01-04T05:00:00Z', 'PM2.5, respirable', 210, 60, 'CPCB', '=HYPERLINK("http://example.com")'];
    const result = formatCSVRow(row, ',');
    expect(result).toBe('2026-01-04T05:00:00Z,"PM2.5, respirable",210,60,CPCB,"\'=HYPERLINK(""http://example.com"")"');
  });

  it('returns empty string for non-array input', () => {
    expect(formatCSVRow(null)).toBe('');
  });
});

describe('formatCSV', () => {
  it('formats 2D array into multiline CSV', () => {
    const rows = [
      ['Date', 'Value'],
      ['2026-01-01', 100],
      ['2026-01-02', 150],
    ];
    expect(formatCSV(rows)).toBe('Date,Value\n2026-01-01,100\n2026-01-02,150');
  });

  it('returns empty string for non-array input', () => {
    expect(formatCSV(null)).toBe('');
  });
});
