import { useState, useEffect, useCallback, useRef } from "react";
import { cacheStore } from "../utils/cacheStore";

<<<<<<< HEAD:src/hooks/useSWR.jsx
let lastFetch = 0;

function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
=======
/**
 * Custom hook for Stale-While-Revalidate data fetching.
 * Handles automatic caching, request deduplication, and graceful error tracking.
 * * @param {string} key - Unique identifier/URL for the API request.
 * @param {Function} fetcher - Asynchronous function tasked with pulling data.
 * @param {Object} options - Configuration adjustments like Cache Time to Live (ttl).
 */
export function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
  // Initial state based on synchronous cache read
>>>>>>> cabb23949075f8b89cf341c87038276e41e0f480:src/hooks/useSWR.js
  const getInitialData = () => (key ? cacheStore.get(key)?.data : undefined);

  const [data, setData] = useState(getInitialData);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(
    () => !getInitialData() && !!key,
  );
  const [currentKey, setCurrentKey] = useState(key);
<<<<<<< HEAD:src/hooks/useSWR.jsx
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  if (key !== currentKey) {
=======

  // Keep fetcher mutable using a Ref to ensure we always call the latest instance
  // without triggering structural hook updates.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Handle key changes synchronously to avoid flash of old cached data
  const isKeyChanged = key !== currentKey;

  // Derive the display values immediately so we don't show stale information
  // while React is actively processing background state updates
  const displayData = isKeyChanged ? getInitialData() : data;
  const displayError = isKeyChanged ? null : error;
  const displayIsValidating = isKeyChanged
    ? !getInitialData() && !!key
    : isValidating;

  if (isKeyChanged) {
>>>>>>> cabb23949075f8b89cf341c87038276e41e0f480:src/hooks/useSWR.js
    setCurrentKey(key);
    setData(getInitialData());
    setError(null);
    setIsValidating(!!key);
  }

  // Asynchronous revalidation executor
  const revalidate = useCallback(
    async (force = false) => {
      if (!key) return;

<<<<<<< HEAD:src/hooks/useSWR.jsx
    const now = Date.now();
    if (now - lastFetch < 60000) return; // throttle: 1 min
    lastFetch = now;

    const isStale = cacheStore.isStale(key, ttl);
    if (!force && !isStale) {
      const cached = cacheStore.get(key);
      if (cached && cached.data !== data) setData(cached.data);
      return;
    }

    setIsValidating(true);
    try {
      const newData = await cacheStore.deduplicate(key, () => fetcherRef.current(key));
      setData(newData);
      setError(null);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("API error:", err);
      setError(err.message || "Failed to fetch data");
    }
  }, [key, ttl, data]);

  useEffect(() => {
    revalidate();
     return () => setIsValidating(false);
  }, [revalidate]);

=======
      const isStale = cacheStore.isStale(key, ttl);
      if (!force && !isStale) {
        const cached = cacheStore.get(key);
        if (cached) {
          // Use functional state updates to completely eliminate the need to track
          // 'data' inside this array, breaking part of the infinite circular loops.
          setData((prevData) =>
            cached.data !== prevData ? cached.data : prevData,
          );
        }
        return;
      }

      setIsValidating(true);
      try {
        const newData = await cacheStore.deduplicate(key, () =>
          fetcherRef.current(),
        );
        setData(newData);
        setError(null); // Clear errors instantly upon a successful data fetch
      } catch (err) {
        if (err.name !== "AbortError") {
          // Captures geolocation block or backend fetch exceptions
          // allowing the UI to adapt dynamically.
          setError(err);
        }
      } finally {
        setIsValidating(false);
      }
    },
    // Extracted 'displayData' completely from here to prevent the function
    // memory reference from changing dynamically on every UI update.
    [key, ttl],
  );

  // FIX: Storing 'revalidate' inside a persistent Ref pointer ensures the
  // downstream useEffect can safely target execution without triggering a 42-count cycle.
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  // Revalidate safely on initial component mount or when the unique identifier key changes.
  // When a user successfully enables location, the key changes, and this fires cleanly!
  useEffect(() => {
    revalidateRef.current();
  }, [key]);

  // Force revalidation runner (ideal for manual 'Refresh' buttons)
>>>>>>> cabb23949075f8b89cf341c87038276e41e0f480:src/hooks/useSWR.js
  const mutate = useCallback(async () => {
    if (!key) return;
    await cacheStore.invalidate(key);
    await revalidate(true);
  }, [key, revalidate]);

  return {
    data: displayData,
    error: displayError,
    isValidating: displayIsValidating,
    mutate,
  };
}

export default useSWR;

