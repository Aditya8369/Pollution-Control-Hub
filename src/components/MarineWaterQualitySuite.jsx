// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    fetchCoastalTelemetry,
    assessThreatLevel,
    computeFleetStatus,
} from "../services/marineWaterQualityService";

const REFRESH_INTERVAL_MS = 60 * 1000;

const TABS = [
    { id: "telemetry", label: "Live Telemetry" },
    { id: "threat", label: "Threat & Bathing Safety" },
    { id: "fleet", label: "Drone & Cleanup Fleet" },
];

function MetricCard({ label, value, unit, warn }) {
    return (
        <div
            className="marine-metric-card"
            style={{
                background: warn ? "#fff1f2" : "#f0f9ff",
                border: `1px solid ${warn ? "#fecdd3" : "#bae6fd"}`,
                borderRadius: 10,
                padding: "0.75rem 1rem",
                minWidth: 140,
            }}
        >
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: warn ? "#be123c" : "#0369a1" }}>
                {value}
                <span style={{ fontSize: "0.8rem", fontWeight: 500, marginLeft: 4 }}>{unit}</span>
            </div>
        </div>
    );
}

function StationTelemetryPanel({ telemetry }) {
    if (!telemetry.length) return <p>Loading coastal buoy telemetry…</p>;

    return (
        <div style={{ display: "grid", gap: "1.25rem" }}>
            {telemetry.map((reading) => (
                <div
                    key={reading.stationId}
                    data-testid={`marine-station-${reading.stationId}`}
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "1rem",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
                        <h4 style={{ margin: 0 }}>{reading.station.name}</h4>
                        <small style={{ color: "#64748b" }}>
                            Updated {new Date(reading.readingTime).toLocaleTimeString()}
                        </small>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        <MetricCard
                            label="Dissolved Oxygen"
                            value={reading.dissolvedOxygenMgL}
                            unit="mg/L"
                            warn={reading.dissolvedOxygenMgL < 5}
                        />
                        <MetricCard
                            label="Microplastics"
                            value={reading.microplasticsPpm}
                            unit="ppm"
                            warn={reading.microplasticsPpm > 10}
                        />
                        <MetricCard
                            label="Heavy Metal Index"
                            value={reading.heavyMetalIndex}
                            unit="/100"
                            warn={reading.heavyMetalIndex > 40}
                        />
                        <MetricCard
                            label="Turbidity"
                            value={reading.turbidityNtu}
                            unit="NTU"
                            warn={reading.turbidityNtu > 15}
                        />
                        <MetricCard label="pH" value={reading.phLevel} unit="" warn={reading.phLevel < 7.6 || reading.phLevel > 8.4} />
                        <MetricCard label="Sea Temp" value={reading.waterTempC} unit="°C" />
                    </div>
                    {reading.oilSlickDetected && (
                        <div
                            role="alert"
                            style={{
                                marginTop: "0.75rem",
                                background: "#450a0a",
                                color: "#fecaca",
                                borderRadius: 8,
                                padding: "0.6rem 0.9rem",
                                fontWeight: 600,
                            }}
                        >
                            🛢️ Oil slick detected — estimated coverage {reading.oilSlickCoverageKm2} km²
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function ThreatSafetyPanel({ telemetry, threatByStation }) {
    const chartData = telemetry.map((reading) => ({
        name: reading.station.name.replace(/\s*Buoy.*$/, ""),
        threatScore: threatByStation[reading.stationId]?.score ?? 0,
        bathingSafety: threatByStation[reading.stationId]?.bathingSafetyScore ?? 0,
        color: threatByStation[reading.stationId]?.color ?? "#94a3b8",
    }));

    return (
        <div>
            <div style={{ width: "100%", height: 320, marginBottom: "1.5rem" }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="threatScore" name="Threat Score" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Bar>
                        <Bar dataKey="bathingSafety" name="Bathing Safety Score" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "0.5rem" }}>Station</th>
                        <th style={{ padding: "0.5rem" }}>Ecosystem Threat</th>
                        <th style={{ padding: "0.5rem" }}>Bathing Safety</th>
                    </tr>
                </thead>
                <tbody>
                    {telemetry.map((reading) => {
                        const assessment = threatByStation[reading.stationId];
                        if (!assessment) return null;
                        return (
                            <tr key={reading.stationId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "0.5rem" }}>{reading.station.name}</td>
                                <td style={{ padding: "0.5rem" }}>
                                    <span
                                        style={{
                                            background: assessment.color,
                                            color: "#fff",
                                            borderRadius: 6,
                                            padding: "0.2rem 0.6rem",
                                            fontWeight: 600,
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        {assessment.level} ({assessment.score})
                                    </span>
                                </td>
                                <td style={{ padding: "0.5rem" }}>
                                    {assessment.bathingSafetyLabel} ({assessment.bathingSafetyScore}/100)
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

const STATUS_COLORS = {
    Idle: "#94a3b8",
    Dispatched: "#f59e0b",
    Sampling: "#0ea5e9",
    Cleaning: "#dc2626",
    Returning: "#8b5cf6",
    Charging: "#16a34a",
};

function FleetDashboard({ fleet }) {
    if (!fleet.length) return <p>Loading fleet status…</p>;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
            {fleet.map((unit) => (
                <div
                    key={unit.id}
                    data-testid={`fleet-unit-${unit.id}`}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{unit.id}</strong>
                        <span
                            style={{
                                background: STATUS_COLORS[unit.status] || "#94a3b8",
                                color: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                borderRadius: 999,
                                padding: "0.15rem 0.6rem",
                            }}
                        >
                            {unit.status}
                        </span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.4rem 0" }}>{unit.type}</div>
                    <div style={{ fontSize: "0.85rem" }}>
                        🔋 Battery: <strong>{unit.batteryPct}%</strong>
                    </div>
                    {unit.assignedStationName && (
                        <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                            📍 Assigned: {unit.assignedStationName}
                        </div>
                    )}
                    {unit.etaMinutes > 0 && (
                        <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                            ⏱️ ETA: {unit.etaMinutes} min
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function MarineWaterQualitySuite() {
    const [telemetry, setTelemetry] = useState([]);
    const [fleet, setFleet] = useState([]);
    const [activeTab, setActiveTab] = useState("telemetry");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            const readings = await fetchCoastalTelemetry();
            setTelemetry(readings);
            setError(null);
        } catch (err) {
            setError(err?.message || "Failed to load coastal telemetry");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [load]);

    const threatByStation = useMemo(() => {
        const map = {};
        for (const reading of telemetry) {
            map[reading.stationId] = assessThreatLevel(reading);
        }
        return map;
    }, [telemetry]);

    useEffect(() => {
        if (!telemetry.length) return;
        setFleet(computeFleetStatus(telemetry, threatByStation));
    }, [telemetry, threatByStation]);

    return (
        <section data-testid="marine-water-quality-suite" className="panel" aria-labelledby="marine-suite-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                <h2 id="marine-suite-title">🌊 Coastal & Marine Water Quality Surveillance</h2>
                {isLoading && <small>Refreshing…</small>}
            </div>
            <p style={{ color: "#64748b", maxWidth: 720 }}>
                Real-time-simulated telemetry from coastal monitoring buoys — dissolved oxygen, microplastics,
                heavy metals and oil-slick detection — with automated marine ecosystem threat scoring, coastal
                bathing safety guidance, and an autonomous sampling/cleanup fleet dashboard.
            </p>

            {error && (
                <div role="alert" style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.75rem 1rem", borderRadius: 8 }}>
                    {error}
                </div>
            )}

            <div role="tablist" style={{ display: "flex", gap: "0.5rem", margin: "1rem 0", flexWrap: "wrap" }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: "0.5rem 1rem",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: activeTab === tab.id ? "#0369a1" : "#fff",
                            color: activeTab === tab.id ? "#fff" : "#0f172a",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "telemetry" && <StationTelemetryPanel telemetry={telemetry} />}
            {activeTab === "threat" && <ThreatSafetyPanel telemetry={telemetry} threatByStation={threatByStation} />}
            {activeTab === "fleet" && <FleetDashboard fleet={fleet} />}
        </section>
    );
}