import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheStore } from '../utils/cacheStore';

/**
 * @param {any} key
 * @param {any} fetcher
 * @param {any} params
 */
export function useSWR(key, fetcher, { ttl = 5 * 60 * 1000 } = {}) {
  // Initial state based on synchronous cache read
  const getInitialData = () => {
    if (!key) return undefined;
    const cached = cacheStore.getFromMemory(key);
    return cached ? cached.data : undefined;
  };

  const [data, setData] = useState(getInitialData);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(() => !getInitialData() && !!key);
  const [currentKey, setCurrentKey] = useState(key);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const dataRef = useRef(data);
  dataRef.current = data;

  // Track the latest key to prevent stale async updates
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Handle key changes synchronously to avoid flash of old data
  const isKeyChanged = key !== currentKey;

  // Derive display values immediately so we don't show old data
  // while React is processing the state update
  const displayData = isKeyChanged ? getInitialData() : data;
  const displayError = isKeyChanged ? null : error;
  const displayIsValidating = isKeyChanged
    ? (!getInitialData() && !!key)
    : isValidating;

  if (isKeyChanged) {
    setCurrentKey(key);
    setData(getInitialData());
    setError(null);
    setIsValidating(!getInitialData() && !!key);
  }

  const revalidate = useCallback(async (force = false) => {
    if (!key) return;

    const requestKey = key;

    const isStale = await cacheStore.isStale(requestKey, ttl);

    if (!force && !isStale) {
      const cached = await cacheStore.get(requestKey);
      if (cached && cached.data !== dataRef.current) {
        if (keyRef.current === requestKey) {
          setData(cached.data);
        }
      }
      if (keyRef.current === requestKey) {
        setIsValidating(false);
      }
      return;
    }

    setIsValidating(true);

    try {
      const newData = await cacheStore.deduplicate(
        requestKey,
        () => fetcherRef.current()
      );

      // Ignore stale responses
      if (keyRef.current !== requestKey) {
        return;
      }

      setData(newData);
      setError(null);

    } catch (err) {

      if (
        err.name !== 'AbortError' &&
        keyRef.current === requestKey
      ) {
        setError(err);
      }

    } finally {

      if (keyRef.current === requestKey) {
        setIsValidating(false);
      }

    }
  }, [key, ttl]);

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

  return {
    data: displayData,
    error: displayError,
    isValidating: displayIsValidating,
    mutate
  };
}