import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFakeIndexedDB } from './fakeIndexedDB';
import {
    openDB,
    resetConnection,
    nextVersionNumber,
    saveCalibrationVersion,
    getCalibrationVersion,
    getCalibrationHistory,
} from '../services/calibrationVersionService';

/**
 * #898. The service opened a fresh IndexedDB connection on every call and never closed
 * one. It also had no `onblocked` handler, and `indexedDB.open()` fires `blocked` — not
 * `error`, not `success` — while another connection holds an older version open. With no
 * handler the promise never settled, so `loadHistory()`'s `finally` never ran and the
 * panel sat on its spinner forever with nothing to retry.
 *
 * jsdom ships no IndexedDB and `fake-indexeddb` is not a dependency here, so these run
 * against a small double in `./fakeIndexedDB.js` that reproduces the two behaviours that
 * matter: `blocked` on an upgrade, and `getAll(undefined)` returning everything.
 */

const originalIndexedDB = globalThis.indexedDB;

/** Installs a fresh database and returns its handles. */
function install(options) {
    const fake = createFakeIndexedDB(options);
    vi.stubGlobal('indexedDB', fake.factory);
    resetConnection();
    return fake;
}

beforeEach(() => {
    resetConnection();
});

afterEach(() => {
    resetConnection();
    vi.unstubAllGlobals();
    if (originalIndexedDB === undefined) {
        delete globalThis.indexedDB;
    } else {
        globalThis.indexedDB = originalIndexedDB;
    }
});

describe('nextVersionNumber', () => {
    it('starts at 1 for a sensor with no history', () => {
        expect(nextVersionNumber([])).toBe(1);
        expect(nextVersionNumber(undefined)).toBe(1);
    });

    it('takes the highest existing version, not the count', () => {
        expect(nextVersionNumber([{ version: 1 }, { version: 7 }, { version: 3 }])).toBe(8);
    });

    it('coerces a version stored as a string by an older build', () => {
        // Math.max(1, "2") is 2 but Math.max("10", 9) is 10 — inconsistent enough to
        // skip a version silently.
        expect(nextVersionNumber([{ version: '10' }, { version: 9 }])).toBe(11);
    });

    it('ignores a record with no usable version', () => {
        expect(nextVersionNumber([{ version: null }, {}, { version: 'x' }, { version: 4 }])).toBe(5);
    });
});

describe('openDB - connection handling', () => {
    it('opens once and shares the connection', async () => {
        const fake = install();

        const [a, b, c] = await Promise.all([openDB(), openDB(), openDB()]);

        expect(fake.connections).toHaveLength(1);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    it('does not open a second connection for a second call', async () => {
        const fake = install();

        await openDB();
        await openDB();

        // Previously this was one connection per call, none of them closed, for as long
        // as the tab stayed open.
        expect(fake.connections).toHaveLength(1);
    });

    it('rejects rather than hanging when the open is blocked', async () => {
        install({ blockUpgrade: true });

        // The whole bug: no handler meant the promise never settled, and the panel had
        // no way to tell that apart from a slow read.
        await expect(openDB()).rejects.toThrow(/another tab/i);
    });

    it('does not cache a failed open', async () => {
        install({ blockUpgrade: true });
        await expect(openDB()).rejects.toThrow();

        // One blocked attempt must not poison the module for the rest of the session.
        install();
        await expect(openDB()).resolves.toBeDefined();
    });

    it('yields its connection when another tab needs to upgrade', async () => {
        const fake = install();
        const db = await openDB();

        db.onversionchange();

        expect(db._closed).toBe(true);
        // And the next call reopens rather than handing back a dead handle.
        const reopened = await openDB();
        expect(reopened).not.toBe(db);
        expect(fake.connections).toHaveLength(2);
    });

    it('reports a browser with no IndexedDB instead of throwing a ReferenceError', async () => {
        vi.stubGlobal('indexedDB', undefined);
        resetConnection();

        await expect(openDB()).rejects.toThrow(/no IndexedDB/i);
    });
});

describe('saveCalibrationVersion', () => {
    it('numbers versions from 1 upwards', async () => {
        install();

        const first = await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { pm25Offset: 1.2 } });
        const second = await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { pm25Offset: 1.4 } });

        expect(first.version).toBe(1);
        expect(second.version).toBe(2);
        expect(second.id).toBe('s1-v2');
    });

    it('numbers each sensor independently', async () => {
        install();

        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: {} });
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: {} });
        const other = await saveCalibrationVersion({ sensorId: 's2', calibrationParameters: {} });

        expect(other.version).toBe(1);
    });

    it('refuses a missing sensor id instead of writing under "undefined-v1"', async () => {
        const fake = install();

        await expect(
            saveCalibrationVersion({ sensorId: undefined, calibrationParameters: {} })
        ).rejects.toThrow(/sensor id is required/i);
        await expect(
            saveCalibrationVersion({ sensorId: '   ', calibrationParameters: {} })
        ).rejects.toThrow(/sensor id is required/i);

        expect(fake.connections).toHaveLength(0);
    });

    it('reports a write that could not be committed as a failure', async () => {
        install();
        const db = await openDB();
        db._failWrites = true;

        // The old code resolved on put.onsuccess, so a transaction that aborted after a
        // successful request told the caller the revision had been saved.
        await expect(
            saveCalibrationVersion({ sensorId: 's1', calibrationParameters: {} })
        ).rejects.toThrow();
        await expect(getCalibrationHistory('s1')).resolves.toEqual([]);
    });

    it('records who made the change and when', async () => {
        install();

        const record = await saveCalibrationVersion({
            sensorId: 's1',
            calibrationParameters: { pm25Offset: 1.2 },
            createdBy: 'field-tech',
        });

        expect(record.createdBy).toBe('field-tech');
        expect(Date.parse(record.createdAt)).not.toBeNaN();
    });
});

describe('getCalibrationHistory', () => {
    it('returns a sensor revisions newest first', async () => {
        install();
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { v: 1 } });
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { v: 2 } });
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { v: 3 } });

        const history = await getCalibrationHistory('s1');

        expect(history.map((r) => r.version)).toEqual([3, 2, 1]);
    });

    it('does not leak another sensor history', async () => {
        install();
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: {} });
        await saveCalibrationVersion({ sensorId: 's2', calibrationParameters: {} });

        const history = await getCalibrationHistory('s1');

        expect(history).toHaveLength(1);
        expect(history[0].sensorId).toBe('s1');
    });

    it('refuses an empty sensor id rather than returning every record', async () => {
        install();
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: {} });
        await saveCalibrationVersion({ sensorId: 's2', calibrationParameters: {} });

        // getAll(undefined) is an unbounded key range, so this used to hand back both
        // sensors' revisions under whichever heading was on screen.
        await expect(getCalibrationHistory(undefined)).rejects.toThrow(/sensor id is required/i);
    });

    it('returns an empty list for a sensor with no revisions', async () => {
        install();

        await expect(getCalibrationHistory('never-calibrated')).resolves.toEqual([]);
    });
});

describe('getCalibrationVersion', () => {
    it('fetches one revision by number', async () => {
        install();
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { pm25Offset: 1.2 } });
        await saveCalibrationVersion({ sensorId: 's1', calibrationParameters: { pm25Offset: 9.9 } });

        const record = await getCalibrationVersion('s1', 1);

        expect(record.calibrationParameters).toEqual({ pm25Offset: 1.2 });
    });

    it('returns null for a version that does not exist', async () => {
        install();

        await expect(getCalibrationVersion('s1', 42)).resolves.toBeNull();
    });

    it('refuses a missing sensor id', async () => {
        install();

        await expect(getCalibrationVersion('', 1)).rejects.toThrow(/sensor id is required/i);
    });
});
