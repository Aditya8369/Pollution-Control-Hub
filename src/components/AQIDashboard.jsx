// Pollution-Control-Hub/src/components/AQIDashboard.jsx

import React, { useState, useEffect } from 'react';

// Helper function to calculate relative time
const getRelativeTimeString = (timestamp) => {
    if (!timestamp) return 'Never';
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);

    if (secondsAgo < 30) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
};

// Helper function for exact tooltip time
const getExactTimeString = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export default function AQIDashboard({ selectedLocation }) {
    const [aqiData, setAqiData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const [relativeTime, setRelativeTime] = useState('Just now');

    // Simulate fetching AQI data
    const fetchAQIData = async () => {
        try {
            // Simulated API call response
            const response = { aqi: 72, status: 'Moderate' };
            setAqiData(response);
            setLastUpdated(Date.now()); // Store successful update timestamp
            setFetchError(false);
        } catch (error) {
            setFetchError(true); // Retains lastSuccessful update time on failure
        }
    };

    useEffect(() => {
        fetchAQIData();
        const interval = setInterval(fetchAQIData, 300000); // 5 min interval
        return () => clearInterval(interval);
    }, [selectedLocation]);

    // Update relative time ticker every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            if (lastUpdated) {
                setRelativeTime(getRelativeTimeString(lastUpdated));
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [lastUpdated]);

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Current AQI</h2>
                {fetchError && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        ⚠️ Unable to refresh latest data
                    </span>
                )}
            </div>

            {aqiData ? (
                <div className="space-y-1">
                    <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-ext500 font-bold text-gray-900">{aqiData.aqi}</span>
                        <span className="text-lg font-medium text-gray-600">{aqiData.status}</span>
                    </div>

                    {/* Last Updated Timestamp Indicator */}
                    <div className="pt-2 text-xs text-gray-500">
                        <span title={getExactTimeString(lastUpdated)} className="cursor-help border-b border-dotted border-gray-400">
                            Last updated: {getRelativeTimeString(lastUpdated)}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-gray-500">Loading air quality data...</p>
            )}
        </div>
    );
}
