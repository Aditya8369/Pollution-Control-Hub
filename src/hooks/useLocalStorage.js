import { useState, useEffect, useCallback } from 'react';

/**
 * A custom React hook for managing state synchronized with localStorage.
 * 
 * @param {string} key - The localStorage key to bind to.
 * @param {any} initialValue - The initial value to use if no value is present in localStorage.
 *                             Can be a function that returns the initial value.
 * @returns {[any, Function]} A state value and a setter function similar to useState.
 */
export function useLocalStorage(key, initialValue) {
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
          
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          if (valueToStore === undefined) {
            window.localStorage.removeItem(key);
          } else {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
          
          // Dispatch a custom event so other instances of useLocalStorage in the same window can update
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key, newValue: valueToStore }
          }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Sync state across different tabs/windows and the same window
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Handle changes from other tabs/windows
    const handleStorageChange = (event) => {
      if (event.key === key) {
        try {
          const newValue = event.newValue !== null ? JSON.parse(event.newValue) : initialValue;
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Error syncing localStorage key "${key}":`, error);
        }
      }
    };
    
    // Handle changes from other components in the same window
    const handleCustomSync = (event) => {
      if (event.detail && event.detail.key === key) {
        setStoredValue(event.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleCustomSync);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleCustomSync);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
