import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheStore } from '../utils/cacheStore';

  const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {any} key
 * @param {any} fetcher
 * @param {any} params
 */
export function useSWR(
  key,
  fetcher,
  {
    ttl = 5 * 60 * 1000,
    errorRetryCount = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? 0 : 3,
  } = {}
) {
  // Synchronous cache read that seeds the render, evaluated once per render.
  //
  // The ttl argument is the fix: getFromMemory() treats a missing ttl as "never
  // expires", so omitting it handed back entries of any age -- an hour old, a day
  // old -- while isValidating started false, telling the consumer nothing was in
  // flight. The revalidate path below has always applied ttl via isStale(); this
  // read was the one place opting out of the hook's own freshness contract.
  //
  // Entry presence, not data truthiness, decides whether it counts as a hit: the
  // old `!getInitialData()` also treated a legitimately falsy payload (0, '', null)
  // as a miss.
  const cachedEntry = key ? cacheStore.getFromMemory(key, ttl) : null;
  const cachedData = cachedEntry ? cachedEntry.data : undefined;
  const hasFreshCache = Boolean(cachedEntry);

  const [data, setData] = useState(() => cachedData);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(() => !hasFreshCache && !!key);
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
  const displayData = isKeyChanged ? cachedData : data;
  const displayError = isKeyChanged ? null : error;
  const displayIsValidating = isKeyChanged
    ? (!hasFreshCache && !!key)
    : isValidating;

  if (isKeyChanged) {
    setCurrentKey(key);
    setData(cachedData);
    setError(null);
    setIsValidating(!hasFreshCache && !!key);
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
  let retryCount = 0;

  while (true) {
    try {
      const newData = await cacheStore.deduplicate(
        key,
        () => fetcherRef.current()
      );

      setData(newData);
      setError(null);
      break;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err;
      }

      if (retryCount >= errorRetryCount) {
        throw err;
      }

      const retryDelay = 1000 * Math.pow(2, retryCount);

      await delay(retryDelay);
      retryCount++;
    }
  }
} catch (err) {
  if (err.name !== 'AbortError') {
    setError(err);
  }
} finally {
  setIsValidating(false);
}
  }, [key, ttl, errorRetryCount]);

  // Revalidate on mount or key change
  useEffect(() => {
    revalidate();
  }, [revalidate]);

  // Force revalidation (e.g. for refresh button)
  const mutate = useCallback(async () => {
    if (!key) return;
    // Awaited so the IndexedDB delete cannot land after the refetch's write and
    // erase the entry it just stored. The in-memory delete is synchronous, but the
    // persisted one is not.
    await cacheStore.invalidate(key);
    await revalidate(true);
  }, [key, revalidate]);

  return {
    data: displayData,
    error: displayError,
    isValidating: displayIsValidating,
    mutate
  };
}