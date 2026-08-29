// Pollution-Control-Hub/src/components/MicroclimateDashboard.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMicroclimateTelemetry } from '../services/microclimateTelemetryService';

/**
 * The three panels, so the tab strip and the panels come from one list rather
 * than three hand-written buttons and three `activeTab === '...'` blocks that
 * have to be kept in agreement.
 */
const TABS = [
    { id: 'overview', label: 'UHI Overview' },
    { id: 'sensors', label: 'Sensor Network' },
    { id: 'mitigation', label: 'Mitigation Models' },
];

/**
 * A metric, or a dash when the payload did not carry one.
 *
 * Every headline number was rendered as `{telemetry.metrics.x}`, which puts
 * `undefined` on screen for a partial payload — and throws outright if
 * `metrics` itself is missing. A dash says "not reported", which is the true
 * thing to say.
 *
 * @param {unknown} value
 * @param {string} [suffix]
 * @param {string} [prefix]
 * @returns {string}
 */
function metric(value, suffix = '', prefix = '') {
    return typeof value === 'number' && Number.isFinite(value)
        ? `${prefix}${value}${suffix}`
        : '—';
}

/**
 * `1200000` as `1,200,000`, without throwing on a value that is not a number.
 *
 * `rec.targetAreaSqM.toLocaleString()` threw on a recommendation that arrived
 * without one.
 *
 * @param {unknown} value
 * @returns {string}
 */
function area(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

export default function MicroclimateDashboard() {
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Bumped by the effect cleanup and by each new load, so a response that
    // arrives after unmount — or after a retry has superseded it — writes
    // nothing. This replaces the `isMounted` boolean, which covered unmount but
    // not a second in-flight load.
    const loadSequence = useRef(0);

    const load = useCallback(async () => {
        const sequence = ++loadSequence.current;
        setLoading(true);
        try {
            const data = await fetchMicroclimateTelemetry();
            if (sequence !== loadSequence.current) return;
            setTelemetry(data);
            setError(null);
        } catch (err) {
            // There was no rejection handler at all. `setLoading(false)` lived
            // only in the fulfilment path, so a failed fetch left the spinner on
            // screen indefinitely — and the rejection went unhandled, which is
            // an `unhandledrejection` in the browser and somebody else's failing
            // test under Vitest (#1074).
            if (sequence !== loadSequence.current) return;
            setError(err?.message || 'Could not load microclimate telemetry.');
        } finally {
            if (sequence === loadSequence.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        return () => {
            loadSequence.current += 1;
        };
    }, [load]);

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-600" role="status" aria-live="polite">
                Loading Urban Microclimate &amp; Heat Island Engine...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-6xl mx-auto" role="alert">
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-wrap items-center justify-between gap-3">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={load}
                        className="px-3 py-1.5 border border-red-300 rounded-md font-medium hover:bg-red-100 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const metrics = telemetry?.metrics ?? {};
    const sensorNodes = Array.isArray(telemetry?.sensorNodes) ? telemetry.sensorNodes : [];
    const recommendations = Array.isArray(telemetry?.mitigationRecommendations)
        ? telemetry.mitigationRecommendations
        : [];

    return (
        <div className="p-6 max-w-6xl mx-auto bg-slate-50 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Urban Microclimate &amp; Heat Island Mitigation Engine</h1>
                    <p className="text-sm text-slate-500">Real-time thermal anomaly tracking, albedo index auditing, and cool-roof planning.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl" role="group" aria-label="Microclimate views">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            aria-pressed={activeTab === tab.id}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    {/*
                      `font-ext500` was on all four of these. It is not a Tailwind
                      utility and is not defined in src/styles — it generated
                      nothing, and `font-bold` beside it was doing the work.
                    */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Surface Temperature</div>
                        <div className="text-2xl font-bold text-red-600">{metric(metrics.avgSurfaceTempCelsius, '°C')}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">UHI Intensity Delta</div>
                        {/*
                          The `+` was written into the JSX, so a delta of -0.4 —
                          a zone cooler than its rural baseline, which is the
                          whole point of a mitigation dashboard — rendered as
                          "+-0.4°C". It is part of the formatting now and only
                          appears on a positive number.
                        */}
                        <div className="text-2xl font-bold text-amber-600">
                            {metric(metrics.urbanHeatIslandDelta, '°C', metrics.urbanHeatIslandDelta > 0 ? '+' : '')}
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Average Albedo Index</div>
                        <div className="text-2xl font-bold text-slate-800">{metric(metrics.averageAlbedoIndex)}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="text-xs text-slate-500">Green Canopy Cover</div>
                        <div className="text-2xl font-bold text-emerald-600">{metric(metrics.greenCanopyCoveragePercent, '%')}</div>
                    </div>
                </div>
            )}

            {activeTab === 'sensors' && (
                sensorNodes.length === 0 ? (
                    <p className="text-sm text-slate-500">No sensor nodes are reporting for this zone.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {sensorNodes.map((node) => (
                            <div key={node.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">{node.id}</span>
                                    {/*
                                      Every status was styled as if it were
                                      Active, so an Offline node was a green pill
                                      reading "Offline" — the one thing this card
                                      exists to make noticeable.
                                    */}
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.status === 'Active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-800'}`}
                                    >
                                        {node.status || 'Unknown'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500">Zone: {node.location}</div>
                                <div className="text-sm font-semibold text-red-600">Surface Temp: {metric(node.tempC, '°C')}</div>
                                <div className="text-xs text-slate-400">Albedo: {metric(node.albedo)}</div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {activeTab === 'mitigation' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Predictive Cool-Roof &amp; Urban Forestry Interventions</h3>
                    {recommendations.length === 0 ? (
                        <p className="text-sm text-slate-500">No interventions have been modelled for this zone yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {recommendations.map((rec, index) => (
                                <div key={rec.intervention ?? index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">{rec.intervention}</span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{rec.feasibility} Feasibility</span>
                                    </div>
                                    <div className="text-xs text-slate-500">Target Area: {area(rec.targetAreaSqM)} m²</div>
                                    <div className="text-sm font-semibold text-emerald-600">Projected Drop: {metric(rec.projectedTempDropC, '°C')}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
