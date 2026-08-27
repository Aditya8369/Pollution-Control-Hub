// src/components/RoutePollutionCard.tsx

import React from 'react';
import { Route, Segment } from '../types/pollutionTypes';

interface RoutePollutionCardProps {
    route: Route;
    onSelectRoute: (routeId: string) => void;
    isFavorite?: boolean;
}

export default function RoutePollutionCard({ route, onSelectRoute, isFavorite = false }: RoutePollutionCardProps) {
    const getRiskBadgeColor = (risk: Route['riskLevel']) => {
        switch (risk) {
            case 'Low': return 'bg-green-100 text-green-800 border-green-300';
            case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'Severe': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {route.routeName}
                        {isFavorite && <span className="text-amber-500 text-sm">★</span>}
                    </h3>
                    <p className="text-xs text-gray-500">Total Distance: {route.totalDistanceKm} km</p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getRiskBadgeColor(route.riskLevel)}`}>
                    {route.riskLevel} Risk (AQI: {route.averageAqi})
                </span>
            </div>

            <div className="space-y-2 mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Route Segments</h4>
                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {route.segments.map((segment: Segment) => (
                        <div key={segment.id} className="py-2 flex justify-between items-center text-sm">
                            <span className="text-gray-700">{segment.startPoint} → {segment.endPoint}</span>
                            <span className="font-medium text-gray-900">AQI: {segment.aqi} ({segment.pollutantMain})</span>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => onSelectRoute(route.id)}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
                View Detailed Analysis
            </button>
        </div>
    );
}
