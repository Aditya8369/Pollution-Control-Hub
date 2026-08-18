import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Sets what `navigator.onLine` reports.
 *
 * jsdom defines it as a getter on the prototype, so it is redefined rather than
 * assigned.
 *
 * @param {boolean} value
 */
function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

/**
 * Fires a connectivity event the way a browser does.
 *
 * The flag has to be updated first: a real browser changes `navigator.onLine` before
 * dispatching, and a listener that re-reads it would otherwise see the old value.
 *
 * @param {'online'|'offline'} type
 */
function fireConnectivity(type) {
  setNavigatorOnline(type === 'online');
  window.dispatchEvent(new Event(type));
}

describe('useOnlineStatus', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setNavigatorOnline(true);
  });

  it('starts online when the browser reports a connection', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.offlineSince).toBeNull();
    expect(result.current.wasOffline).toBe(false);
  });

  it('starts offline when the browser reports no connection', () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
    expect(typeof result.current.offlineSince).toBe('number');
  });

  it('reacts to going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => fireConnectivity('offline'));

    expect(result.current.isOffline).toBe(true);
    expect(result.current.offlineSince).toBeGreaterThan(0);
  });

  it('reacts to coming back online', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => fireConnectivity('offline'));
    act(() => fireConnectivity('online'));

    expect(result.current.isOnline).toBe(true);
    expect(result.current.offlineSince).toBeNull();
  });

  it('remembers that it was offline after reconnecting', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => fireConnectivity('offline'));
    act(() => fireConnectivity('online'));

    // So a caller can say "back online" rather than silently removing a banner and
    // leaving people unsure whether it is fixed or gave up.
    expect(result.current.wasOffline).toBe(true);
  });

  it('ignores a repeated event for the state it is already in', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => fireConnectivity('offline'));
    const firstDrop = result.current.offlineSince;

    act(() => fireConnectivity('offline'));

    // A second `offline` event must not restart the clock, or "offline for 20 minutes"
    // resets every time the OS re-notices.
    expect(result.current.offlineSince).toBe(firstDrop);
  });

  it('catches a change that happened between render and subscribe', () => {
    // The connection can drop in the gap before the effect runs. Reading the flag
    // again on subscribe is what stops that transition being missed for the session.
    setNavigatorOnline(true);
    const { result } = renderHook(() => {
      setNavigatorOnline(false);
      return useOnlineStatus();
    });

    expect(result.current.isOffline).toBe(true);
  });

  it('removes its listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toContain('online');
    expect(removed).toContain('offline');
  });

  it('does not respond to events after unmount', () => {
    const { result, unmount } = renderHook(() => useOnlineStatus());
    unmount();

    expect(() => act(() => fireConnectivity('offline'))).not.toThrow();
    expect(result.current.isOnline).toBe(true);
  });
});

describe('useOnlineStatus — corroborating evidence', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  it('treats a reported request failure as being offline', () => {
    // navigator.onLine only means "an interface is attached". It stays true on a
    // captive portal and on a connection that is up but unusable, and no `offline`
    // event fires for either. A failed request is direct evidence the flag is wrong.
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => result.current.reportFailure());

    expect(result.current.isOffline).toBe(true);
  });

  it('treats a reported success as proof the connection works', () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOffline).toBe(true);

    act(() => result.current.reportSuccess());

    expect(result.current.isOnline).toBe(true);
  });

  it('keeps the reporting callbacks stable across renders', () => {
    const { result, rerender } = renderHook(() => useOnlineStatus());
    const { reportFailure, reportSuccess } = result.current;

    rerender();

    expect(result.current.reportFailure).toBe(reportFailure);
    expect(result.current.reportSuccess).toBe(reportSuccess);
  });
});

describe('useOnlineStatus — absent API', () => {
  afterEach(() => {
    setNavigatorOnline(true);
  });

  it('assumes online when navigator.onLine is not a boolean', () => {
    // Absent in some older browsers and under SSR. Assuming a working connection
    // degrades to normal behaviour; assuming offline would show a false warning to
    // everyone whose browser cannot answer.
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => undefined,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });
});
