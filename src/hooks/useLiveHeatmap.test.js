import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLiveHeatmap } from './useLiveHeatmap';

describe('useLiveHeatmap WebSocket Lifecycle', () => {
    let MockWebSocket;
    let mockSocketInstances;

    beforeEach(() => {
        mockSocketInstances = [];
        
        MockWebSocket = vi.fn(() => {
            const instance = {
                close: vi.fn(),
                onopen: null,
                onmessage: null,
                onerror: null,
                onclose: null,
                readyState: 0 // CONNECTING
            };
            // Simulate that calling close changes readyState to CLOSED
            instance.close.mockImplementation(() => {
                instance.readyState = 3; // CLOSED
            });
            mockSocketInstances.push(instance);
            return instance;
        });
        vi.stubGlobal('WebSocket', MockWebSocket);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('registers listeners on mount', () => {
        renderHook(() => useLiveHeatmap(40, -70));

        expect(MockWebSocket).toHaveBeenCalledTimes(1);
        const socket = mockSocketInstances[0];
        
        expect(typeof socket.onopen).toBe('function');
        expect(typeof socket.onmessage).toBe('function');
        expect(typeof socket.onerror).toBe('function');
        expect(typeof socket.onclose).toBe('function');
    });

    it('cleans up WebSocket listeners and closes the socket on unmount', () => {
        const { unmount } = renderHook(() => useLiveHeatmap(40, -70));
        const socket = mockSocketInstances[0];

        unmount();

        expect(socket.onopen).toBeNull();
        expect(socket.onmessage).toBeNull();
        expect(socket.onerror).toBeNull();
        expect(socket.onclose).toBeNull();
        expect(socket.close).toHaveBeenCalledTimes(1);
    });

    it('cleans up when effect dependencies change', () => {
        const { rerender } = renderHook(({ lat, lon }) => useLiveHeatmap(lat, lon), {
            initialProps: { lat: 40, lon: -70 }
        });
        
        const firstSocket = mockSocketInstances[0];

        // Change dependencies (lat/lon)
        rerender({ lat: 41, lon: -71 });

        // The first socket should have been cleaned up
        expect(firstSocket.onopen).toBeNull();
        expect(firstSocket.onclose).toBeNull();
        expect(firstSocket.close).toHaveBeenCalledTimes(1);

        // A new socket should have been created
        expect(MockWebSocket).toHaveBeenCalledTimes(2);
        const secondSocket = mockSocketInstances[1];
        expect(typeof secondSocket.onopen).toBe('function');
        expect(typeof secondSocket.onclose).toBe('function');
    });

    it('handles repeated mount/unmount cycles without accumulating listeners', () => {
        for (let i = 0; i < 5; i++) {
            const { unmount } = renderHook(() => useLiveHeatmap(40, -70));
            const socket = mockSocketInstances[i];
            
            // Check listeners are registered
            expect(typeof socket.onopen).toBe('function');
            
            unmount();
            
            // Check listeners are removed
            expect(socket.onopen).toBeNull();
            expect(socket.close).toHaveBeenCalledTimes(1);
        }
        
        expect(MockWebSocket).toHaveBeenCalledTimes(5);
        expect(mockSocketInstances).toHaveLength(5);
        
        // Ensure ALL previous sockets were properly cleaned up
        mockSocketInstances.forEach(socket => {
            expect(socket.onopen).toBeNull();
            expect(socket.onmessage).toBeNull();
            expect(socket.onerror).toBeNull();
            expect(socket.onclose).toBeNull();
            expect(socket.close).toHaveBeenCalledTimes(1);
        });
    });

    it('is safe to cleanup even if socket is already closed', () => {
        const { unmount } = renderHook(() => useLiveHeatmap(40, -70));
        const socket = mockSocketInstances[0];

        // Manually close the socket before unmount
        socket.close();
        expect(socket.readyState).toBe(3); // CLOSED
        
        // This shouldn't throw or cause issues
        expect(() => unmount()).not.toThrow();
        
        // Cleanup still occurs
        expect(socket.onopen).toBeNull();
        expect(socket.onmessage).toBeNull();
        expect(socket.onerror).toBeNull();
        expect(socket.onclose).toBeNull();
        
        // close() should have been called twice (once manually, once by cleanup)
        expect(socket.close).toHaveBeenCalledTimes(2);
    });
});
