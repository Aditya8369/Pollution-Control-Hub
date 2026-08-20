import { useEffect, useRef, useState } from "react";

/**
 * Route search history and saved locations for the Clean Route Planner, held in
 * localStorage.
 *
 * There is no server side to this. A second implementation of this hook was pasted in
 * above this one and synced to `/api/users/:id/history`; that endpoint does not exist —
 * the project is a static Vite build with no backend — and the paste redeclared both the
 * React imports and the hook itself, which is a syntax error, so `npm run build`,
 * `npm run lint` and five test files all stopped working. Signing history in to an
 * account needs an API before it needs a hook; until one exists, this stays local.
 */

const HISTORY_STORAGE_KEY = "commute-route-history";
const SAVED_LOCATIONS_KEY = "commute-saved-locations";
const MAX_HISTORY = 10;

/**
 * Writes are wrapped so a full quota, or Safari Private Browsing (where setItem throws
 * outright), degrades to in-memory-only for the session instead of propagating out of a
 * state update. Deleting a saved location used to throw uncaught for exactly that reason.
 *
 * @param {string} key
 * @param {unknown} value
 */
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not persist ${key}:`, error);
  }
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * The old readers returned whatever JSON.parse produced. Valid JSON that is not an array
 * — `{}`, `null`, `42` — sailed past the try/catch and then hit `.filter` / `.map`, which
 * is a hard crash rather than the empty-list fallback an unparseable value already got.
 * Malformed entries are dropped individually: one without a timestamp becomes
 * `key={undefined}` in RouteHistory, and one without an origin renders "undefined →
 * undefined".
 *
 * The MAX_HISTORY cap is applied here as well as on write, so a list that grew under an
 * older build is trimmed on load rather than on the next search.
 *
 * @param {unknown} raw
 * @returns {Array<{ origin: string, destination: string, timestamp: string }>}
 */
export function normaliseHistory(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        isNonEmptyString(entry.origin) &&
        isNonEmptyString(entry.destination) &&
        isNonEmptyString(entry.timestamp)
    )
    .slice(0, MAX_HISTORY);
}

/**
 * @param {unknown} raw
 * @returns {Array<{ id: string, label: string, value: string }>}
 */
export function normaliseLocations(raw) {
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (loc) =>
      loc &&
      typeof loc === "object" &&
      isNonEmptyString(loc.id) &&
      isNonEmptyString(loc.label) &&
      isNonEmptyString(loc.value)
  );
}

function readRouteHistory() {
  return normaliseHistory(readJson(HISTORY_STORAGE_KEY));
}

function readSavedLocations() {
  return normaliseLocations(readJson(SAVED_LOCATIONS_KEY));
}

/**
 * `crypto.randomUUID` is only defined in a secure context, so it is missing when the app
 * is opened over plain http on a LAN address — a common way to check the dashboard on a
 * phone. Saving a location threw there.
 */
function newLocationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mirrors a piece of state into localStorage after it settles. The write used to live
 * inside the setState updater, which React.StrictMode double-invokes by design — updaters
 * have to stay pure — and an unguarded throw from there propagated out of the dispatch.
 *
 * The first run is skipped so mounting does not immediately write back what was just read
 * (and does not create the key at all for a visitor with no history).
 */
function usePersistedTo(key, value) {
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    persist(key, value);
  }, [key, value]);
}

export function useRouteHistory() {
  const [routeHistory, setRouteHistory] = useState(() => readRouteHistory());
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [newLocationLabel, setNewLocationLabel] = useState("");

  usePersistedTo(HISTORY_STORAGE_KEY, routeHistory);
  usePersistedTo(SAVED_LOCATIONS_KEY, savedLocations);

  const addHistoryEntry = (origin, destination) => {
    if (!isNonEmptyString(origin) || !isNonEmptyString(destination)) return;

    setRouteHistory((prev) => {
      const entry = { origin, destination, timestamp: new Date().toISOString() };
      const deduped = prev.filter(
        (item) => !(item.origin === origin && item.destination === destination)
      );
      return [entry, ...deduped].slice(0, MAX_HISTORY);
    });
  };

  const saveLocation = (value) => {
    const label = newLocationLabel.trim();
    if (!label || !isNonEmptyString(value)) return;

    setSavedLocations((prev) => {
      const deduped = prev.filter(
        (loc) => loc.label.toLowerCase() !== label.toLowerCase()
      );
      return [...deduped, { id: newLocationId(), label, value: value.trim() }];
    });
    setNewLocationLabel("");
  };

  const deleteSavedLocation = (id) => {
    setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  return {
    routeHistory,
    savedLocations,
    newLocationLabel,
    setNewLocationLabel,
    addHistoryEntry,
    saveLocation,
    deleteSavedLocation,
  };
}
