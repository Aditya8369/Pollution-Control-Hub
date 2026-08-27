import { useState, useEffect, useRef } from "react";
import { fetchHistoricalData } from "../services/historicalDataService";
import { fetchHourlyWeather } from "../services/weatherService";
import { useCommunityReports } from "../hooks/useCommunityReports";
import { buildHourlyBaseline, detectAnomalies } from "../utils/anomalyDetection";
import { localDayKey } from "../utils/localDay";

const ANOMALY_HISTORY_KEY = "anomaly-history";
const MAX_ANOMALY_HISTORY = 100;
const BASELINE_WINDOW_YEARS = 30 / 365; // ~last 30 days, reusing fetchHistoricalData's years-based window
const NEARBY_REPORT_RADIUS_DEG = 0.2; // roughly ~20km, generous on purpose — a rough "nearby" signal, not precision geofencing
const LOW_WIND_THRESHOLD_MS = 2; // below this, stagnant air is a plausible contributing factor

function readAnomalyHistory() {
    try {
        const raw = localStorage.getItem(ANOMALY_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function haversineApproxDeg(lat1, lon1, lat2, lon2) {
    return Math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2);
}

/** @param {{ lat?: number, lon?: number, current?: any, cityName?: string }} params */
export default function AnomalyAlert({ lat, lon, current, cityName }) {
    const [baseline, setBaseline] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [weatherNote, setWeatherNote] = useState(null);
    const [history, setHistory] = useState(() => readAnomalyHistory());
    const communityReports = useCommunityReports();
    const notifiedKeysRef = useRef(new Set());

    useEffect(() => {
        if (typeof lat !== "number" || typeof lon !== "number") return undefined;
        let cancelled = false;
        setStatus("loading");

        fetchHistoricalData(lat, lon, BASELINE_WINDOW_YEARS)
            .then((payload) => {
                if (cancelled) return;
                setBaseline(buildHourlyBaseline(payload));
                setStatus("ready");
            })
            .catch(() => {
                if (!cancelled) setStatus("error");
            });

        // Step 7: check weather conditions — low wind is a plausible contributing
        // factor for a spike (pollutants aren't dispersing), so surface it as a note.
        fetchHourlyWeather(lat, lon)
            .then((hours) => {
                if (cancelled) return;
                const nowPoint = hours?.[0];
                if (nowPoint && typeof nowPoint.windSpeed === "number" && nowPoint.windSpeed < LOW_WIND_THRESHOLD_MS) {
                    setWeatherNote(`Low wind (${nowPoint.windSpeed} m/s) may be letting pollution build up instead of dispersing.`);
                } else {
                    setWeatherNote(null);
                }
            })
            .catch(() => setWeatherNote(null));

        return () => {
            cancelled = true;
        };
    }, [lat, lon]);

    const anomalies = status === "ready" && current && baseline ? detectAnomalies(current, baseline) : [];

    // Step 6: nearby community reports as corroborating signal.
    const nearbyReportCount =
        typeof lat === "number" && typeof lon === "number"
            ? communityReports.filter(
                (r) => haversineApproxDeg(lat, lon, r.latitude, r.longitude) <= NEARBY_REPORT_RADIUS_DEG
            ).length
            : 0;

    // Steps 8-9: notify + persist history for newly-seen anomalies only, so the
    // same ongoing spike doesn't re-notify or re-log every render.
    useEffect(() => {
        if (anomalies.length === 0) return;

        // Local hour and local date. These used to disagree: `getHours()` is local
        // and `toISOString()` is UTC, so for anyone not on UTC the de-duplication
        // key changed at the UTC rollover partway through a local day - and the
        // same ongoing spike re-notified and re-logged the moment it did.
        const now = new Date();
        const hour = now.getHours();
        const today = localDayKey(now);
        const newEntries = [];

        anomalies.forEach((a) => {
            const key = `${today}-${hour}-${a.field}`;
            if (notifiedKeysRef.current.has(key)) return;
            notifiedKeysRef.current.add(key);

            newEntries.push({
                id: key,
                date: today,
                hour,
                field: a.field,
                label: a.label,
                current: a.current,
                baselineMean: a.baselineMean,
                percentAbove: a.percentAbove,
                cityName: cityName || null,
            });

            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("⚠️ Pollution Anomaly Detected", {
                    body: `${a.label} is ${a.percentAbove}% higher than normal for this time of day${cityName ? ` in ${cityName}` : ""}.`,
                });
            }
        });

        if (newEntries.length > 0) {
            setHistory((prev) => {
                const updated = [...newEntries, ...prev].slice(0, MAX_ANOMALY_HISTORY);
                try {
                    localStorage.setItem(ANOMALY_HISTORY_KEY, JSON.stringify(updated));
                } catch {
                    // ignore storage error
                }
                return updated;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anomalies, cityName]);

    const handleClearHistory = () => {
        setHistory([]);
        try {
            localStorage.removeItem(ANOMALY_HISTORY_KEY);
        } catch {
            // ignore storage error
        }
    };

    if (status === "loading") return null; // avoid a flash of "no anomalies" before baseline is ready
    if (status === "error") return null; // non-critical enrichment — fail quietly rather than block the dashboard

    return (
        <section data-testid="anomaly-alert" className="panel">
            <div className="panel-head">
                <h2>Pollution Anomaly Detection</h2>
                <p>Comparing live readings against the normal range for this time of day, based on the last 30 days.</p>
            </div>

            {anomalies.length === 0 ? (
                <p data-testid="anomaly-none" style={{ color: "var(--muted, #64748b)" }}>
                    No unusual spikes right now — readings are within their normal range for this hour.
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    {anomalies.map((a) => (
                        <div
                            key={a.field}
                            data-testid={`anomaly-${a.field}`}
                            style={{
                                padding: "0.85rem 1rem",
                                borderRadius: "0.5rem",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                borderLeft: "4px solid #ef4444",
                            }}
                        >
                            <strong>
                                ⚠️ {a.label} is {a.percentAbove}% higher than the normal value for this time of day.
                            </strong>
                            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary, #64748b)" }}>
                                Current: {a.current} · Typical for this hour: {a.baselineMean}
                            </p>
                            {nearbyReportCount > 0 && (
                                <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem" }}>
                                    🧑‍🤝‍🧑 Confirmed by {nearbyReportCount} nearby community report{nearbyReportCount === 1 ? "" : "s"}.
                                </p>
                            )}
                            {weatherNote && (
                                <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem" }}>🌬️ {weatherNote}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="panel-head" style={{ marginTop: "1rem" }}>
                <h3>Anomaly History</h3>
            </div>
            {history.length === 0 ? (
                <p style={{ color: "var(--muted, #64748b)" }}>No anomalies logged yet.</p>
            ) : (
                <>
                    <ul data-testid="anomaly-history-list" style={{ listStyle: "none", padding: 0, margin: "0 0 1rem" }}>
                        {history.map((entry) => (
                            <li
                                key={entry.id}
                                style={{
                                    padding: "0.5rem 0",
                                    borderBottom: "1px solid var(--border-color, #e2e8f0)",
                                    fontSize: "0.85rem",
                                }}
                            >
                                {entry.date} {String(entry.hour).padStart(2, "0")}:00 — {entry.label} was {entry.percentAbove}% above
                                normal ({entry.current} vs {entry.baselineMean}){entry.cityName ? ` in ${entry.cityName}` : ""}
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={handleClearHistory}
                        style={{
                            padding: "0.4rem 0.9rem",
                            background: "none",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "999px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            color: "#dc2626",
                        }}
                    >
                        Clear History
                    </button>
                </>
            )}
        </section>
    );
}