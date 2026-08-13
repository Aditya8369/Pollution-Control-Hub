import { useState } from "react";
import { getPollutantColor } from "../services/airQualityService";
import { SAFE_LIMITS } from "../constants/cities";

const INDOOR_READINGS_KEY = "indoor-air-readings";

// Reference thresholds used for the CO2 / VOC gauges and health tips.
// PM2.5 reuses SAFE_LIMITS.pm2_5 so indoor/outdoor PM2.5 are colour-coded consistently.
const CO2_LIMIT_PPM = 1000; // ASHRAE guidance: >1000ppm indicates poor ventilation
const VOC_LIMIT_PPB = 500; // General "elevated" VOC guidance for indoor spaces

function readIndoorReadings() {
    try {
        const raw = localStorage.getItem(INDOOR_READINGS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            !parsed ||
            typeof parsed.pm2_5 !== "number" ||
            typeof parsed.co2 !== "number" ||
            typeof parsed.voc !== "number"
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function Gauge({ label, value, unit, limit, color }) {
    const pct = Math.min(100, Math.round((value / (limit * 2)) * 100));
    return (
        <div style={{ marginBottom: "1rem" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    marginBottom: "0.3rem",
                }}
            >
                <span>{label}</span>
                <strong>
                    {value} {unit}
                </strong>
            </div>
            <div
                style={{
                    height: "10px",
                    borderRadius: "999px",
                    backgroundColor: "var(--border-color, #e2e8f0)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: color,
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
        </div>
    );
}

/** @param {{ current?: any, cityName?: string }} params */
export default function IndoorTracker({ current, cityName }) {
    const [saved, setSaved] = useState(() => readIndoorReadings());
    const [pm25Input, setPm25Input] = useState(saved?.pm2_5 ?? "");
    const [co2Input, setCo2Input] = useState(saved?.co2 ?? "");
    const [vocInput, setVocInput] = useState(saved?.voc ?? "");

    const handleSave = (e) => {
        e.preventDefault();
        const reading = {
            pm2_5: Number(pm25Input),
            co2: Number(co2Input),
            voc: Number(vocInput),
            timestamp: new Date().toISOString(),
        };
        try {
            localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(reading));
        } catch {
            // Quota exceeded — reading still shown for this session below
        }
        setSaved(reading);
    };

    const outdoorPm25 = typeof current?.pm2_5 === "number" ? current.pm2_5 : null;

    const tips = [];
    if (saved && outdoorPm25 !== null) {
        if (saved.pm2_5 > outdoorPm25) {
            tips.push(
                "Your indoor air is worse than outside. Consider opening a window."
            );
        } else {
            tips.push(
                "Your indoor air is cleaner than outside right now — keep windows closed to keep it that way."
            );
        }
    }
    if (saved && saved.co2 > CO2_LIMIT_PPM) {
        tips.push("CO₂ levels suggest poor ventilation. Try airing out the room.");
    }
    if (saved && saved.voc > VOC_LIMIT_PPB) {
        tips.push(
            "VOC levels are elevated. Check for sources like paint, cleaning products, or new furniture."
        );
    }

    return (
        <section data-testid="indoor-tracker" className="panel">
            <div className="panel-head">
                <h2>Indoor vs. Outdoor Air Quality</h2>
                <p>
                    Log readings from your own indoor air quality sensor and compare them with outdoor
                    conditions{cityName ? ` in ${cityName}` : ""}.
                </p>
            </div>

            <form
                onSubmit={handleSave}
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1rem",
                    alignItems: "flex-end",
                    marginBottom: "1.5rem",
                }}
            >
                <label style={{ fontSize: "0.85rem" }}>
                    Indoor PM2.5 (µg/m³)
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        data-testid="indoor-pm25-input"
                        value={pm25Input}
                        onChange={(e) => setPm25Input(e.target.value)}
                        style={{ display: "block", width: "9rem", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                </label>
                <label style={{ fontSize: "0.85rem" }}>
                    Indoor CO₂ (ppm)
                    <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        data-testid="indoor-co2-input"
                        value={co2Input}
                        onChange={(e) => setCo2Input(e.target.value)}
                        style={{ display: "block", width: "9rem", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                </label>
                <label style={{ fontSize: "0.85rem" }}>
                    Indoor VOC (ppb)
                    <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        data-testid="indoor-voc-input"
                        value={vocInput}
                        onChange={(e) => setVocInput(e.target.value)}
                        style={{ display: "block", width: "9rem", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                </label>
                <button
                    type="submit"
                    data-testid="save-indoor-reading"
                    style={{
                        padding: "0.6rem 1.2rem",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "500",
                        cursor: "pointer",
                    }}
                >
                    Save Reading
                </button>
            </form>

            {saved && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "1.5rem",
                    }}
                >
                    <div
                        style={{
                            padding: "1rem",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "0.5rem",
                        }}
                    >
                        <strong style={{ display: "block", marginBottom: "0.75rem" }}>Outdoor</strong>
                        <Gauge
                            label="PM2.5"
                            value={outdoorPm25 ?? 0}
                            unit="µg/m³"
                            limit={SAFE_LIMITS.pm2_5}
                            color={getPollutantColor(outdoorPm25, SAFE_LIMITS.pm2_5)}
                        />
                        {typeof current?.us_aqi === "number" && (
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)" }}>
                                AQI: {current.us_aqi}
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            padding: "1rem",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "0.5rem",
                        }}
                    >
                        <strong style={{ display: "block", marginBottom: "0.75rem" }}>Indoor</strong>
                        <Gauge
                            label="PM2.5"
                            value={saved.pm2_5}
                            unit="µg/m³"
                            limit={SAFE_LIMITS.pm2_5}
                            color={getPollutantColor(saved.pm2_5, SAFE_LIMITS.pm2_5)}
                        />
                        <Gauge
                            label="CO2"
                            value={saved.co2}
                            unit="ppm"
                            limit={CO2_LIMIT_PPM}
                            color={getPollutantColor(saved.co2, CO2_LIMIT_PPM)}
                        />
                        <Gauge
                            label="VOC"
                            value={saved.voc}
                            unit="ppb"
                            limit={VOC_LIMIT_PPB}
                            color={getPollutantColor(saved.voc, VOC_LIMIT_PPB)}
                        />
                    </div>
                </div>
            )}

            {tips.length > 0 && (
                <ul style={{ marginTop: "1.5rem", paddingLeft: "1.25rem" }} data-testid="indoor-tips">
                    {tips.map((tip) => (
                        <li key={tip} style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>
                            {tip}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}