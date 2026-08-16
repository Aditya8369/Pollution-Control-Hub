import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import {
    useRouteHistory,
    normaliseHistory,
    normaliseLocations,
} from './useRouteHistory';

/**
 * #806. The readers only caught a JSON.parse throw, so valid-but-wrong-shaped JSON
 * reached `.filter` / `.map` and crashed the planner, and every write happened inside a
 * setState updater with no error handling — which made deleting a saved location throw
 * uncaught once storage was full.
 */

const HISTORY_STORAGE_KEY = 'commute-route-history';
const SAVED_LOCATIONS_KEY = 'commute-saved-locations';

const ENTRY = {
    origin: 'Connaught Place',
    destination: 'India Gate',
    timestamp: '2026-08-10T09:00:00.000Z',
};

const LOCATION = { id: 'a1', label: 'Home', value: 'Hauz Khas' };

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('normaliseHistory', () => {
    it('keeps well-formed entries', () => {
        expect(normaliseHistory([ENTRY])).toEqual([ENTRY]);
    });

    it('returns an empty list for anything that is not an array', () => {
        // These are all valid JSON, so the old try/catch never saw them.
        expect(normaliseHistory({})).toEqual([]);
        expect(normaliseHistory(null)).toEqual([]);
        expect(normaliseHistory(42)).toEqual([]);
        expect(normaliseHistory('nope')).toEqual([]);
        expect(normaliseHistory(undefined)).toEqual([]);
    });

    it('drops an entry with no timestamp, which renders as key={undefined}', () => {
        const result = normaliseHistory([{ origin: 'A', destination: 'B' }, ENTRY]);

        expect(result).toEqual([ENTRY]);
    });

    it('drops an entry with no origin, which renders as "undefined → undefined"', () => {
        const result = normaliseHistory([
            { destination: 'B', timestamp: ENTRY.timestamp },
            { origin: '   ', destination: 'B', timestamp: ENTRY.timestamp },
            ENTRY,
        ]);

        expect(result).toEqual([ENTRY]);
    });

    it('drops nulls and primitives mixed into the array', () => {
        expect(normaliseHistory([null, 'x', 7, ENTRY])).toEqual([ENTRY]);
    });

    it('applies the cap on read, not only on write', () => {
        const stored = Array.from({ length: 25 }, (_, i) => ({
            origin: `A${i}`,
            destination: `B${i}`,
            timestamp: ENTRY.timestamp,
        }));

        expect(normaliseHistory(stored)).toHaveLength(10);
    });
});

describe('normaliseLocations', () => {
    it('keeps well-formed locations', () => {
        expect(normaliseLocations([LOCATION])).toEqual([LOCATION]);
    });

    it('returns an empty list for a non-array', () => {
        expect(normaliseLocations({})).toEqual([]);
        expect(normaliseLocations(null)).toEqual([]);
    });

    it('drops a location missing an id, label or value', () => {
        const result = normaliseLocations([
            { label: 'Home', value: 'Hauz Khas' },
            { id: 'b2', value: 'Saket' },
            { id: 'c3', label: 'Office' },
            LOCATION,
        ]);

        expect(result).toEqual([LOCATION]);
    });
});

describe('useRouteHistory - hydration', () => {
    it('starts empty with nothing stored', () => {
        const { result } = renderHook(() => useRouteHistory());

        expect(result.current.routeHistory).toEqual([]);
        expect(result.current.savedLocations).toEqual([]);
    });

    it('hydrates from storage', () => {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([ENTRY]));
        localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify([LOCATION]));

        const { result } = renderHook(() => useRouteHistory());

        expect(result.current.routeHistory).toEqual([ENTRY]);
        expect(result.current.savedLocations).toEqual([LOCATION]);
    });

    it('survives an object where an array was expected', () => {
        localStorage.setItem(HISTORY_STORAGE_KEY, '{}');
        localStorage.setItem(SAVED_LOCATIONS_KEY, '{}');

        const { result } = renderHook(() => useRouteHistory());

        expect(result.current.routeHistory).toEqual([]);
        expect(result.current.savedLocations).toEqual([]);
    });

    it('survives unparseable JSON', () => {
        localStorage.setItem(HISTORY_STORAGE_KEY, 'not json');

        const { result } = renderHook(() => useRouteHistory());

        expect(result.current.routeHistory).toEqual([]);
    });

    it('does not create storage keys it did not need to write', () => {
        renderHook(() => useRouteHistory());

        expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(SAVED_LOCATIONS_KEY)).toBeNull();
    });
});

describe('useRouteHistory - addHistoryEntry', () => {
    it('records a search and persists it', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.addHistoryEntry('Hauz Khas', 'Saket'));

        expect(result.current.routeHistory[0]).toMatchObject({
            origin: 'Hauz Khas',
            destination: 'Saket',
        });
        expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY))).toHaveLength(1);
    });

    it('moves a repeated search back to the top instead of duplicating it', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.addHistoryEntry('A', 'B'));
        act(() => result.current.addHistoryEntry('C', 'D'));
        act(() => result.current.addHistoryEntry('A', 'B'));

        expect(result.current.routeHistory).toHaveLength(2);
        expect(result.current.routeHistory[0].origin).toBe('A');
    });

    it('caps the list at ten', () => {
        const { result } = renderHook(() => useRouteHistory());

        for (let i = 0; i < 14; i += 1) {
            act(() => result.current.addHistoryEntry(`A${i}`, `B${i}`));
        }

        expect(result.current.routeHistory).toHaveLength(10);
        expect(result.current.routeHistory[0].origin).toBe('A13');
    });

    it('ignores a blank origin or destination', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.addHistoryEntry('', 'Saket'));
        act(() => result.current.addHistoryEntry('Hauz Khas', '   '));

        expect(result.current.routeHistory).toEqual([]);
    });
});

describe('useRouteHistory - saved locations', () => {
    it('saves a labelled location', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.setNewLocationLabel('Home'));
        act(() => result.current.saveLocation('Hauz Khas'));

        expect(result.current.savedLocations).toHaveLength(1);
        expect(result.current.savedLocations[0]).toMatchObject({
            label: 'Home',
            value: 'Hauz Khas',
        });
        expect(result.current.newLocationLabel).toBe('');
    });

    it('replaces a location saved under the same label', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.setNewLocationLabel('Home'));
        act(() => result.current.saveLocation('Hauz Khas'));
        act(() => result.current.setNewLocationLabel('home'));
        act(() => result.current.saveLocation('Saket'));

        expect(result.current.savedLocations).toHaveLength(1);
        expect(result.current.savedLocations[0].value).toBe('Saket');
    });

    it('needs both a label and a value', () => {
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.saveLocation('Hauz Khas'));
        expect(result.current.savedLocations).toEqual([]);

        act(() => result.current.setNewLocationLabel('Home'));
        act(() => result.current.saveLocation('   '));
        expect(result.current.savedLocations).toEqual([]);
    });

    it('generates an id without crypto.randomUUID', () => {
        // Not available outside a secure context — plain http on a LAN address, say.
        const original = crypto.randomUUID;
        // @ts-ignore
        crypto.randomUUID = undefined;

        const { result } = renderHook(() => useRouteHistory());
        act(() => result.current.setNewLocationLabel('Home'));
        act(() => result.current.saveLocation('Hauz Khas'));

        expect(result.current.savedLocations).toHaveLength(1);
        expect(result.current.savedLocations[0].id).toEqual(expect.any(String));
        expect(result.current.savedLocations[0].id).not.toBe('');

        // @ts-ignore
        crypto.randomUUID = original;
    });

    it('deletes by id and persists the removal', () => {
        localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify([LOCATION]));
        const { result } = renderHook(() => useRouteHistory());

        act(() => result.current.deleteSavedLocation('a1'));

        expect(result.current.savedLocations).toEqual([]);
        expect(JSON.parse(localStorage.getItem(SAVED_LOCATIONS_KEY))).toEqual([]);
    });
});

describe('useRouteHistory - storage failures', () => {
    it('still deletes a saved location when setItem throws', () => {
        localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify([LOCATION]));
        const { result } = renderHook(() => useRouteHistory());

        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // This used to throw out of the dispatch, so the chip stayed on screen.
        expect(() => act(() => result.current.deleteSavedLocation('a1'))).not.toThrow();
        expect(result.current.savedLocations).toEqual([]);

        setItem.mockRestore();
    });

    it('still records history when setItem throws', () => {
        const { result } = renderHook(() => useRouteHistory());

        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        expect(() => act(() => result.current.addHistoryEntry('A', 'B'))).not.toThrow();
        expect(result.current.routeHistory).toHaveLength(1);

        setItem.mockRestore();
    });

    it('hydrates to empty when getItem itself throws', () => {
        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });

        const { result } = renderHook(() => useRouteHistory());

        expect(result.current.routeHistory).toEqual([]);
        expect(result.current.savedLocations).toEqual([]);

        getItem.mockRestore();
    });
});
