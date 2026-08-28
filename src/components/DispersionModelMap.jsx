import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { fetchDispersionData, triggerDispersionRun } from '../services/dispersionService';
import 'leaflet/dist/leaflet.css';

/**
 * @component DispersionModelMap
 * @description Interactive Leaflet map layer rendering Gaussian plume dispersion polygons and wind rose indicators.
 */
const DispersionModelMap = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [isComputing, setIsComputing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchDispersionData(selectedSourceId || undefined);
            setData(result);
            if (result.pointSources.length > 0 && !selectedSourceId) {
                setSelectedSourceId(result.pointSources[0].id);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCompute = async () => {
        if (!selectedSourceId) return;
        setIsComputing(true);
        try {
            await triggerDispersionRun(selectedSourceId);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsComputing(false);
        }
    };

    const getConcentrationColor = (concentration) => {
        if (concentration > 100) return '#ef4444'; // Red
        if (concentration > 50) return '#f97316';  // Orange
        if (concentration > 20) return '#eab308';  // Yellow
        return '#22c55e';                          // Green
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading dispersion models...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    const activeSource = data?.pointSources.find(s => s.id === selectedSourceId);
    const activeRun = data?.activeRun;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pollutant Dispersion Modeling</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Visualize downstream impact of point sources using Gaussian plume models.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedSourceId}
                            onChange={(e) => setSelectedSourceId(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            {data?.pointSources.map(source => (
                                <option key={source.id} value={source.id}>{source.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleCompute}
                            disabled={isComputing || !selectedSourceId}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isComputing ? 'Computing...' : 'Run Model'}
                        </button>
                    </div>
                </div>

                {activeRun && activeSource && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Wind Speed</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{activeRun.windMetrics.speed} m/s</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Wind Direction</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{activeRun.windMetrics.directionCardinal} ({activeRun.windMetrics.direction}°)</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Max Concentration</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{activeRun.maxDownwindConcentration} µg/m³</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Distance to Max</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{activeRun.distanceToMaxConcentration} m</div>
                        </div>
                    </div>
                )}

                <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 z-0">
                    <MapContainer center={[28.6139, 77.2090]} zoom={13} className="h-full w-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Render Point Sources */}
                        {data?.pointSources.map(source => (
                            <CircleMarker
                                key={source.id}
                                center={[source.locationLat, source.locationLng]}
                                radius={8}
                                pathOptions={{
                                    color: source.id === selectedSourceId ? '#2563eb' : '#6b7280',
                                    fillColor: source.id === selectedSourceId ? '#3b82f6' : '#9ca3af',
                                    fillOpacity: 0.8,
                                }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-bold">{source.name}</p>
                                        <p className="text-gray-600">Type: {source.type}</p>
                                        <p className="text-gray-600">Emission Rate: {source.emissionRate} g/s</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}

                        {/* Render Plume Coordinates */}
                        {activeRun && activeRun.plumeCoordinates && activeRun.plumeCoordinates.length > 0 && (
                            <>
                                <Polyline
                                    positions={activeRun.plumeCoordinates.map(p => [p.lat, p.lng])}
                                    pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5' }}
                                />
                                {activeRun.plumeCoordinates.map((point, idx) => (
                                    <CircleMarker
                                        key={idx}
                                        center={[point.lat, point.lng]}
                                        radius={Math.max(3, point.concentration / 10)}
                                        pathOptions={{
                                            color: getConcentrationColor(point.concentration),
                                            fillColor: getConcentrationColor(point.concentration),
                                            fillOpacity: 0.6,
                                        }}
                                    >
                                        <Popup>
                                            <div className="text-sm">
                                                <p className="font-bold">Distance: {point.distanceFromSource} m</p>
                                                <p className="text-gray-600">Concentration: {point.concentration} µg/m³</p>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </>
                        )}
                    </MapContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Low (&lt;20 µg/m³)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Moderate (20-50 µg/m³)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">High (50-100 µg/m³)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Severe (&gt;100 µg/m³)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DispersionModelMap;
