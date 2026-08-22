import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation } from './useGeolocation';

describe('useGeolocation Hook', () => {
  const setOrigin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock navigator.geolocation
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
    };
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets origin to shortAddress on successful geocoding', async () => {
    const mockPosition = {
      coords: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
    };

    global.navigator.geolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success(mockPosition)
    );

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: 'Connaught Place, New Delhi, Delhi, India',
      }),
    });

    const { result } = renderHook(() => useGeolocation(setOrigin));

    await act(async () => {
      result.current.handleGetLocation();
    });

    expect(setOrigin).toHaveBeenCalledWith('Connaught Place, New Delhi, Delhi');
    expect(result.current.isLocating).toBe(false);
  });

  it('sets origin to "Location unavailable" on reverse geocoding fetch failure', async () => {
    const mockPosition = {
      coords: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
    };

    global.navigator.geolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success(mockPosition)
    );

    global.fetch.mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useGeolocation(setOrigin));

    await act(async () => {
      result.current.handleGetLocation();
    });

    expect(setOrigin).toHaveBeenCalledWith('Location unavailable');
    expect(result.current.geoError).toBe('Failed to fetch address details. Displaying placeholder.');
    expect(result.current.isLocating).toBe(false);
  });
});
