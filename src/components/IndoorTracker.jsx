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

/**
 * A full bar is twice the safe limit. That scale was undocumented and unmarked, so a
 * reading sitting exactly on the limit drew a half-full bar with nothing to say so.
 */
const GAUGE_FULL_SCALE_MULTIPLE = 2;

/**
 * `value` is null when there is no reading. The outdoor gauge used to be handed `?? 0`
 * by its caller, which printed a confident "0 µg/m³" and an empty bar — indistinguishable
 * from genuinely pristine air, and the number a visitor then compares their own sensor
 * against.
 *
 * @param {{ label: string, value: number|null, unit: string, limit: number, color: string }} props
 */
function Gauge({ label, value, unit, limit, color }) {
    const hasReading = typeof value === "number" && Number.isFinite(value);
    const pct = hasReading
        ? Math.min(100, Math.max(0, Math.round((value / (limit * GAUGE_FULL_SCALE_MULTIPLE)) * 100)))
        : 0;
    const limitMarkerPct = 100 / GAUGE_FULL_SCALE_MULTIPLE;

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
                {hasReading ? (
                    <strong>
                        {value} {unit}
                    </strong>
                ) : (
                    <strong style={{ color: "var(--text-secondary, #64748b)", fontWeight: 500 }}>
                        Not available
                    </strong>
                )}
            </div>
            <div
                style={{
                    position: "relative",
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
                {/* Where the safe limit falls on the scale. */}
                <span
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${limitMarkerPct}%`,
                        width: "2px",
                        backgroundColor: "var(--text-secondary, #64748b)",
                        opacity: 0.5,
                    }}
                />
            </div>
            <div
                style={{
                    fontSize: "0.7rem",
                    color: "var(--text-secondary, #64748b)",
                    marginTop: "0.2rem",
                }}
            >
                Safe limit {limit} {unit} · full bar {limit * GAUGE_FULL_SCALE_MULTIPLE} {unit}
            </div>
        </div>
    );
}

const FIELDS = [
    { key: "pm2_5", label: "Indoor PM2.5 (µg/m³)", testId: "indoor-pm25-input", step: "0.1" },
    { key: "co2", label: "Indoor CO₂ (ppm)", testId: "indoor-co2-input", step: "1" },
    { key: "voc", label: "Indoor VOC (ppb)", testId: "indoor-voc-input", step: "1" },
];

const INVALID_READING_MESSAGE = "Enter a number of 0 or more.";

/**
 * `Number()` alone let Infinity and NaN through. The gauges then rendered "NaN µg/m³",
 * `width: NaN%` dropped the bar entirely, and JSON.stringify wrote null — which
 * readIndoorReadings correctly rejects on the next load, so the reading the visitor had
 * just saved silently vanished. `min="0"` in the DOM is advisory and was not enforced on
 * submit either, so a negative reading was stored and coloured green.
 *
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseReading(raw) {
    if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
    if (typeof raw !== "string") return null;

    const trimmed = raw.trim();
    if (trimmed === "") return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Formats the stored ISO timestamp for display, tolerating an unparseable one. */
function formatReadingTime(timestamp) {
    if (typeof timestamp !== "string") return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
}

/** @param {{ current?: any, cityName?: string }} params */
export default function IndoorTracker({ current, cityName }) {
    const [saved, setSaved] = useState(() => readIndoorReadings());
    const [inputs, setInputs] = useState(() => ({
        pm2_5: saved?.pm2_5 ?? "",
        co2: saved?.co2 ?? "",
        voc: saved?.voc ?? "",
    }));
    const [errors, setErrors] = useState({});

    const setField = (key, value) => {
        setInputs((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleSave = (e) => {
        e.preventDefault();

        const parsed = {};
        const nextErrors = {};
        for (const { key } of FIELDS) {
            const value = parseReading(inputs[key]);
            if (value === null) nextErrors[key] = INVALID_READING_MESSAGE;
            else parsed[key] = value;
        }

        // Nothing is stored and nothing is shown until every field is usable, so the
        // panel cannot display a reading it will throw away on the next load.
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        const reading = { ...parsed, timestamp: new Date().toISOString() };
        try {
            localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(reading));
        } catch {
            // Quota exceeded — reading still shown for this session below
        }
        setSaved(reading);
    };

    const outdoorPm25 =
        typeof current?.pm2_5 === "number" && Number.isFinite(current.pm2_5)
            ? current.pm2_5
            : null;
    const savedAt = saved ? formatReadingTime(saved.timestamp) : null;

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
                {FIELDS.map(({ key, label, testId, step }) => (
                    <div key={key}>
                        <label style={{ fontSize: "0.85rem" }}>
                            {label}
                            <input
                                type="number"
                                min="0"
                                step={step}
                                required
                                data-testid={testId}
                                value={inputs[key]}
                                onChange={(e) => setField(key, e.target.value)}
                                aria-invalid={Boolean(errors[key])}
                                aria-describedby={errors[key] ? `${testId}-error` : undefined}
                                style={{
                                    display: "block",
                                    width: "9rem",
                                    padding: "0.5rem",
                                    marginTop: "0.25rem",
                                    borderColor: errors[key] ? "#dc2626" : undefined,
                                }}
                            />
                        </label>
                        {errors[key] && (
                            <p
                                id={`${testId}-error`}
                                role="alert"
                                data-testid={`${testId}-error`}
                                style={{
                                    margin: "0.25rem 0 0",
                                    fontSize: "0.75rem",
                                    color: "#dc2626",
                                }}
                            >
                                {errors[key]}
                            </p>
                        )}
                    </div>
                ))}
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
                        {/* null, not 0 — the gauge reports "Not available" rather than
                            inventing a reading the indoor figures get compared against. */}
                        <Gauge
                            label="PM2.5"
                            value={outdoorPm25}
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
                        <strong style={{ display: "block", marginBottom: "0.25rem" }}>Indoor</strong>
                        {/* The reading has always been timestamped and the timestamp has
                            never been shown, so one logged last week looked exactly like
                            one logged a minute ago — while the tips below compare it
                            against a live outdoor value. */}
                        <div
                            data-testid="indoor-reading-time"
                            style={{
                                fontSize: "0.75rem",
                                color: "var(--text-secondary, #64748b)",
                                marginBottom: "0.75rem",
                            }}
                        >
                            {savedAt ? `Logged ${savedAt}` : "Logged at an unknown time"}
                        </div>
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