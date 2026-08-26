// Pollution-Control-Hub/src/components/StubbleTelemetryDashboard.jsx

import React, { useState, useEffect } from 'react';
import { fetchStubbleTelemetryData } from '../services/stubbleTelemetryService';

export default function StubbleTelemetryDashboard() {
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('hotspots');

    useEffect(() => {
        let isMounted = true;
        fetchStubbleTelemetryData().then(data => {
            if (isMounted) {
                setTelemetry(data);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return <div className="p-6 text-center text-gray-600">Loading Stubble Smoke & Thermal Telemetry Engine...</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto bg-slate-50 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Crop Residue Burning & Stubble Smoke Engine</h1>
                    <p className="text-sm text-slate-500">Real-time thermal anomaly tracking, smoke dispersion, and bio-decomposer dispatch control.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('hotspots')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'hotspots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        Thermal Hotspots
                    </button>
                    <button 
                        onClick={() => setActiveTab('trajectory')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'trajectory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        Plume Vectors
                    </button>
                    <button 
                        onClick={() => setActiveTab('fleet')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'fleet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        Decomposer Fleet
                    </button>
                </div>
            </div>

            {activeTab === 'hotspots' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {telemetry.activeHotspots.map(hs => (
                        <div key={hs.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">{hs.id}</span>
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{hs.confidence} Confidence</span>
                            </div>
                            <div className="text-xs text-slate-500">Coordinates: {hs.lat}°N, {hs.lon}°E</div>
                            <div className="text-sm font-semibold text-amber-600">Radiative Power: {hs.intensityMW} MW</div>
                            <div className="text-xs text-slate-400 pt-2 border-t">Detected: {hs.timestamp}</div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'trajectory' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Smoke Dispersion & Impact Vector</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-500">Wind Vector</div>
                            <div className="text-xl font-bold text-slate-800">{telemetry.plumeTrajectory.direction} ({telemetry.plumeTrajectory.windSpeedKmph} km/h)</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-500">Impact Radius</div>
                            <div className="text-xl font-bold text-slate-800">{telemetry.plumeTrajectory.affectedRadiusKm} km</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                            <div className="text-xs text-slate-500">Predicted Downwind AQI Surge</div>
                            <div className="text-xl font-bold text-red-600">+{telemetry.plumeTrajectory.predictedAqiSpike} AQI Points</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fleet' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Bio-Decomposer Machine Dispatch & Incentive Hub</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 text-blue-900 rounded-lg">
                            <div className="text-xs font-medium">Total Fleet</div>
                            <div className="text-2xl font-ext500 font-bold">{telemetry.bioDecomposerFleet.totalUnits}</div>
                        </div>
                        <div className="p-4 bg-emerald-50 text-emerald-900 rounded-lg">
                            <div className="text-xs font-medium">Active Deployed Units</div>
                            <div className="text-2xl font-ext500 font-bold">{telemetry.bioDecomposerFleet.deployedUnits}</div>
                        </div>
                        <div className="p-4 bg-amber-50 text-amber-900 rounded-lg">
                            <div className="text-xs font-medium">Pending Incentive Claims</div>
                            <div className="text-2xl font-ext500 font-bold">{telemetry.bioDecomposerFleet.incentiveClaimsPending}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
