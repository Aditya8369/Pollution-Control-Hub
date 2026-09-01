import { describe, it, expect } from 'vitest';
import {
  validateQuantity,
  formatUsd,
  lineTotal,
  certificationLabel,
  MAX_TONS_PER_PURCHASE,
} from './offsetQuantity';

describe('validateQuantity', () => {
  const STOCK = 500;

  it('accepts a whole number within stock', () => {
    expect(validateQuantity('12', STOCK)).toEqual({ valid: true, tons: 12, error: null });
  });

  it('accepts the exact remaining stock', () => {
    expect(validateQuantity('500', STOCK).valid).toBe(true);
  });

  it('rejects an empty field rather than reading it as zero', () => {
    // `Number('')` is 0, so clearing the field used to be indistinguishable from
    // deliberately asking for nothing — and was priced at $0.00 with Confirm enabled.
    const result = validateQuantity('', STOCK);
    expect(result.valid).toBe(false);
    expect(result.tons).toBeNull();
    expect(result.error).toMatch(/enter how many tons/i);
  });

  it('rejects whitespace', () => {
    expect(validateQuantity('   ', STOCK).valid).toBe(false);
  });

  it('rejects a partially typed number', () => {
    // A bare '-' or '1e' is what a number input holds mid-keystroke; Number() makes
    // both NaN, which used to reach the price line as `$NaN`.
    expect(validateQuantity('-', STOCK).error).toMatch(/enter a number/i);
    expect(validateQuantity('1e', STOCK).error).toMatch(/enter a number/i);
    expect(validateQuantity('abc', STOCK).error).toMatch(/enter a number/i);
  });

  it('rejects zero and negative quantities', () => {
    expect(validateQuantity('0', STOCK).error).toMatch(/at least 1 ton/i);
    expect(validateQuantity('-5', STOCK).error).toMatch(/at least 1 ton/i);
  });

  it('rejects a fractional ton', () => {
    // Rounding silently would change what the user is charged.
    expect(validateQuantity('0.5', STOCK).error).toMatch(/whole tons/i);
    expect(validateQuantity('2.5', STOCK).error).toMatch(/whole tons/i);
  });

  it('rejects more than the project has available', () => {
    const result = validateQuantity('501', STOCK);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only 500 tons are available from this project.');
  });

  it('gets the singular right for a project with one ton left', () => {
    expect(validateQuantity('2', 1).error).toBe('Only 1 ton is available from this project.');
  });

  it('caps a single purchase even when stock is unknown', () => {
    const result = validateQuantity(String(MAX_TONS_PER_PURCHASE + 1), undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/single purchase is limited/i);
  });

  it('allows any whole quantity under the cap when stock is unknown', () => {
    expect(validateQuantity('900', null).valid).toBe(true);
    expect(validateQuantity('900', undefined).valid).toBe(true);
  });

  it('rejects Infinity', () => {
    expect(validateQuantity('Infinity', STOCK).valid).toBe(false);
  });

  it('accepts a number as well as a string', () => {
    expect(validateQuantity(7, STOCK)).toEqual({ valid: true, tons: 7, error: null });
    expect(validateQuantity(0, STOCK).valid).toBe(false);
  });

  it('never returns a usable tons value alongside an error', () => {
    for (const input of ['', '-', '0', '-5', '0.5', '99999999', 'abc']) {
      const result = validateQuantity(input, STOCK);
      expect(result.valid).toBe(false);
      expect(result.tons).toBeNull();
      expect(result.error).toBeTruthy();
    }
  });
});

describe('formatUsd', () => {
  it('formats a normal amount', () => {
    expect(formatUsd(180)).toBe('$180.00');
    expect(formatUsd(7.5)).toBe('$7.50');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('never renders NaN', () => {
    expect(formatUsd(NaN)).toBe('—');
    expect(formatUsd(undefined)).toBe('—');
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd('not a price')).toBe('—');
  });

  it('never renders a negative charge', () => {
    expect(formatUsd(-75)).toBe('—');
  });

  it('never renders Infinity', () => {
    expect(formatUsd(Infinity)).toBe('—');
  });
});

describe('lineTotal', () => {
  it('multiplies tons by the unit price', () => {
    expect(lineTotal(4, 15)).toBe(60);
  });

  it('refuses to price a missing or non-numeric unit price', () => {
    expect(lineTotal(4, undefined)).toBeNull();
    expect(lineTotal(4, null)).toBeNull();
    expect(lineTotal(4, 'free')).toBeNull();
  });

  it('accepts a numeric string price, as DECIMAL columns arrive over JSON', () => {
    expect(lineTotal(4, '15.00')).toBe(60);
  });

  it('refuses to price an invalid quantity', () => {
    expect(lineTotal(null, 15)).toBeNull();
    expect(lineTotal(0, 15)).toBeNull();
    expect(lineTotal(-4, 15)).toBeNull();
    expect(lineTotal(NaN, 15)).toBeNull();
  });

  it('refuses a negative unit price', () => {
    expect(lineTotal(4, -15)).toBeNull();
  });
});

describe('certificationLabel', () => {
  it('replaces every underscore, not just the first', () => {
    // `.replace('_', ' ')` only replaced one, so 'GOLD_STANDARD_VER' read
    // 'GOLD STANDARD_VER'.
    expect(certificationLabel('GOLD_STANDARD_VER')).toBe('GOLD STANDARD VER');
    expect(certificationLabel('VERRA')).toBe('VERRA');
  });

  it('returns null for a project with no certification', () => {
    expect(certificationLabel(undefined)).toBeNull();
    expect(certificationLabel(null)).toBeNull();
    expect(certificationLabel('')).toBeNull();
    expect(certificationLabel('   ')).toBeNull();
    expect(certificationLabel(42)).toBeNull();
  });
});
