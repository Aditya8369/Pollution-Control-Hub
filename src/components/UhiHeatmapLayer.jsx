import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// `useMap` was imported here and never called — `npm run lint` reported it, and
// the lint job in ci.yml is a blocking step (#1074).
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import PropTypes from 'prop-types';
import { fetchMicroclimateData } from '../services/microclimateService';

/**
 * @component UhiHeatmapLayer
 * @description Custom React Leaflet layer component for rendering UHI temperature gradient overlays.
 */
/** Central Delhi, until this becomes a prop. */
const DEFAULT_BOUNDS = { north: 28.7, south: 28.5, east: 77.3, west: 77.1 };

/** The centre of a bounding box, for the map's initial view. */
function centreOf({ north, south, east, west }) {
    return [(north + south) / 2, (east + west) / 2];
}

const UhiHeatmapLayer = ({ bounds = DEFAULT_BOUNDS }) => {
    const [gridData, setGridData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);

    const { north, south, east, west } = bounds;
    // The map used to be centred on a hard-coded [28.6, 77.2] while the grid was
    // fetched for `bounds`, so the two would disagree the moment `bounds` moved.
    const centre = useMemo(() => centreOf({ north, south, east, west }), [north, south, east, west]);

    const loadSequence = useRef(0);

    const loadData = useCallback(async () => {
        const sequence = ++loadSequence.current;
        setLoading(true);
        try {
            const data = await fetchMicroclimateData(north, south, east, west);
            if (sequence !== loadSequence.current) return;
            // `setGridData(data.gridData)` stored `undefined` when the key was
            // absent, and `gridData.map` below then threw.
            setGridData(Array.isArray(data?.gridData) ? data.gridData : []);
            setError(null);
        } catch (err) {
            if (sequence !== loadSequence.current) return;
            setError(err?.message || 'Failed to fetch microclimate grid data.');
        } finally {
            if (sequence === loadSequence.current) setLoading(false);
        }
        // The primitive bounds rather than the object: a caller passing an object
        // literal would otherwise rebuild it every render and refetch on each one.
    }, [north, south, east, west]);

    useEffect(() => {
        loadData();
        return () => {
            loadSequence.current += 1;
        };
    }, [loadData]);

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
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading microclimate grid...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex flex-wrap items-center justify-between gap-3"
            >
                <span>{error}</span>
                {/*
                  `error` was set once and never cleared, and `loadData` ran only
                  on mount — so a failed load had no path back short of a page
                  reload.
                */}
                <button
                    type="button"
                    onClick={loadData}
                    className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-md font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                    Retry
                </button>
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

                {gridData.length === 0 && (
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        No grid readings were published for this area.
                    </p>
                )}

                {/* Map Container */}
                <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 z-0">
                    <MapContainer center={centre} zoom={12} className="h-full w-full">
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

UhiHeatmapLayer.propTypes = {
    bounds: PropTypes.shape({
        north: PropTypes.number.isRequired,
        south: PropTypes.number.isRequired,
        east: PropTypes.number.isRequired,
        west: PropTypes.number.isRequired,
    }),
};

export default UhiHeatmapLayer;
