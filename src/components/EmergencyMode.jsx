import { useState, useEffect, useRef } from "react";
import { haversineDistanceKm } from "../services/verificationService";

// Step 1: emergency thresholds. ACTIVATE crosses into "Hazardous" on the US
// AQI scale; DEACTIVATE sits a little below it (hysteresis) so a reading that
// hovers exactly at the line doesn't flicker the takeover on and off.
export const EMERGENCY_ACTIVATE_AQI = 300;
export const EMERGENCY_DEACTIVATE_AQI = 280;

const EMERGENCY_STORAGE_KEY = "emergency-mode-state";

const RECOMMENDATIONS = [
    "Avoid outdoor activity",
    "Keep windows closed",
    "Use indoor air filtration",
    "Reduce unnecessary travel",
];

function readStoredState() {
    try {
        const raw = localStorage.getItem(EMERGENCY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/** @param {{ lat?: number, lon?: number, current?: any, nearbyPoints?: any[], cityName?: string }} params */
export default function EmergencyMode({ lat, lon, current, nearbyPoints = [], cityName }) {
    const [startedAt, setStartedAt] = useState(() => readStoredState()?.startedAt ?? null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [now, setNow] = useState(Date.now());
    const notifiedRef = useRef(false);

    const aqi = current?.us_aqi;
    const isSevere = typeof aqi === "number" && aqi >= EMERGENCY_ACTIVATE_AQI;
    const isActive = startedAt !== null;

    // Steps 2-3: continuously monitor AQI and detect the onset/end of a severe event.
    useEffect(() => {
        if (typeof aqi !== "number") return;

        if (isSevere && startedAt === null) {
            const activatedAt = Date.now();
            setStartedAt(activatedAt);
            setIsMinimized(false);
            try {
                localStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify({ startedAt: activatedAt }));
            } catch {
                // ignore storage error
            }
        } else if (aqi < EMERGENCY_DEACTIVATE_AQI && startedAt !== null) {
            // Step 9: return to normal mode once conditions genuinely improve.
            setStartedAt(null);
            notifiedRef.current = false;
            try {
                localStorage.removeItem(EMERGENCY_STORAGE_KEY);
            } catch {
                // ignore storage error
            }
        }
    }, [aqi, isSevere, startedAt]);

    // Step 6: notify once per activation, not on every render/poll.
    useEffect(() => {
        if (!isActive || notifiedRef.current) return;
        notifiedRef.current = true;
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🚨 SEVERE POLLUTION EVENT", {
                body: `AQI is ${aqi}${cityName ? ` in ${cityName}` : ""}. Avoid outdoor activity.`,
            });
        }
    }, [isActive, aqi, cityName]);

    // Step 8: live event duration while active.
    useEffect(() => {
        if (!isActive) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, [isActive]);

    if (!isActive) return null;

    // Step 7: nearest/worst nearby hotspot and its direction, for "display affected area".
    const hotspot =
        typeof lat === "number" && typeof lon === "number" && nearbyPoints.length > 0
            ? nearbyPoints.reduce((worst, point) => {
                if (typeof point.aqi !== "number") return worst;
                return !worst || point.aqi > worst.aqi ? point : worst;
            }, null)
            : null;
    const hotspotDistanceKm =
        hotspot && typeof lat === "number" && typeof lon === "number"
            ? haversineDistanceKm(lat, lon, hotspot.lat, hotspot.lon).toFixed(1)
            : null;

    if (isMinimized) {
        return (
            <button
                type="button"
                data-testid="emergency-mode-banner"
                onClick={() => setIsMinimized(false)}
                style={{
                    display: "block",
                    width: "100%",
                    padding: "0.6rem 1rem",
                    backgroundColor: "#b91c1c",
                    color: "white",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "center",
                }}
            >
                🚨 SEVERE POLLUTION EVENT — AQI {aqi} — tap for details
            </button>
        );
    }

    return (
        <div
            data-testid="emergency-mode-overlay"
            role="alertdialog"
            aria-labelledby="emergency-mode-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                backgroundColor: "#7f1d1d",
                color: "white",
                overflowY: "auto",
                padding: "2rem 1.5rem",
            }}
        >
            <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        color: "white",
                        padding: "0.4rem 0.9rem",
                        borderRadius: "999px",
                        cursor: "pointer",
                        marginBottom: "1.5rem",
                    }}
                >
                    Minimize
                </button>

                <h1 id="emergency-mode-title" style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>
                    🚨 SEVERE POLLUTION EVENT
                </h1>
                {cityName && <p style={{ opacity: 0.85, marginTop: 0 }}>{cityName}</p>}

                <div style={{ fontSize: "3rem", fontWeight: 800, margin: "1rem 0" }}>AQI: {aqi}</div>

                <ul style={{ paddingLeft: "1.25rem", marginBottom: "1.5rem", lineHeight: 1.8 }}>
                    {RECOMMENDATIONS.map((tip) => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ul>

                {hotspot && (
                    <p data-testid="emergency-hotspot" style={{ marginBottom: "1rem" }}>
                        Nearby hotspot:
                        <br />
                        <strong>
                            {hotspotDistanceKm} km {hotspot.areaName?.replace(" zone", "")}
                        </strong>
                    </p>
                )}

                <p data-testid="emergency-duration" style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                    Event ongoing for {formatDuration(now - startedAt)}.
                </p>
            </div>
        </div>
    );
}