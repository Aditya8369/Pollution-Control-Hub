import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage Hook', () => {
  const testKey = 'test-storage-key';
  
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Spy on console.warn to suppress expected warnings during error testing
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    window.localStorage.clear();
    cleanup();
    vi.restoreAllMocks();
  });

  it('returns initial string value when localStorage is empty', () => {
    const initialValue = 'hello world';
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    expect(result.current[0]).toBe(initialValue);
    expect(window.localStorage.getItem(testKey)).toBeNull(); // It shouldn't set initial value to storage until explicitly requested
  });

  it('returns initial number value when localStorage is empty', () => {
    const initialValue = 42;
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    expect(result.current[0]).toBe(initialValue);
  });

  it('returns initial array value when localStorage is empty', () => {
    const initialValue = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    expect(result.current[0]).toEqual(initialValue);
  });

  it('returns initial object value when localStorage is empty', () => {
    const initialValue = { name: 'Test', valid: true };
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    expect(result.current[0]).toEqual(initialValue);
  });

  it('supports initial value as a function for lazy initialization', () => {
    const factory = vi.fn(() => 'lazy value');
    const { result } = renderHook(() => useLocalStorage(testKey, factory));
    
    expect(result.current[0]).toBe('lazy value');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('reads existing JSON from localStorage correctly', () => {
    window.localStorage.setItem(testKey, JSON.stringify({ existing: 'data' }));
    
    const { result } = renderHook(() => useLocalStorage(testKey, { default: 'value' }));
    
    expect(result.current[0]).toEqual({ existing: 'data' });
  });

  it('falls back to initial value when localStorage contains invalid JSON', () => {
    window.localStorage.setItem(testKey, 'not-valid-json {');
    
    const initialValue = 'fallback value';
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    expect(result.current[0]).toBe(initialValue);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Error reading localStorage key "${testKey}"`),
      expect.any(Error)
    );
  });

  it('updates the state and localStorage when setter is called', () => {
    const { result } = renderHook(() => useLocalStorage(testKey, 'initial'));
    
    act(() => {
      result.current[1]('new value');
    });
    
    expect(result.current[0]).toBe('new value');
    expect(window.localStorage.getItem(testKey)).toBe(JSON.stringify('new value'));
  });

  it('supports functional updates like standard useState', () => {
    window.localStorage.setItem(testKey, JSON.stringify(10));
    const { result } = renderHook(() => useLocalStorage(testKey, 0));
    
    act(() => {
      // result.current[1] is the setter
      result.current[1]((prev) => prev + 5);
    });
    
    expect(result.current[0]).toBe(15);
    expect(window.localStorage.getItem(testKey)).toBe(JSON.stringify(15));
  });

  it('removes item from localStorage when undefined is passed', () => {
    window.localStorage.setItem(testKey, JSON.stringify('to-be-removed'));
    const { result } = renderHook(() => useLocalStorage(testKey, 'default'));
    
    expect(result.current[0]).toBe('to-be-removed');
    
    act(() => {
      result.current[1](undefined);
    });
    
    expect(result.current[0]).toBeUndefined();
    expect(window.localStorage.getItem(testKey)).toBeNull();
  });

  it('handles localStorage SetItem errors gracefully (e.g., quota exceeded)', () => {
    const initialValue = 'initial';
    const { result } = renderHook(() => useLocalStorage(testKey, initialValue));
    
    // Mock setItem to throw
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    
    act(() => {
      result.current[1]('new string that fails to save');
    });
    
    // State should still update even if localStorage fails
    expect(result.current[0]).toBe('new string that fails to save');
    
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Error setting localStorage key "${testKey}"`),
      expect.any(Error)
    );
    
    // Restore
    setItemSpy.mockRestore();
  });

  describe('cross-tab and same-tab synchronization', () => {
    it('syncs state when storage event is fired from another tab', () => {
      const { result } = renderHook(() => useLocalStorage(testKey, 'initial'));
      
      act(() => {
        // Dispatch storage event simulating another tab modifying the data
        const event = new StorageEvent('storage', {
          key: testKey,
          newValue: JSON.stringify('updated-from-another-tab')
        });
        window.dispatchEvent(event);
      });
      
      expect(result.current[0]).toBe('updated-from-another-tab');
    });
    
    it('falls back to initial value when other tab clears the key', () => {
      const { result } = renderHook(() => useLocalStorage(testKey, 'initial'));
      
      act(() => {
        // Set an intermediate value
        result.current[1]('intermediate');
      });
      expect(result.current[0]).toBe('intermediate');
      
      act(() => {
        // Dispatch storage event with null newValue simulating removal
        const event = new StorageEvent('storage', {
          key: testKey,
          newValue: null
        });
        window.dispatchEvent(event);
      });
      
      expect(result.current[0]).toBe('initial');
    });
    
    it('ignores storage events for other keys', () => {
      const { result } = renderHook(() => useLocalStorage(testKey, 'initial'));
      
      act(() => {
        const event = new StorageEvent('storage', {
          key: 'some-other-key',
          newValue: JSON.stringify('updated')
        });
        window.dispatchEvent(event);
      });
      
      expect(result.current[0]).toBe('initial');
    });

    it('syncs state across multiple hook instances in the same window', () => {
      // Render two hooks bound to the same key
      const hook1 = renderHook(() => useLocalStorage(testKey, 'initial'));
      const hook2 = renderHook(() => useLocalStorage(testKey, 'initial'));
      
      expect(hook1.result.current[0]).toBe('initial');
      expect(hook2.result.current[0]).toBe('initial');
      
      act(() => {
        // Update via hook1
        hook1.result.current[1]('updated-value');
      });
      
      // hook1 should update immediately
      expect(hook1.result.current[0]).toBe('updated-value');
      
      // hook2 should have received the custom local-storage-sync event and updated
      expect(hook2.result.current[0]).toBe('updated-value');
    });
  });
});
