// Pollution-Control-Hub/src/components/MicroclimateDashboard.jsx

import React, { useState, useEffect } from 'react';
import { fetchMicroclimateTelemetry } from '../services/microclimateTelemetryService';

export default function MicroclimateDashboard() {
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        let isMounted = true;
        fetchMicroclimateTelemetry().then(data => {
            if (isMounted) {
                setTelemetry(data);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return <div className="p-6 text-center text-gray-600">Loading Urban Microclimate & Heat Island Engine...</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto bg-slate-50 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Urban Microclimate & Heat Island Mitigation Engine</h1>
                    <p className="text-sm text-slate-500">Real-time thermal anomaly tracking, albedo index auditing, and cool-roof planning.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        UHI Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('sensors')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'sensors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        Sensor Network
                    </button>
                    <button 
                        onClick={() => setActiveTab('mitigation')} 
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'mitigation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                        Mitigation Models
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Surface Temperature</div>
                        <div className="text-2xl font-ext500 font-bold text-red-600">{telemetry.metrics.avgSurfaceTempCelsius}°C</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">UHI Intensity Delta</div>
                        <div className="text-2xl font-ext500 font-bold text-amber-600">+{telemetry.metrics.urbanHeatIslandDelta}°C</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Average Albedo Index</div>
                        <div className="text-2xl font-ext500 font-bold text-slate-800">{telemetry.metrics.averageAlbedoIndex}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Green Canopy Cover</div>
                        <div className="text-2xl font-ext500 font-bold text-emerald-600">{telemetry.metrics.greenCanopyCoveragePercent}%</div>
                    </div>
                </div>
            )}

            {activeTab === 'sensors' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {telemetry.sensorNodes.map(node => (
                        <div key={node.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">{node.id}</span>
                                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">{node.status}</span>
                            </div>
                            <div className="text-xs text-slate-500">Zone: {node.location}</div>
                            <div className="text-sm font-semibold text-red-600">Surface Temp: {node.tempC}°C</div>
                            <div className="text-xs text-slate-400">Albedo: {node.albedo}</div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'mitigation' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Predictive Cool-Roof & Urban Forestry Interventions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {telemetry.mitigationRecommendations.map((rec, index) => (
                            <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">{rec.intervention}</span>
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{rec.feasibility} Feasibility</span>
                                </div>
                                <div className="text-xs text-slate-500">Target Area: {rec.targetAreaSqM.toLocaleString()} m²</div>
                                <div className="text-sm font-semibold text-emerald-600">Projected Drop: {rec.projectedTempDropC}°C</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
