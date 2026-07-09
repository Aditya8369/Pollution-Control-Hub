import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheStore } from '../utils/cacheStore';

export function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
  // Initial state based on synchronous cache read
  const getInitialData = () => (key ? cacheStore.get(key)?.data : undefined);
  
  const [data, setData] = useState(getInitialData);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(() => !getInitialData() && !!key);
  const [currentKey, setCurrentKey] = useState(key);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Handle key changes synchronously to avoid flash of old data
  if (key !== currentKey) {
    setCurrentKey(key);
    const cachedData = getInitialData();
    setData(cachedData);
    setError(null);
    setIsValidating(!cachedData && !!key);
  }

  const revalidate = useCallback(async (force = false) => {
    if (!key) return;

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
      const newData = await cacheStore.deduplicate(key, () => fetcherRef.current());
      setData(newData);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setIsValidating(false);
    }
  }, [key, ttl, data]);

  // Revalidate on mount or key change
  useEffect(() => {
    revalidate();
  }, [revalidate]);

  // Force revalidation (e.g. for refresh button)
  const mutate = useCallback(async () => {
    if (!key) return;
    cacheStore.invalidate(key);
    await revalidate(true);
  }, [key, revalidate]);

  return { data, error, isValidating, mutate };
}
