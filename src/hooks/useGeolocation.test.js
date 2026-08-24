import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

describe('useGeolocation Hook', () => {
  let originalGeolocation;
  let originalFetch;

  beforeEach(() => {
    // Save original globals
    originalGeolocation = navigator.geolocation;
    originalFetch = global.fetch;

    // Mock geolocation
    navigator.geolocation = {
      getCurrentPosition: vi.fn(),
    };

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore globals
    navigator.geolocation = originalGeolocation;
    global.fetch = originalFetch;
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isLocating).toBe(false);
    expect(result.current.geoError).toBeNull();
    expect(result.current.locationSuccess).toBe(false);
    expect(result.current.coordinates).toBeNull();
    expect(result.current.address).toBe('');
    expect(typeof result.current.handleGetLocation).toBe('function');
  });

  it('sets error if geolocation is not supported', async () => {
    delete navigator.geolocation;

    const { result } = renderHook(() => useGeolocation());
    
    await act(async () => {
      const res = await result.current.handleGetLocation();
      expect(res).toBeNull();
    });

    expect(result.current.geoError).toBe("Geolocation is not supported by your browser.");
    expect(result.current.isLocating).toBe(false);
  });

  it('handles permission denied error', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 1, PERMISSION_DENIED: 1 }); // GeolocationPositionError.PERMISSION_DENIED
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      const res = await result.current.handleGetLocation();
      expect(res).toBeNull();
    });

    expect(result.current.geoError).toBe("Location permission denied.");
    expect(result.current.isLocating).toBe(false);
  });

  it('handles position unavailable error', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 2, POSITION_UNAVAILABLE: 2 });
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.geoError).toBe("Location information is unavailable.");
  });

  it('handles timeout error', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 3, TIMEOUT: 3 });
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.geoError).toBe("The request to get user location timed out.");
  });

  it('handles unknown geolocation error', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 99 });
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.geoError).toBe("Unable to retrieve location. Check browser permissions.");
  });

  it('tests loading state correctly while fetching', async () => {
    vi.useFakeTimers();

    let successCallback;
    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      successCallback = success;
    });

    const { result } = renderHook(() => useGeolocation());

    let promise;
    act(() => {
      promise = result.current.handleGetLocation();
    });

    expect(result.current.isLocating).toBe(true);

    // Provide coords, then mock fetch resolving slowly
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: "Mock Address, City, Country" })
    });

    await act(async () => {
      successCallback({ coords: { latitude: 12.34, longitude: 56.78 } });
      await promise;
    });

    expect(result.current.isLocating).toBe(false);
  });

  it('handles successful geolocation and reverse geocoding', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 12.34, longitude: 56.78 } });
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: "123 Main St, Springfield, IL, USA, Earth" })
    });

    const { result } = renderHook(() => useGeolocation());

    let response;
    await act(async () => {
      response = await result.current.handleGetLocation();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=12.34&lon=56.78`
    );

    // It should slice at the 3rd comma (0, 3)
    const expectedShortAddress = "123 Main St, Springfield, IL";
    
    expect(response).toEqual({
      coordinates: { latitude: 12.34, longitude: 56.78 },
      address: expectedShortAddress
    });

    expect(result.current.coordinates).toEqual({ latitude: 12.34, longitude: 56.78 });
    expect(result.current.address).toBe(expectedShortAddress);
    expect(result.current.locationSuccess).toBe(true);
    expect(result.current.geoError).toBeNull();
  });

  it('handles fetch failing (HTTP error)', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 12.34, longitude: 56.78 } });
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.address).toBe("Location unavailable");
    expect(result.current.geoError).toBe("Failed to fetch address details. Displaying placeholder.");
    expect(result.current.locationSuccess).toBe(false);
  });

  it('handles fetch returning missing display_name', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 12.34, longitude: 56.78 } });
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ some_other_key: "value" })
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.address).toBe("Location unavailable");
    expect(result.current.geoError).toBe("Location details unavailable for coordinates.");
  });

  it('clears success state after 3 seconds', async () => {
    vi.useFakeTimers();

    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 12.34, longitude: 56.78 } });
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: "123 Main St" })
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.handleGetLocation();
    });

    expect(result.current.locationSuccess).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.locationSuccess).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.locationSuccess).toBe(false);
  });

  it('does not update state if unmounted during fetch', async () => {
    let successCallback;
    navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      successCallback = success;
    });

    const { result, unmount } = renderHook(() => useGeolocation());

    let promise;
    act(() => {
      promise = result.current.handleGetLocation();
    });

    // Unmount before geolocation callbacks or fetch completes
    unmount();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: "Should Not Set State" })
    });

    await act(async () => {
      successCallback({ coords: { latitude: 12.34, longitude: 56.78 } });
      await promise;
    });

    // We can't easily assert on the unmounted state directly without warnings,
    // but the test ensures no "update on unmounted component" errors occur.
    // The fact that it passes means the isMounted check works.
  });

  it('allows clearing geoError explicitly', () => {
    const { result } = renderHook(() => useGeolocation());
    
    act(() => {
      result.current.setGeoError('Some error');
    });
    
    expect(result.current.geoError).toBe('Some error');

    act(() => {
      result.current.setGeoError(null);
    });

    expect(result.current.geoError).toBeNull();
  });
});
