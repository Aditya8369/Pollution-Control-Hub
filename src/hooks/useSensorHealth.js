import { useState, useEffect, useCallback } from 'react';
import { fetchHealthMetrics, acknowledgeAlert } from '../services/sensorMaintenanceService';

/**
 * @hook useSensorHealth
 * @description Custom React hook for managing sensor health state and real-time alert subscriptions.
 */
export const useSensorHealth = (sensorId) => {
    const [metrics, setMetrics] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchHealthMetrics(sensorId);
            setMetrics(data.healthScore);
            setAlerts(data.alerts);
        } catch (err) {
            setError('Failed to load sensor health data');
        } finally {
            setLoading(false);
        }
    }, [sensorId]);

    const handleAcknowledge = async (alertId, notes = '') => {
        try {
            await acknowledgeAlert(alertId, notes);
            // Optimistic update
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true, resolutionNotes: notes } : alert
            ));
            if (metrics) {
                setMetrics(prev => ({ ...prev, healthScore: Math.min(100, prev.healthScore + 10) }));
            }
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
            alert('Failed to acknowledge alert');
        }
    };

    useEffect(() => {
        if (sensorId) {
            loadData();
            // Poll every 30 seconds for updates
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [sensorId, loadData]);

    return { metrics, alerts, loading, error, refetch: loadData, acknowledgeAlert: handleAcknowledge };
};
