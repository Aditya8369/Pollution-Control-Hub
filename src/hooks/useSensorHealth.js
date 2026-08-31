import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHealthMetrics, acknowledgeAlert } from '../services/sensorMaintenanceService';

/**
 * How often the dashboard re-reads a sensor's health record.
 *
 * Kept here rather than inline so the refresh cadence and the "don't unmount on a
 * refresh" rule below are read together — they only make sense as a pair.
 */
export const POLL_INTERVAL_MS = 30000;

/**
 * @typedef {Object} SensorHealthMetrics
 * @property {string} [sensorId]
 * @property {number|null} [healthScore] - 0-100, from `sensor_health_scores.health_score`.
 * @property {number|null} [uptimePercentage] - From `sensor_health_scores.uptime_percentage`.
 * @property {string} [lastEvaluated]
 */

/**
 * Sensor health state for one sensor, refreshed on an interval.
 *
 * Two distinctions this hook exists to keep straight:
 *
 * - **First load vs. refresh.** `loading` is true only while there is nothing to show.
 *   A background poll sets `refreshing` instead. The dashboard early-returns on
 *   `loading`, so a poll that set it would unmount the whole page every 30 seconds —
 *   including the acknowledgment modal and the resolution notes being typed into it.
 *
 * - **A failed poll vs. a failed load.** `error` is cleared by the next successful
 *   read. It used to latch, so a single dropped request pinned the dashboard to a red
 *   error message for the life of the page while the interval carried on succeeding
 *   invisibly behind it.
 *
 * @param {string} sensorId
 */
export const useSensorHealth = (sensorId) => {
    const [metrics, setMetrics] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Guards against two races that both produce a wrong screen: a response arriving
    // after the component has gone away, and a slow response for sensor A landing
    // after the user has already switched to sensor B.
    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // A new sensor means the data on screen belongs to the previous one, so this is a
    // first load again rather than a refresh.
    useEffect(() => {
        hasLoadedRef.current = false;
        setMetrics(null);
        setAlerts([]);
        setLoading(true);
    }, [sensorId]);

    const loadData = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        if (hasLoadedRef.current) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await fetchHealthMetrics(sensorId);
            if (!mountedRef.current || requestId !== requestIdRef.current) return;

            setMetrics(data?.healthScore ?? null);
            setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
            // A refresh that works is the end of the previous failure, not a state to
            // be shown alongside fresh data.
            setError(null);
            hasLoadedRef.current = true;
        } catch {
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            setError('Failed to load sensor health data');
        } finally {
            if (mountedRef.current && requestId === requestIdRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [sensorId]);

    /**
     * Acknowledges an alert and re-reads the health record.
     *
     * It deliberately does not adjust `healthScore` locally. Acknowledging records that
     * a human has seen an alert; it does not repair the sensor, and the previous
     * optimistic `+10` claimed a recovery the server had never agreed to — then let the
     * next poll silently take it back.
     *
     * @param {string} alertId
     * @param {string} [notes]
     * @returns {Promise<boolean>} Whether the acknowledgment was accepted.
     */
    const handleAcknowledge = useCallback(async (alertId, notes = '') => {
        try {
            await acknowledgeAlert(alertId, notes);
            if (!mountedRef.current) return true;

            // The alert row flips immediately — that part the client does know.
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true, resolutionNotes: notes } : alert
            ));
            setError(null);
            await loadData();
            return true;
        } catch {
            if (mountedRef.current) setError('Failed to acknowledge alert');
            return false;
        }
    }, [loadData]);

    useEffect(() => {
        if (!sensorId) return undefined;
        loadData();
        const interval = setInterval(loadData, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [sensorId, loadData]);

    return {
        metrics,
        alerts,
        loading,
        refreshing,
        error,
        dismissError: useCallback(() => setError(null), []),
        refetch: loadData,
        acknowledgeAlert: handleAcknowledge,
    };
};
