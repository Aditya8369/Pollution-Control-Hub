import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage a Set of items stored as a JSON array in localStorage.
 *
 * @param {string} key - localStorage key
 * @param {Array<string>} [initialValue=[]] - Initial array if key does not exist
 * @returns {{
 *   set: Set<string>,
 *   toggle: (id: string) => void,
 *   has: (id: string) => boolean
 * }}
 */
export function useLocalStorageSet(key, initialValue = []) {
  const [set, setSet] = useState(() => {
    try {
      if (typeof window === 'undefined') return new Set(initialValue);
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (err) {
      console.warn(`Error reading localStorage key "${key}":`, err);
    }
    return new Set(initialValue);
  });

  // Sync to localStorage on state changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const arrayData = Array.from(set);
        window.localStorage.setItem(key, JSON.stringify(arrayData));
      }
    } catch (err) {
      console.warn(`Error writing to localStorage key "${key}":`, err);
    }
  }, [key, set]);

  const toggle = useCallback((id) => {
    setSet((prevSet) => {
      const nextSet = new Set(prevSet);
      if (nextSet.has(id)) {
        nextSet.delete(id);
      } else {
        nextSet.add(id);
      }
      return nextSet;
    });
  }, []);

  const has = useCallback((id) => set.has(id), [set]);

  return { set, toggle, has };
}
