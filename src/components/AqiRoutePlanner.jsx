import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { fetchRouteAlternatives } from '../services/routingService';
import 'leaflet/dist/leaflet.css';

/**
 * @component AqiRoutePlanner
 * @description UI component for inputting locations, viewing alternative routes on the map, and comparing exposure metrics.
 */
const AqiRoutePlanner = () => {
    const [start, setStart] = useState({ lat: 28.6139, lng: 77.2090 });
    const [end, setEnd] = useState({ lat: 28.7041, lng: 77.1025 });
    const [mode, setMode] = useState('PEDESTRIAN');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null);

    const handlePlanRoute = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await fetchRouteAlternatives({
                startLat: start.lat,
                startLng: start.lng,
                endLat: end.lat,
                endLng: end.lng,
                mode,
            });
            setResults(data);
            setSelectedRouteId(data.alternatives[0].id);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedRoute = results?.alternatives.find(r => r.id === selectedRouteId);

    const getExposureColor = (score) => {
        if (score < 5000) return 'text-green-600 dark:text-green-400';
        if (score < 7000) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Low-AQI Route Planner</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Find the cleanest air routes for your pedestrian or cycling journeys.
                </p>

                <form onSubmit={handlePlanRoute} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Location</label>
                        <input
                            type="text"
                            value={`${start.lat}, ${start.lng}`}
                            onChange={(e) => {
                                const [lat, lng] = e.target.value.split(',').map(Number);
                                setStart({ lat, lng });
                            }}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="Lat, Lng"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Location</label>
                        <input
                            type="text"
                            value={`${end.lat}, ${end.lng}`}
                            onChange={(e) => {
                                const [lat, lng] = e.target.value.split(',').map(Number);
                                setEnd({ lat, lng });
                            }}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="Lat, Lng"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Travel Mode</label>
                        <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                            <option value="PEDESTRIAN">Pedestrian</option>
                            <option value="CYCLING">Cycling</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Calculating...' : 'Find Clean Routes'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}
            </div>

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Route Comparison Table */}
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white">Route Alternatives</h3>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {results.alternatives.map(route => (
                                <button
                                    key={route.id}
                                    onClick={() => setSelectedRouteId(route.id)}
                                    className={`w-full text-left p-4 transition-colors ${selectedRouteId === route.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="font-semibold text-gray-900 dark:text-white mb-1">{route.name}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Distance:</span>
                                            <span>{(route.totalDistanceMeters / 1000).toFixed(1)} km</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Duration:</span>
                                            <span>~{route.estimatedDurationMinutes} min</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Avg AQI:</span>
                                            <span>{route.averageAqi}</span>
                                        </div>
                                        <div className="flex justify-between font-medium">
                                            <span>Exposure Score:</span>
                                            <span className={getExposureColor(route.totalAqiExposureScore)}>
                                                {route.totalAqiExposureScore}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map View */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="h-[500px] w-full z-0">
                            <MapContainer center={[start.lat, start.lng]} zoom={12} className="h-full w-full">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[start.lat, start.lng]}>
                                    <Popup>Start Location</Popup>
                                </Marker>
                                <Marker position={[end.lat, end.lng]}>
                                    <Popup>End Location</Popup>
                                </Marker>

                                {results.alternatives.map(route => (
                                    <Polyline
                                        key={route.id}
                                        positions={route.polyline}
                                        pathOptions={{
                                            color: selectedRouteId === route.id ? '#2563eb' : '#9ca3af',
                                            weight: selectedRouteId === route.id ? 5 : 3,
                                            opacity: selectedRouteId === route.id ? 0.9 : 0.5,
                                        }}
                                    />
                                ))}
                            </MapContainer>
                        </div>

                        {selectedRoute && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Selected Route Details</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    This route prioritizes areas with lower historical and real-time AQI readings.
                                    Average exposure is <span className="font-bold">{selectedRoute.averageAqi} AQI</span>,
                                    which is <span className="text-green-600 dark:text-green-400 font-bold">
                                        {Math.round(((results.alternatives[1].averageAqi - selectedRoute.averageAqi) / results.alternatives[1].averageAqi) * 100)}%
                                    </span> cleaner than the shortest distance alternative.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AqiRoutePlanner;
