import React, { useState, useEffect, useRef } from 'react';
import { fetch3DGrid } from '../services/topographyService';

/**
 * @component ThreeDPollutionMap
 * @description Custom React component utilizing CSS 3D transforms to render 3D extruded pollution heatmaps.
 */
const ThreeDPollutionMap = () => {
    const [gridData, setGridData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rotation, setRotation] = useState({ x: 60, z: -30 });
    const [selectedPoint, setSelectedPoint] = useState(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const bounds = { north: 28.7, south: 28.5, east: 77.3, west: 77.1 };

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetch3DGrid(bounds);
                setGridData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleMouseDown = (e) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;

        setRotation(prev => ({
            x: Math.max(10, Math.min(90, prev.x - dy * 0.5)),
            z: prev.z + dx * 0.5,
        }));

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const getAqiColor = (aqi) => {
        if (aqi > 200) return '#7f1d1d'; // Deep Red
        if (aqi > 150) return '#dc2626'; // Red
        if (aqi > 100) return '#f97316'; // Orange
        if (aqi > 50) return '#eab308';  // Yellow
        return '#22c55e';                 // Green
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (error) return <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;

    const gridSize = 10; // Assuming 11x11 grid (0 to 10)
    const cellSize = 40; // pixels

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">3D Urban Pollution Topography</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Visualize pollution concentration peaks and valleys across urban elevations. Click and drag to rotate.
                </p>

                {/* 3D Legend */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {[
                        { label: 'Good (0-50)', color: '#22c55e' },
                        { label: 'Moderate (51-100)', color: '#eab308' },
                        { label: 'Unhealthy for Sensitive (101-150)', color: '#f97316' },
                        { label: 'Unhealthy (151-200)', color: '#dc2626' },
                        { label: 'Hazardous (201+)', color: '#7f1d1d' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* 3D Viewport */}
                <div
                    ref={containerRef}
                    className="relative w-full h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-gray-200 dark:border-gray-700"
                    style={{ perspective: '1200px' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div
                        className="absolute top-1/2 left-1/2 transition-transform duration-100 ease-out"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: `rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg)`,
                        }}
                    >
                        {gridData?.gridData.map((point, idx) => {
                            // Calculate grid position
                            const row = Math.floor(idx / (gridSize + 1));
                            const col = idx % (gridSize + 1);

                            const x = (col - gridSize / 2) * cellSize;
                            const y = (row - gridSize / 2) * cellSize;

                            // Extrusion height based on AQI (max 200px)
                            const height = Math.min(200, (point.aqiValue / 300) * 200);
                            const color = getAqiColor(point.aqiValue);

                            return (
                                <div
                                    key={idx}
                                    className="absolute group"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: `translate3d(${x}px, ${y}px, 0)`,
                                        width: `${cellSize}px`,
                                        height: `${cellSize}px`,
                                    }}
                                    onClick={() => setSelectedPoint(point)}
                                >
                                    {/* Base floor tile */}
                                    <div
                                        className="absolute inset-0 bg-gray-300 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 opacity-50"
                                        style={{ transform: 'translateZ(0px)' }}
                                    ></div>

                                    {/* Extruded pillar */}
                                    <div
                                        className="absolute inset-2 transition-all duration-300 group-hover:opacity-80 cursor-pointer"
                                        style={{
                                            transform: `translateZ(${height / 2}px)`,
                                            height: `${height}px`,
                                            backgroundColor: color,
                                            boxShadow: `0 0 10px ${color}40`,
                                        }}
                                    >
                                        {/* Top face */}
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                backgroundColor: color,
                                                transform: 'translateZ(0px)',
                                                borderTop: `2px solid ${color}`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Point Details */}
                {selectedPoint && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Grid Point Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="block text-blue-700 dark:text-blue-300 font-medium">Coordinates</span>
                                <span className="text-blue-900 dark:text-blue-100">{selectedPoint.lat}, {selectedPoint.lng}</span>
                            </div>
                            <div>
                                <span className="block text-blue-700 dark:text-blue-300 font-medium">Elevation</span>
                                <span className="text-blue-900 dark:text-blue-100">{selectedPoint.elevation} m</span>
                            </div>
                            <div>
                                <span className="block text-blue-700 dark:text-blue-300 font-medium">AQI Value</span>
                                <span className="text-blue-900 dark:text-blue-100 font-bold">{selectedPoint.aqiValue}</span>
                            </div>
                            <div>
                                <span className="block text-blue-700 dark:text-blue-300 font-medium">Dominant Pollutant</span>
                                <span className="text-blue-900 dark:text-blue-100">{selectedPoint.dominantPollutant}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThreeDPollutionMap;
