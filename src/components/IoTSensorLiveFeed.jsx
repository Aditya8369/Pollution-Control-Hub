import React, { useState, useEffect } from 'react';
import { fetchRecentTelemetry, fetchSensorStatuses } from '../services/iotDashboardService';

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

    useEffect(() => {
        const loadSensors = async () => {
            try {
                const data = await fetchSensorStatuses();
                setSensors(data);
                if (data.length > 0 && !selectedSensor) {
                    setSelectedSensor(data[0].id);
                }
                setConnectionStatus('connected');
            } catch (err) {
                setError('Failed to connect to IoT gateway.');
                setConnectionStatus('disconnected');
            } finally {
                setLoading(false);
            }
        };
        loadSensors();

        // Simulate real-time polling (replace with WebSocket in production)
        const interval = setInterval(loadSensors, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!selectedSensor) return;
        const loadTelemetry = async () => {
            try {
                const data = await fetchRecentTelemetry(selectedSensor, 10);
                setTelemetry(data);
            } catch (err) {
                console.error('Failed to fetch telemetry:', err);
            }
        };
        loadTelemetry();
        const interval = setInterval(loadTelemetry, 5000);
        return () => clearInterval(interval);
    }, [selectedSensor]);

    if (loading) return <div className="p-8 text-center text-gray-500">Connecting to IoT Gateway...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const activeSensor = sensors.find(s => s.id === selectedSensor);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live IoT Sensor Feed</h2>
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{connectionStatus}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sensor List Sidebar */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Available Sensors</h3>
                    <div className="space-y-2">
                        {sensors.map(sensor => (
                            <button
                                key={sensor.id}
                                onClick={() => setSelectedSensor(sensor.id)}
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
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeSensor.name} Telemetry</h3>
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
