import React, { useState, useEffect } from 'react';
import { fetchAqiForecast } from '../services/forecastAttributionService';

/**
 * @component AqiForecastAttribution
 * @description UI component displaying 24-hour AQI forecasts and source attribution pie charts.
 */
const AqiForecastAttribution = () => {
    const [forecastData, setForecastData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    // Default coordinates (e.g., Delhi)
    const lat = 28.6139;
    const lng = 77.2090;

    useEffect(() => {
        const loadForecast = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAqiForecast(lat, lng, 3);
                setForecastData(data);
            } catch (err) {
                setError(err.message || 'Failed to load forecast data.');
            } finally {
                setLoading(false);
            }
        };
        loadForecast();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing pollution trends...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                <p className="font-semibold">Error Loading Forecast</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (!forecastData || !forecastData.forecasts.length) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No forecast data available for this location.
            </div>
        );
    }

    const currentForecast = forecastData.forecasts[selectedDayIndex];
    const maxPercentage = Math.max(...currentForecast.attributions.map(a => a.percentage), 1);

    const getSourceColor = (source) => {
        const colors = {
            VEHICULAR: 'bg-blue-500',
            INDUSTRIAL: 'bg-purple-500',
            BIOMASS: 'bg-orange-500',
            CONSTRUCTION: 'bg-yellow-500',
            NATURAL: 'bg-green-500',
        };
        return colors[source] || 'bg-gray-500';
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Pollution Forecast & Attribution</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Location: {forecastData.location} | Model: {forecastData.modelVersion}
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {forecastData.forecasts.map((day, idx) => (
                        <button
                            key={day.date}
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedDayIndex === idx
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forecast Summary Card */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Summary</h3>
                    <div className="flex items-center justify-center mb-6">
                        <div className="text-center">
                            <div className={`text-5xl font-bold ${currentForecast.avgAqi > 150 ? 'text-red-600' :
                                    currentForecast.avgAqi > 100 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                {currentForecast.avgAqi}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average AQI</div>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Range:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{currentForecast.minAqi} - {currentForecast.maxAqi}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{currentForecast.confidenceScore}%</span>
                        </div>
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Health Advisory</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{currentForecast.healthAdvisory}</p>
                    </div>
                </div>

                {/* Source Attribution Card */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Probable Pollution Sources</h3>
                    <div className="space-y-5">
                        {currentForecast.attributions.map((attr) => (
                            <div key={attr.source} className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${getSourceColor(attr.source)}`}></span>
                                        {attr.source.replace('_', ' ')}
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white">{attr.percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full ${getSourceColor(attr.source)} transition-all duration-1000 ease-out`}
                                        style={{ width: `${(attr.percentage / maxPercentage) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {attr.indicators.map((indicator, idx) => (
                                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                            {indicator}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly Breakdown Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">24-Hour Trend Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AQI Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dominant Pollutant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentForecast.hourlyBreakdown.map((hour, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{hour.hour}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {hour.aqiMin} - {hour.aqiMax}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-semibold">
                                            {hour.dominantPollutant}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {idx > 0 && hour.aqiMax > currentForecast.hourlyBreakdown[idx - 1].aqiMax ? (
                                            <span className="text-red-600 flex items-center gap-1">↑ Rising</span>
                                        ) : (
                                            <span className="text-green-600 flex items-center gap-1">↓ Falling</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AqiForecastAttribution;
