import { describe, it, expect } from 'vitest';
import { isStale, purgeStaleRecords, PURGE_MAX_AGE_DAYS } from './dataPurge';

const NOW = Date.parse('2026-08-22T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('isStale', () => {
    it('keeps a record exactly at the 90-day boundary', () => {
        const at = new Date(NOW - PURGE_MAX_AGE_DAYS * DAY_MS).toISOString();
        expect(isStale(at, NOW)).toBe(false);
    });

    it('purges a record one millisecond past the boundary', () => {
        const at = new Date(NOW - PURGE_MAX_AGE_DAYS * DAY_MS - 1).toISOString();
        expect(isStale(at, NOW)).toBe(true);
    });

    it('keeps a record one day under the boundary', () => {
        const at = new Date(NOW - (PURGE_MAX_AGE_DAYS - 1) * DAY_MS).toISOString();
        expect(isStale(at, NOW)).toBe(false);
    });

    it('purges a record one day past the boundary', () => {
        const at = new Date(NOW - (PURGE_MAX_AGE_DAYS + 1) * DAY_MS).toISOString();
        expect(isStale(at, NOW)).toBe(true);
    });

    it('keeps a record with an unparseable timestamp rather than guessing', () => {
        expect(isStale('not-a-date', NOW)).toBe(false);
        expect(isStale(undefined, NOW)).toBe(false);
        expect(isStale(null, NOW)).toBe(false);
    });

    it('respects a custom retention window', () => {
        const at = new Date(NOW - 10 * DAY_MS).toISOString();
        expect(isStale(at, NOW, 7)).toBe(true);
        expect(isStale(at, NOW, 14)).toBe(false);
    });
});

describe('purgeStaleRecords', () => {
    it('splits records at the boundary and reports the removed count', () => {
        const records = [
            { id: 'fresh', at: new Date(NOW - 10 * DAY_MS).toISOString() },
            { id: 'boundary', at: new Date(NOW - PURGE_MAX_AGE_DAYS * DAY_MS).toISOString() },
            { id: 'stale', at: new Date(NOW - (PURGE_MAX_AGE_DAYS + 5) * DAY_MS).toISOString() },
        ];

        const { kept, removedCount } = purgeStaleRecords(records, (r) => r.at, NOW);

        expect(kept.map((r) => r.id)).toEqual(['fresh', 'boundary']);
        expect(removedCount).toBe(1);
    });

    it('returns an empty result for non-array input', () => {
        expect(purgeStaleRecords(null, (r) => r.at, NOW)).toEqual({ kept: [], removedCount: 0 });
    });
});