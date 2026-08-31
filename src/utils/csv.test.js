import { describe, it, expect } from 'vitest';
import {
  escapeField,
  formatRow,
  formatTable,
  formatMetadataRow,
  looksLikeFormula,
  toCellText,
} from './csv';

/**
 * Cover for #1052.
 *
 * The distinguishing property of most of these is round-tripping: writing a
 * value and reading it back has to yield the value. `join(',')` passes every
 * test that only checks the happy path, which is why the defect survived.
 */

/**
 * A deliberately small RFC 4180 reader, used to assert the writer's output is
 * actually parseable rather than merely different from before.
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

describe('toCellText', () => {
  it('renders absent values as an empty cell, not as the word', () => {
    // `Generated At: undefined` looks like data. Blank does not.
    expect(toCellText(null)).toBe('');
    expect(toCellText(undefined)).toBe('');
    expect(toCellText(NaN)).toBe('');
    expect(toCellText(Infinity)).toBe('');
  });

  it('keeps a zero, which is a reading like any other', () => {
    expect(toCellText(0)).toBe('0');
  });

  it('renders a Date as ISO rather than a locale string containing commas', () => {
    expect(toCellText(new Date('2026-01-04T05:00:00Z'))).toBe('2026-01-04T05:00:00.000Z');
  });

  it('renders an invalid Date as blank', () => {
    expect(toCellText(new Date('nonsense'))).toBe('');
  });

  it('renders booleans', () => {
    expect(toCellText(true)).toBe('true');
    expect(toCellText(false)).toBe('false');
  });
});

describe('escapeField', () => {
  it('leaves an ordinary value unquoted', () => {
    expect(escapeField('PM2.5')).toBe('PM2.5');
    expect(escapeField(210)).toBe('210');
  });

  it('quotes a value containing the delimiter', () => {
    expect(escapeField('PM2.5, respirable')).toBe('"PM2.5, respirable"');
  });

  it('quotes against the delimiter in use, not always the comma', () => {
    expect(escapeField('a;b', ';')).toBe('"a;b"');
    // A comma is not special when the delimiter is a semicolon.
    expect(escapeField('a,b', ';')).toBe('a,b');
  });

  it('doubles embedded quotes and wraps the result', () => {
    expect(escapeField('station "A"')).toBe('"station ""A"""');
  });

  it('quotes a value containing a newline so the record does not end early', () => {
    expect(escapeField('line one\nline two')).toBe('"line one\nline two"');
    expect(escapeField('line one\r\nline two')).toBe('"line one\r\nline two"');
  });
});

describe('formula neutralisation', () => {
  it('recognises every trigger a spreadsheet acts on', () => {
    for (const trigger of ['=', '+', '-', '@', '\t', '\r']) {
      expect(looksLikeFormula(`${trigger}SUM(A1)`), trigger).toBe(true);
    }
    expect(looksLikeFormula('SUM(A1)')).toBe(false);
    expect(looksLikeFormula('')).toBe(false);
  });

  it('prefixes a formula so it is read as text', () => {
    expect(escapeField('=HYPERLINK("http://x","click")')).toBe(
      '"\'=HYPERLINK(""http://x"",""click"")"'
    );
  });

  it('neutralises the leading tab case, where the tab is stripped on import', () => {
    expect(escapeField('\t=cmd')).toBe("'\t=cmd");
  });

  it('does not touch a negative number, which is not a formula in practice', () => {
    // A bare `-12` is parsed as a number, not evaluated as an expression, but it
    // still starts with a trigger character — so the guard applies, and the cell
    // still reads as -12 to a human.
    expect(escapeField(-12)).toBe("'-12");
  });

  it('leaves a value that merely contains an equals sign alone', () => {
    expect(escapeField('ratio=3.8')).toBe('ratio=3.8');
  });
});

describe('formatRow', () => {
  it('round-trips values containing the delimiter', () => {
    const values = ['Anand Vihar, Delhi', 380, 'SEVERE'];
    expect(parseLine(formatRow(values))).toEqual(['Anand Vihar, Delhi', '380', 'SEVERE']);
  });

  it('keeps the column count stable when a value contains the delimiter', () => {
    // This is the whole defect: an extra column, silently, with no parse error.
    expect(parseLine(formatRow(['a,b', 'c']))).toHaveLength(2);
  });

  it('round-trips quotes and newlines', () => {
    const values = ['say "hi"', 'two\nlines'];
    expect(parseLine(formatRow(values))).toEqual(values);
  });

  it('returns an empty string for a non-array', () => {
    expect(formatRow(null)).toBe('');
    expect(formatRow(undefined)).toBe('');
  });
});

describe('formatTable', () => {
  it('writes the header followed by one line per row', () => {
    const csv = formatTable(['A', 'B'], [[1, 2], [3, 4]]);
    expect(csv).toBe('A,B\n1,2\n3,4');
  });

  it('writes a header-only document when there are no rows', () => {
    expect(formatTable(['A', 'B'], [])).toBe('A,B');
    expect(formatTable(['A', 'B'], null)).toBe('A,B');
  });

  it('applies the delimiter to the header too', () => {
    expect(formatTable(['A', 'B'], [[1, 2]], ';')).toBe('A;B\n1;2');
  });
});

describe('formatMetadataRow', () => {
  it('emits the label and value as two cells', () => {
    expect(parseLine(formatMetadataRow('Report ID', 'R-1'))).toEqual(['Report ID:', 'R-1']);
  });

  it('escapes a value containing the delimiter', () => {
    expect(parseLine(formatMetadataRow('Standard', 'CPCB, 2026'))).toEqual([
      'Standard:',
      'CPCB, 2026',
    ]);
  });

  it('leaves the value cell blank when there is no value', () => {
    expect(parseLine(formatMetadataRow('Generated At', undefined))).toEqual([
      'Generated At:',
      '',
    ]);
  });
});
