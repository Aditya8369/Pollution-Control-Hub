/**
 * Loads the `leaflet.heat` plugin in a way that actually works under a bundler.
 *
 * `leaflet.heat` is a 2014 browser script, not a module. Its body opens with
 *
 *     L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({ ... })
 *
 * where `L` is a free variable — never imported, never declared. That is fine for a
 * `<script src="leaflet.js">` page, because Leaflet's UMD wrapper puts `L` on `window`
 * there. Under a bundler the wrapper takes its CommonJS branch instead, nothing is ever
 * assigned to `window.L`, and the plugin throws `ReferenceError: L is not defined` the
 * moment it is evaluated.
 *
 * `LocationMap` imported it as a top-level side effect, so that ReferenceError killed
 * the whole module: the live heatmap never rendered once, and `LocationMap.test.jsx`
 * could not be collected at all — every assertion in it had been silently un-run since
 * the import landed.
 *
 * The fix is to give the plugin the global it is asking for before importing it, and to
 * do that behind a function rather than at module scope. A side-effecting top-level
 * import is what made this both unmockable and untestable.
 */

/**
 * Cached across callers. The plugin mutates the shared Leaflet namespace, so importing
 * it twice is wasted work — and `HeatmapLayer` re-runs its effect on every points
 * update, which would otherwise mean an import attempt per WebSocket frame.
 *
 * @type {Promise<Function|null>|null}
 */
let loadPromise = null;

/**
 * Publishes the Leaflet namespace as a global, if it is not already there.
 *
 * Deliberately does not overwrite an existing `globalThis.L`. A page that loaded
 * Leaflet from a CDN has its own instance, and swapping it out from under other
 * plugins is a worse bug than the one being fixed here.
 *
 * @param {any} leaflet - The Leaflet namespace, as imported.
 * @returns {boolean} Whether a global is now available.
 */
export function exposeLeafletGlobal(leaflet) {
  if (!leaflet) return false;
  if (typeof globalThis === 'undefined') return false;

  if (!globalThis.L) {
    globalThis.L = leaflet;
  }
  return Boolean(globalThis.L);
}

/**
 * Loads `leaflet.heat` and returns its layer factory.
 *
 * Resolves to `null` rather than rejecting when the plugin is unavailable. A missing
 * heat overlay is a degraded map, not a broken one, and the caller is a `useEffect` —
 * an unhandled rejection there is indistinguishable from a crash.
 *
 * @param {any} leaflet - The Leaflet namespace, as imported.
 * @returns {Promise<Function|null>} `L.heatLayer`, or `null` if it could not be loaded.
 */
export function loadHeatLayer(leaflet) {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // The plugin may already be present — a CDN <script> tag, or a previous load in
    // the same session. Nothing to do if so.
    if (typeof leaflet?.heatLayer === 'function') {
      return leaflet.heatLayer;
    }

    if (!exposeLeafletGlobal(leaflet)) {
      return null;
    }

    try {
      await import('leaflet.heat');
    } catch {
      // The dependency is missing, or the plugin threw while evaluating. Either way
      // there is no heat layer; say so plainly instead of leaving the caller to
      // discover it as a TypeError.
      return null;
    }

    // The plugin attaches to the global namespace, which is the same object as the
    // imported one in the normal case — but not if something else had already claimed
    // `globalThis.L`. Check both rather than assuming.
    //
    // Cast because `@types/leaflet` describes stock Leaflet, and `heatLayer` is exactly
    // what the plugin adds to it — the property is absent from the type by definition.
    const globalLeaflet = /** @type {any} */ (globalThis).L;
    const factory =
      typeof leaflet?.heatLayer === 'function'
        ? leaflet.heatLayer
        : typeof globalLeaflet?.heatLayer === 'function'
          ? globalLeaflet.heatLayer
          : null;

    return factory ? factory.bind(globalLeaflet) : null;
  })();

  return loadPromise;
}

/**
 * Drops the cached load. Tests only — production wants exactly one attempt per session.
 */
export function resetHeatLayerCache() {
  loadPromise = null;
}
