import { useState, useEffect, useCallback, useRef } from "react";
import { cacheStore } from "../utils/cacheStore";

let lastFetch = 0;

export function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
  const getInitialData = useCallback(
    () => (key ? cacheStore.get(key)?.data : undefined),
    [key],
  );

  const [data, setData] = useState(() => getInitialData());
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(() => !getInitialData() && !!key);
  const [currentKey, setCurrentKey] = useState(key);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (key !== currentKey) {
      setCurrentKey(key);
      setData(getInitialData());
      setError(null);
      setIsValidating(!!key);
    }
  }, [key, currentKey, getInitialData]);

  const revalidate = useCallback(
    async (force = false) => {
      if (!key) return;

      const now = Date.now();
      if (!force && now - lastFetch < 60000) return;
      lastFetch = now;

      const isStale = cacheStore.isStale(key, ttl);
      if (!force && !isStale) {
        const cached = cacheStore.get(key);
        if (cached && cached.data !== data) {
          setData(cached.data);
        }
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
      } finally {
        setIsValidating(false);
      }
    },
    [key, ttl, data],
  );

  useEffect(() => {
    revalidate();
    return () => setIsValidating(false);
  }, [revalidate]);

  const mutate = useCallback(async () => {
    if (!key) return;
    await cacheStore.invalidate(key);
    await revalidate(true);
  }, [key, revalidate]);

  return {
    data,
    error,
    isValidating,
    mutate,
  };
}

export default useSWR;

