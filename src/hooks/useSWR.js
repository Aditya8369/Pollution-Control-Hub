import { useState, useEffect, useCallback, useRef } from "react";
import { cacheStore } from "../utils/cacheStore";

/**
 * Custom hook for Stale-While-Revalidate data fetching.
 * Handles automatic caching, request deduplication, and graceful error tracking.
 *
 * @param {string} key - Unique identifier/URL for the API request.
 * @param {Function} fetcher - Asynchronous function tasked with pulling data.
 * @param {Object} options - Configuration adjustments like Cache Time to Live (ttl).
 */
export function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
  // Initial state based on synchronous cache read
  const getInitialData = () => (key ? cacheStore.get(key)?.data : undefined);

  const [data, setData] = useState(getInitialData);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(
    () => !getInitialData() && !!key,
  );
  const [currentKey, setCurrentKey] = useState(key);

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
    setCurrentKey(key);
    setData(getInitialData());
    setError(null);
    setIsValidating(!!key);
  }

  // Asynchronous revalidation executor
  const revalidate = useCallback(
    async (force = false) => {
      if (!key) return;

      const isStale = cacheStore.isStale(key, ttl);

      if (!force && !isStale) {
        const cached = cacheStore.get(key);

        if (cached) {
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
        setError(null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setIsValidating(false);
      }
    },
    [key, ttl],
  );

  // Store revalidate in a ref to avoid unnecessary effect reruns.
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  useEffect(() => {
    revalidateRef.current();
  }, [key]);

  // Force revalidation (ideal for Refresh buttons)
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