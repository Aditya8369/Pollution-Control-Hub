import { useState, useEffect, useCallback, useRef } from "react";
import { getConnector } from "../services/deviceConnectors";

const DEVICE_CONFIG_KEY = "indoor-device-config";
const POLL_INTERVAL_MS = 60000;

function readDeviceConfig() {
    try {
        const raw = localStorage.getItem(DEVICE_CONFIG_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.connectorId || !parsed?.config) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Manages a connected indoor air quality device: persists which connector +
 * config the user chose, polls it on an interval, and exposes the latest
 * partial reading (only the fields that connector actually supplies).
 *
 * @returns {{
 *   deviceConfig: {connectorId: string, config: object} | null,
 *   deviceReading: object | null,
 *   error: string | null,
 *   isFetching: boolean,
 *   lastSyncedAt: string | null,
 *   connectDevice: (connectorId: string, config: object) => void,
 *   disconnectDevice: () => void
 * }}
 */
export function useDeviceReading() {
    const [deviceConfig, setDeviceConfig] = useState(() => readDeviceConfig());
    const [deviceReading, setDeviceReading] = useState(null);
    const [error, setError] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const pollTimerRef = useRef(null);

    const poll = useCallback(async (activeConfig) => {
        const connector = getConnector(activeConfig.connectorId);
        if (!connector) return;

        setIsFetching(true);
        try {
            const reading = await connector.fetchReading(activeConfig.config);
            setDeviceReading(reading);
            setLastSyncedAt(new Date().toISOString());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch device reading.");
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        clearInterval(pollTimerRef.current);
        if (!deviceConfig) return undefined;

        poll(deviceConfig);
        pollTimerRef.current = setInterval(() => poll(deviceConfig), POLL_INTERVAL_MS);

        return () => clearInterval(pollTimerRef.current);
    }, [deviceConfig, poll]);

    const connectDevice = useCallback((connectorId, config) => {
        const next = { connectorId, config };
        setDeviceConfig(next);
        setError(null);
        try {
            localStorage.setItem(DEVICE_CONFIG_KEY, JSON.stringify(next));
        } catch {
            // ignore storage error
        }
    }, []);

    const disconnectDevice = useCallback(() => {
        setDeviceConfig(null);
        setDeviceReading(null);
        setError(null);
        setLastSyncedAt(null);
        try {
            localStorage.removeItem(DEVICE_CONFIG_KEY);
        } catch {
            // ignore storage error
        }
    }, []);

    return { deviceConfig, deviceReading, error, isFetching, lastSyncedAt, connectDevice, disconnectDevice };
}