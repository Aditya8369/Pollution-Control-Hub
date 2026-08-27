import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { fetchMicroclimateData } from '../services/microclimateService';

/**
 * @component UhiHeatmapLayer
 * @description Custom React Leaflet layer component for rendering UHI temperature gradient overlays.
 */
const UhiHeatmapLayer = () => {
    const [gridData, setGridData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);

    // Default bounding box (e.g., central Delhi area)
    const bounds = { north: 28.7, south: 28.5, east: 77.3, west: 77.1 };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchMicroclimateData(bounds.north, bounds.south, bounds.east, bounds.west);
                setGridData(data.gridData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'SEVERE': return '#ef4444'; // red-500
            case 'HIGH': return '#f97316';   // orange-500
            case 'MODERATE': return '#eab308'; // yellow-500
            case 'LOW': return '#22c55e';    // green-500
            default: return '#9ca3af';       // gray-400
        }
    };

    const getHealthAdvisory = (severity, temp) => {
        if (severity === 'SEVERE' || severity === 'HIGH') {
            return `High UHI effect detected (${temp}°C). Stay hydrated, avoid prolonged sun exposure, and seek air-conditioned environments.`;
        }
        return `Moderate conditions (${temp}°C). Normal outdoor activities are generally safe.`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading microclimate grid...</span>
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

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Urban Heat Island (UHI) Mapping</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Visualizing hyperlocal temperature differentials to identify cooler and warmer zones.
                </p>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6">
                    {['LOW', 'MODERATE', 'HIGH', 'SEVERE'].map((severity) => (
                        <div key={severity} className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: getSeverityColor(severity) }}
                            ></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{severity}</span>
                        </div>
                    ))}
                </div>

                {/* Map Container */}
                <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 z-0">
                    <MapContainer center={[28.6, 77.2]} zoom={12} className="h-full w-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Render Grid Points as Circles */}
                        {gridData.map((point) => (
                            <Circle
                                key={point.id}
                                center={[point.coordinate.lat, point.coordinate.lng]}
                                radius={800} // 800 meters radius for overlap
                                pathOptions={{
                                    color: getSeverityColor(point.uhiSeverity),
                                    fillColor: getSeverityColor(point.uhiSeverity),
                                    fillOpacity: 0.4,
                                    weight: 1,
                                }}
                                eventHandlers={{
                                    click: () => setSelectedPoint(point),
                                }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-bold text-gray-900">Temp: {point.temperature}°C</p>
                                        <p className="text-gray-600">Humidity: {point.humidity}%</p>
                                        <p className="text-gray-600">Land Cover: {point.landCoverType}</p>
                                        <p className="mt-2 font-semibold" style={{ color: getSeverityColor(point.uhiSeverity) }}>
                                            UHI Severity: {point.uhiSeverity}
                                        </p>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}
                    </MapContainer>
                </div>
            </div>

            {/* Selected Point Details */}
            {selectedPoint && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">Microclimate Advisory</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="block text-blue-700 dark:text-blue-300 font-medium">Coordinates</span>
                            <span className="text-blue-900 dark:text-blue-100">
                                {selectedPoint.coordinate.lat}, {selectedPoint.coordinate.lng}
                            </span>
                        </div>
                        <div>
                            <span className="block text-blue-700 dark:text-blue-300 font-medium">Temperature</span>
                            <span className="text-blue-900 dark:text-blue-100">{selectedPoint.temperature}°C</span>
                        </div>
                        <div>
                            <span className="block text-blue-700 dark:text-blue-300 font-medium">Land Cover</span>
                            <span className="text-blue-900 dark:text-blue-100">{selectedPoint.landCoverType}</span>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-gray-800 dark:text-gray-200">
                            {getHealthAdvisory(selectedPoint.uhiSeverity, selectedPoint.temperature)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UhiHeatmapLayer;
