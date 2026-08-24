// Pollution-Control-Hub/src/components/RouteNavigationModal.tsx

import React, { useState } from 'react';

export interface Segment {
    id: string;
    instruction: string;
    distanceMeters: number;
    aqiLevel: number;
}

export interface Route {
    id: string;
    name: string;
    totalDistanceKm: number;
    averageAqi: number;
    segments: Segment[];
}

export interface SavedLocation {
    id: string;
    name: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

export interface RouteNavigationModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableRoutes: Route[];
    savedLocations: SavedLocation[];
    onSelectRoute: (route: Route) => void;
}

export default function RouteNavigationModal({
    isOpen,
    onClose,
    availableRoutes,
    savedLocations,
    onSelectRoute,
}: RouteNavigationModalProps) {
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleRouteSelection = (route: Route): void => {
        setSelectedRouteId(route.id);
        onSelectRoute(route);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-xl">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold text-slate-900">Low-Pollution Route Navigation</h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                        &times;
                    </button>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700">Select Clean-Air Transit Route</h3>
                    {availableRoutes.length === 0 ? (
                        <p className="text-sm text-slate-500">No optimized routes available for selected destinations.</p>
                    ) : (
                        <div className="space-y-3">
                            {availableRoutes.map((route) => (
                                <div 
                                    key={route.id}
                                    onClick={() => handleRouteSelection(route)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedRouteId === route.id 
                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">{route.name}</span>
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                                            Avg AQI: {route.averageAqi}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        Distance: {route.totalDistanceKm} km | {route.segments.length} segments
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800">
                        Close Modal
                    </button>
                </div>
            </div>
        </div>
    );
}
