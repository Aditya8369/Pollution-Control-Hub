import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadHeatLayer, exposeLeafletGlobal, resetHeatLayerCache } from './heatLayer';

/**
 * #895. `leaflet.heat` is a 2014 browser script whose body reads a free `L`. Imported as
 * a module it threw `ReferenceError: L is not defined` before it could define
 * `L.heatLayer`, which took the whole of `LocationMap.jsx` down with it — the live
 * heatmap never rendered once, and `LocationMap.test.jsx` could not be collected, so
 * every assertion in it had been silently un-run.
 *
 * Nothing here imports the real plugin. The point of the loader is that the import is
 * behind a function and can be substituted; these tests exercise the four outcomes the
 * caller has to survive.
 */

const originalL = globalThis.L;

beforeEach(() => {
    resetHeatLayerCache();
    delete globalThis.L;
    vi.resetModules();
});

afterEach(() => {
    resetHeatLayerCache();
    if (originalL === undefined) {
        delete globalThis.L;
    } else {
        globalThis.L = originalL;
    }
    vi.restoreAllMocks();
    vi.doUnmock('leaflet.heat');
});

/** A stand-in for the Leaflet namespace, with no plugin attached. */
function makeLeaflet() {
    return { Layer: class { }, Class: class { } };
}

describe('exposeLeafletGlobal', () => {
    it('publishes the namespace so a script-style plugin can find it', () => {
        const leaflet = makeLeaflet();

        expect(exposeLeafletGlobal(leaflet)).toBe(true);
        expect(globalThis.L).toBe(leaflet);
    });

    it('does not overwrite a Leaflet that is already global', () => {
        // A page that loaded Leaflet from a CDN has its own instance. Swapping it out
        // from under the plugins bound to it is worse than the bug being fixed.
        const existing = makeLeaflet();
        globalThis.L = existing;

        exposeLeafletGlobal(makeLeaflet());

        expect(globalThis.L).toBe(existing);
    });

    it('reports failure rather than throwing on a missing namespace', () => {
        expect(exposeLeafletGlobal(null)).toBe(false);
        expect(exposeLeafletGlobal(undefined)).toBe(false);
    });
});

describe('loadHeatLayer', () => {
    it('returns the factory the plugin registered', async () => {
        const leaflet = makeLeaflet();
        const registered = vi.fn(() => ({ addTo: vi.fn() }));

        vi.doMock('leaflet.heat', () => {
            // What the real plugin does: reach for the global and attach itself.
            globalThis.L.heatLayer = registered;
            return {};
        });

        const factory = await loadHeatLayer(leaflet);

        expect(typeof factory).toBe('function');
        factory([[28.6, 77.2, 0.5]], { radius: 35 });
        expect(registered).toHaveBeenCalledWith([[28.6, 77.2, 0.5]], { radius: 35 });
    });

    it('skips the import when the plugin is already attached', async () => {
        const leaflet = makeLeaflet();
        leaflet.heatLayer = vi.fn();

        // A CDN <script> tag, or a second call in the same session.
        expect(await loadHeatLayer(leaflet)).toBe(leaflet.heatLayer);
    });

    it('resolves to null when the import rejects', async () => {
        // The dependency is missing from node_modules, or the chunk failed to fetch.
        vi.doMock('leaflet.heat', () => {
            throw new Error('Cannot find module');
        });

        await expect(loadHeatLayer(makeLeaflet())).resolves.toBeNull();
    });

    it('resolves to null when the plugin loads but registers nothing', async () => {
        // Exactly the old failure, one step later: the module evaluated without
        // throwing but never defined `heatLayer`. The caller used to find out by
        // calling `undefined` as a function inside a useEffect.
        vi.doMock('leaflet.heat', () => ({}));

        await expect(loadHeatLayer(makeLeaflet())).resolves.toBeNull();
    });

    it('resolves to null rather than throwing when there is no global to publish to', async () => {
        await expect(loadHeatLayer(null)).resolves.toBeNull();
    });

    it('imports once however many times it is called', async () => {
        const leaflet = makeLeaflet();
        const factory = vi.fn();
        const evaluated = vi.fn();

        vi.doMock('leaflet.heat', () => {
            evaluated();
            globalThis.L.heatLayer = factory;
            return {};
        });

        // HeatmapLayer re-runs its effect on every points update, which for a live
        // WebSocket feed is once per frame. Without the cache that is an import
        // attempt per frame.
        const [a, b, c] = await Promise.all([
            loadHeatLayer(leaflet),
            loadHeatLayer(leaflet),
            loadHeatLayer(leaflet),
        ]);

        expect(evaluated).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    it('never rejects, so an unhandled rejection cannot escape a useEffect', async () => {
        vi.doMock('leaflet.heat', () => {
            throw new TypeError('L is not defined');
        });

        // The original symptom, as a promise: this is what used to surface as a hard
        // ReferenceError at module evaluation.
        await expect(loadHeatLayer(makeLeaflet())).resolves.toBeNull();
    });
});
