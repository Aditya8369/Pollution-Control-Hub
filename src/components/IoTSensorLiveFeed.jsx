import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRecentTelemetry, fetchSensorStatuses } from '../services/iotDashboardService';

/** How often the sensor list is re-read. */
export const SENSOR_POLL_MS = 10000;

/** How often the selected sensor's telemetry is re-read. */
export const TELEMETRY_POLL_MS = 5000;

/**
 * Decides which sensor should be selected after a refresh of the sensor list.
 *
 * The rule is "leave the user's choice alone", with one exception: a sensor that has
 * disappeared from the list cannot stay selected, or the telemetry panel sits on a
 * sensor that no longer exists.
 *
 * This is a plain function because the bug it replaces was a closure problem, and a
 * closure problem is much easier to argue about once the decision has no closure in it.
 * The old code read `selectedSensor` from a closure captured on the first render — where
 * it was still `null` — inside an interval that was never recreated. `!selectedSensor`
 * was therefore true on every tick, and every tick reset the selection to `sensors[0]`.
 *
 * @param {string|null} current - The currently selected sensor id.
 * @param {Array<{id: string}>} sensors - The freshly fetched sensor list.
 * @returns {string|null} The id to select.
 */
export function resolveSelection(current, sensors) {
    const list = Array.isArray(sensors) ? sensors : [];
    if (current && list.some((sensor) => sensor?.id === current)) return current;
    return list[0]?.id ?? null;
}

/**
 * @component IoTSensorLiveFeed
 * @description Real-time dashboard component visualizing live sensor data streams and connection status.
 */
const IoTSensorLiveFeed = () => {
    const [sensors, setSensors] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [telemetry, setTelemetry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadSensors = useCallback(async () => {
        try {
            const data = await fetchSensorStatuses();
            if (!mountedRef.current) return;

            const list = Array.isArray(data) ? data : [];
            setSensors(list);
            // A functional update, so this never reads a stale `selectedSensor` — which
            // is the whole bug. It also needs no dependency on the current selection,
            // so the interval below can keep one stable callback.
            setSelectedSensor((current) => resolveSelection(current, list));
            setConnectionStatus('connected');
            // A poll that works ends the previous failure. Without this the error
            // latched and replaced the dashboard for the life of the page, while the
            // interval carried on succeeding behind it.
            setError(null);
        } catch {
            if (!mountedRef.current) return;
            setError('Failed to connect to IoT gateway.');
            setConnectionStatus('disconnected');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSensors();
        const interval = setInterval(loadSensors, SENSOR_POLL_MS);
        return () => clearInterval(interval);
    }, [loadSensors]);

    useEffect(() => {
        if (!selectedSensor) {
            setTelemetry([]);
            return undefined;
        }

        let cancelled = false;
        const loadTelemetry = async () => {
            try {
                const data = await fetchRecentTelemetry(selectedSensor, 10);
                // Without this guard a slow response for the previously selected sensor
                // can land after the user has switched, and paint the wrong readings.
                if (!cancelled && mountedRef.current) setTelemetry(Array.isArray(data) ? data : []);
            } catch {
                // Telemetry is secondary to the sensor list: a gap here leaves the last
                // readings on screen rather than taking the dashboard down.
                if (!cancelled && mountedRef.current) setConnectionStatus('degraded');
            }
        };
        loadTelemetry();
        const interval = setInterval(loadTelemetry, TELEMETRY_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [selectedSensor]);

    if (loading) return <div className="p-8 text-center text-gray-500" data-testid="iot-loading">Connecting to IoT Gateway...</div>;

    // Only a failure with nothing behind it takes the page. Once there are sensors on
    // screen, a dropped poll is a status pill and a banner — the feed keeps working.
    if (error && sensors.length === 0) {
        return (
            <div className="p-8 text-center" data-testid="iot-error">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={loadSensors}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    const activeSensor = sensors.find(s => s.id === selectedSensor);
    const statusColour = connectionStatus === 'connected'
        ? 'bg-green-500'
        : connectionStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live IoT Sensor Feed</h2>
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${statusColour}`} data-testid="connection-dot"></span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize" data-testid="connection-status">{connectionStatus}</span>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    data-testid="iot-error-banner"
                    className="mb-6 flex items-center justify-between gap-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300"
                >
                    <span className="text-sm">{error} Showing the last known readings.</span>
                    <button onClick={loadSensors} className="text-sm font-semibold underline whitespace-nowrap">
                        Retry
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sensor List Sidebar */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Available Sensors</h3>
                    <div className="space-y-2">
                        {sensors.map(sensor => (
                            <button
                                key={sensor.id}
                                onClick={() => setSelectedSensor(sensor.id)}
                                aria-pressed={selectedSensor === sensor.id}
                                data-testid={`sensor-option-${sensor.id}`}
                                className={`w-full text-left p-3 rounded-md transition-colors ${selectedSensor === sensor.id
                                        ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <div className="font-medium text-gray-900 dark:text-white">{sensor.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Last seen: {sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleTimeString() : 'Never'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Live Telemetry Display */}
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    {activeSensor ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="active-sensor-name">{activeSensor.name} Telemetry</h3>
                                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-bold rounded-full">
                                    ACTIVE
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {telemetry.length > 0 ? (
                                    <>
                                        <MetricCard label="PM2.5" value={telemetry[0].pm25} unit="µg/m³" color="text-orange-500" />
                                        <MetricCard label="PM10" value={telemetry[0].pm10} unit="µg/m³" color="text-red-500" />
                                        <MetricCard label="Temperature" value={telemetry[0].temperature} unit="°C" color="text-blue-500" />
                                        <MetricCard label="Humidity" value={telemetry[0].humidity} unit="%" color="text-cyan-500" />
                                    </>
                                ) : (
                                    <div className="col-span-4 text-center py-8 text-gray-500">Waiting for data...</div>
                                )}
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Recent History</h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-400">
                                        <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-2">Timestamp</th>
                                                <th className="px-4 py-2">PM2.5</th>
                                                <th className="px-4 py-2">PM10</th>
                                                <th className="px-4 py-2">Temp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetry.slice(1, 6).map((row, idx) => (
                                                <tr key={idx} className="border-b dark:border-gray-700">
                                                    <td className="px-4 py-2">{new Date(row.timestamp).toLocaleTimeString()}</td>
                                                    <td className="px-4 py-2">{row.pm25 ?? 'N/A'}</td>
                                                    <td className="px-4 py-2">{row.pm10 ?? 'N/A'}</td>
                                                    <td className="px-4 py-2">{row.temperature ?? 'N/A'}°C</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-500">Select a sensor to view live data.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, unit, color }) => (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>
            {value !== null && value !== undefined ? value : '--'}
        </div>
        <div className="text-xs text-gray-400">{unit}</div>
    </div>
);

export default IoTSensorLiveFeed;
