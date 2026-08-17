import { useEffect, useRef, useState, useCallback } from "react";
import { fetchLocalGrid } from "../services/airQualityService";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8081";
const POLL_INTERVAL_MS = 30000;

/**
 * Provides a live-updating array of { lat, lon, aqi } heat points for the map.
 * Prefers a WebSocket connection to the heat-map broadcast server (server/heatmap-ws-server.js);
 * if the browser lacks WebSocket support, or the connection fails/closes, falls back to
 * periodic REST polling of the existing grid-fetch service so the heatmap still updates.
 *
 * @param {number} lat - Map center latitude, used for the polling fallback.
 * @param {number} lon - Map center longitude, used for the polling fallback.
 * @returns {{ points: Array<{lat: number, lon: number, aqi: number}>, source: 'websocket'|'polling'|'connecting' }}
 */
export function useLiveHeatmap(lat, lon) {
    const [points, setPoints] = useState([]);
    const [source, setSource] = useState("connecting");
    const socketRef = useRef(null);
    const pollTimerRef = useRef(null);

    const startPolling = useCallback(() => {
        setSource("polling");
        const poll = async () => {
            try {
                const grid = await fetchLocalGrid(lat, lon, 6);
                setPoints(grid.map((p) => ({ lat: p.lat, lon: p.lon, aqi: p.aqi })));
            } catch {
                // Keep the last known points on a failed poll.
            }
        };
        poll();
        pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }, [lat, lon]);

    useEffect(() => {
        if (!lat || !lon) return undefined;

        if (typeof window === "undefined" || !("WebSocket" in window)) {
            startPolling();
            return () => clearInterval(pollTimerRef.current);
        }

        let socket;
        try {
            socket = new WebSocket(WS_URL);
            socketRef.current = socket;
        } catch {
            startPolling();
            return () => clearInterval(pollTimerRef.current);
        }

        socket.onopen = () => {
            setSource("websocket");
        };

        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload?.type === "heatmap-update" && Array.isArray(payload.points)) {
                    setPoints(payload.points);
                }
            } catch {
                // Ignore malformed messages.
            }
        };

        socket.onerror = () => {
            socket.close();
        };

        socket.onclose = () => {
            // Only fall back if this effect instance still owns the socket
            // (avoids double-starting polling after a deliberate cleanup).
            if (socketRef.current === socket) {
                startPolling();
            }
        };

        return () => {
            socketRef.current = null;
            socket.close();
            clearInterval(pollTimerRef.current);
        };
    }, [lat, lon, startPolling]);

    return { points, source };
}