import { useState, useEffect, useRef } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { searchLocations } from "../services/geocodingService";
import { fetchAirQualityByCoords } from "../services/airQualityService";
import {
    ACTIVITIES,
    TRANSPORT_MODES,
    calculateMultiLocationExposure,
} from "../utils/exposureModel";
import { localDayKey } from "../utils/localDay";

const TODAY_ENTRIES_KEY = "exposure-tracker-today";
const HISTORY_KEY = "exposure-tracker-history";
const MAX_HISTORY_DAYS = 90;
const LOCATION_SEARCH_DEBOUNCE_MS = 400;

/**
 * Today, in the user's own calendar.
 *
 * `toISOString()` converts to UTC first, so the day it names rolls over at
 * midnight UTC rather than at the user's midnight. Since `readTodayEntries()`
 * discards the stored log the moment `parsed.date !== todayStr()`, that rollover
 * wiped the day's activities mid-evening in the Americas (19:00 or 20:00 in New
 * York) and filed the first five and a half hours of an Indian day under
 * yesterday. `handleSaveDay` used the same key, so the history chart's x-axis was
 * a day out for anyone west of UTC.
 */
function todayStr() {
    return localDayKey();
}

function readTodayEntries() {
    try {
        const raw = localStorage.getItem(TODAY_ENTRIES_KEY);
        if (!raw) return { date: todayStr(), entries: [] };
        const parsed = JSON.parse(raw);
        // A log from a previous day starts fresh rather than silently carrying
        // yesterday's activities into today's score.
        if (!parsed || parsed.date !== todayStr() || !Array.isArray(parsed.entries)) {
            return { date: todayStr(), entries: [] };
        }
        return parsed;
    } catch {
        return { date: todayStr(), entries: [] };
    }
}

function readHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

let entryIdCounter = 0;
function nextEntryId() {
    entryIdCounter += 1;
    return `entry-${Date.now()}-${entryIdCounter}`;
}

/** @param {{ current?: any, cityName?: string }} params */
export default function ExposureTracker({ current, cityName }) {
    const [entries, setEntries] = useState(() => readTodayEntries().entries);
    const [history, setHistory] = useState(() => readHistory());
    const [chartRange, setChartRange] = useState("week"); // 'week' | 'month'

    // Draft (not-yet-added) activity form state.
    const [draftType, setDraftType] = useState(ACTIVITIES[0].id);
    const [draftHours, setDraftHours] = useState("");
    const [draftTransport, setDraftTransport] = useState(TRANSPORT_MODES[0].id);
    const [locationQuery, setLocationQuery] = useState("");
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [formError, setFormError] = useState("");
    const searchDebounceRef = useRef(null);

    // Persist today's entries every time they change.
    useEffect(() => {
        try {
            localStorage.setItem(TODAY_ENTRIES_KEY, JSON.stringify({ date: todayStr(), entries }));
        } catch {
            // ignore storage error
        }
    }, [entries]);

    // Debounced location search as the user types.
    useEffect(() => {
        clearTimeout(searchDebounceRef.current);
        if (!locationQuery.trim()) {
            setLocationSuggestions([]);
            return undefined;
        }
        searchDebounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchLocations(locationQuery, 5);
                setLocationSuggestions(results);
            } catch {
                setLocationSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, LOCATION_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(searchDebounceRef.current);
    }, [locationQuery]);

    const handlePickSuggestion = (result) => {
        setSelectedLocation(result);
        setLocationQuery(result.displayName || result.name);
        setLocationSuggestions([]);
    };

    // "Use current location" shortcut — reuses the AQI already loaded for the
    // app's active city instead of a redundant fetch/geocode round trip.
    const handleUseCurrentLocation = () => {
        if (!cityName) return;
        setSelectedLocation({ name: cityName, displayName: cityName, lat: null, lon: null, presetAqi: current?.us_aqi ?? null });
        setLocationQuery(cityName);
        setLocationSuggestions([]);
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();
        setFormError("");

        const hours = Number(draftHours);
        if (!Number.isFinite(hours) || hours <= 0) {
            setFormError("Enter a duration greater than 0 hours.");
            return;
        }
        if (!selectedLocation) {
            setFormError("Pick a location from the search results.");
            return;
        }

        const entry = {
            id: nextEntryId(),
            type: draftType,
            hours,
            transportMode: draftTransport,
            locationName: selectedLocation.displayName || selectedLocation.name,
            aqi: selectedLocation.presetAqi ?? null,
            aqiStatus: selectedLocation.presetAqi != null ? "done" : "loading",
        };

        setEntries((prev) => [...prev, entry]);

        // Reset the draft form for the next entry.
        setDraftHours("");
        setLocationQuery("");
        setSelectedLocation(null);
        setDraftTransport(TRANSPORT_MODES[0].id);

        if (entry.aqi === null && selectedLocation.lat != null && selectedLocation.lon != null) {
            try {
                const data = await fetchAirQualityByCoords(selectedLocation.lat, selectedLocation.lon, undefined, true);
                const aqi = typeof data?.current?.us_aqi === "number" ? data.current.us_aqi : null;
                setEntries((prev) =>
                    prev.map((it) => (it.id === entry.id ? { ...it, aqi, aqiStatus: aqi === null ? "error" : "done" } : it))
                );
            } catch {
                setEntries((prev) =>
                    prev.map((it) => (it.id === entry.id ? { ...it, aqiStatus: "error" } : it))
                );
            }
        }
    };

    const handleRemoveEntry = (id) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    };

    const handleClearToday = () => {
        setEntries([]);
    };

    const result = calculateMultiLocationExposure(entries);

    const handleSaveDay = () => {
        if (entries.length === 0) return;

        const summary = {
            date: todayStr(),
            exposure: result.exposure,
            percentOfGuideline: result.percentOfGuideline,
            totalHours: result.totalHours,
            topContributorLabel: result.topContributor?.activity.label ?? null,
            entryCount: entries.length,
        };

        setHistory((prev) => {
            // Re-saving the same day overwrites its previous entry rather than
            // duplicating it in the chart.
            const withoutToday = prev.filter((day) => day.date !== summary.date);
            const updated = [...withoutToday, summary]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-MAX_HISTORY_DAYS);
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            } catch {
                // ignore storage error
            }
            return updated;
        });
    };

    const handleClearHistory = () => {
        setHistory([]);
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch {
            // ignore storage error
        }
    };

    const chartDays = chartRange === "week" ? 7 : 30;
    const chartData = history.slice(-chartDays).map((day) => ({
        date: day.date.slice(5), // MM-DD
        percentOfGuideline: day.percentOfGuideline,
    }));

    return (
        <section data-testid="exposure-tracker" className="panel">
            <div className="panel-head">
                <h2>Personal Pollution Exposure Score</h2>
                <p>
                    Log where you spent time today, and what you were doing there, to see how much
                    pollution you actually breathed in — and which activity drove it.
                </p>
            </div>

            <form
                onSubmit={handleAddActivity}
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    alignItems: "flex-end",
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "0.5rem",
                }}
            >
                <label style={{ fontSize: "0.85rem" }}>
                    Activity
                    <select
                        data-testid="exposure-activity-select"
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value)}
                        style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem", minWidth: "14rem" }}
                    >
                        {ACTIVITIES.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                    </select>
                </label>

                <label style={{ fontSize: "0.85rem" }}>
                    Duration (hours)
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        data-testid="exposure-duration-input"
                        value={draftHours}
                        onChange={(e) => setDraftHours(e.target.value)}
                        style={{ display: "block", width: "7rem", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                </label>

                <label style={{ fontSize: "0.85rem", position: "relative" }}>
                    Location
                    <input
                        type="text"
                        placeholder="Search a place…"
                        data-testid="exposure-location-input"
                        value={locationQuery}
                        onChange={(e) => {
                            setLocationQuery(e.target.value);
                            setSelectedLocation(null);
                        }}
                        style={{ display: "block", width: "14rem", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                    {isSearching && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)" }}>Searching…</span>
                    )}
                    {locationSuggestions.length > 0 && (
                        <ul
                            data-testid="exposure-location-suggestions"
                            style={{
                                position: "absolute",
                                zIndex: 10,
                                listStyle: "none",
                                margin: "0.25rem 0 0",
                                padding: "0.25rem",
                                width: "14rem",
                                backgroundColor: "var(--card-bg, #ffffff)",
                                border: "1px solid var(--border-color, #e2e8f0)",
                                borderRadius: "0.375rem",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                            }}
                        >
                            {locationSuggestions.map((res) => (
                                <li key={res.id}>
                                    <button
                                        type="button"
                                        onClick={() => handlePickSuggestion(res)}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "0.4rem 0.5rem",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        {res.displayName || res.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </label>

                {cityName && (
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        style={{
                            fontSize: "0.78rem",
                            padding: "0.45rem 0.75rem",
                            background: "none",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                        }}
                    >
                        📍 Use {cityName}
                    </button>
                )}

                <label style={{ fontSize: "0.85rem" }}>
                    Transport Mode
                    <select
                        data-testid="exposure-transport-select"
                        value={draftTransport}
                        onChange={(e) => setDraftTransport(e.target.value)}
                        style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem", minWidth: "10rem" }}
                    >
                        {TRANSPORT_MODES.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                    </select>
                </label>

                <button
                    type="submit"
                    data-testid="exposure-add-activity"
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
                    Add Activity
                </button>

                {formError && (
                    <p role="alert" style={{ width: "100%", margin: 0, fontSize: "0.8rem", color: "#dc2626" }}>
                        {formError}
                    </p>
                )}
            </form>

            {entries.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                                <th style={{ padding: "0.5rem" }}>Location</th>
                                <th style={{ padding: "0.5rem" }}>Activity</th>
                                <th style={{ padding: "0.5rem" }}>Hours</th>
                                <th style={{ padding: "0.5rem" }}>Transport</th>
                                <th style={{ padding: "0.5rem" }}>AQI</th>
                                <th style={{ padding: "0.5rem" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => {
                                const activity = ACTIVITIES.find((a) => a.id === entry.type);
                                const transport = TRANSPORT_MODES.find((m) => m.id === entry.transportMode);
                                return (
                                    <tr key={entry.id} style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                                        <td style={{ padding: "0.5rem" }}>{entry.locationName}</td>
                                        <td style={{ padding: "0.5rem" }}>{activity?.label}</td>
                                        <td style={{ padding: "0.5rem" }}>{entry.hours}</td>
                                        <td style={{ padding: "0.5rem" }}>{transport?.label}</td>
                                        <td style={{ padding: "0.5rem" }}>
                                            {entry.aqiStatus === "loading" && "Loading…"}
                                            {entry.aqiStatus === "error" && "Unavailable"}
                                            {entry.aqiStatus === "done" && (entry.aqi ?? "—")}
                                        </td>
                                        <td style={{ padding: "0.5rem" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEntry(entry.id)}
                                                aria-label={`Remove ${entry.locationName} entry`}
                                                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div
                data-testid="exposure-summary"
                style={{
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: result.severity.bg,
                    borderLeft: `4px solid ${result.severity.color}`,
                    marginBottom: "1.5rem",
                }}
            >
                <strong style={{ color: result.severity.color, fontSize: "1.1rem" }}>
                    {result.percentOfGuideline}% of WHO daily guideline · {result.severity.label}
                </strong>
                <p style={{ margin: "0.4rem 0 0" }}>
                    Total exposure: {result.exposure} µg/m³·h across {result.totalHours} logged hour
                    {result.totalHours === 1 ? "" : "s"}.
                </p>
                {result.topContributor && result.topContributor.exposure > 0 && (
                    <p style={{ margin: "0.4rem 0 0" }}>
                        🔺 Biggest contributor: <strong>{result.topContributor.activity.label}</strong> at{" "}
                        <strong>{result.topContributor.entry.locationName}</strong> (
                        {Math.round(result.topContributor.exposure)} µg/m³·h)
                    </p>
                )}
                {result.dayCoverage === "short" && (
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>
                        Logged hours don't add up to a full day yet — the percentage above will change as you add more.
                    </p>
                )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <button
                    type="button"
                    data-testid="exposure-save-day"
                    onClick={handleSaveDay}
                    disabled={entries.length === 0}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "500",
                        cursor: entries.length === 0 ? "not-allowed" : "pointer",
                        opacity: entries.length === 0 ? 0.6 : 1,
                    }}
                >
                    Save Today's Log
                </button>
                <button
                    type="button"
                    onClick={handleClearToday}
                    style={{
                        padding: "0.5rem 1rem",
                        background: "none",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Clear Today
                </button>
            </div>

            <div className="panel-head" style={{ marginTop: "1rem" }}>
                <h3>Exposure History</h3>
            </div>

            {history.length === 0 ? (
                <p style={{ color: "var(--text-secondary, #64748b)" }}>
                    Save a day's log to start building your exposure trend.
                </p>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                        <button
                            type="button"
                            onClick={() => setChartRange("week")}
                            style={{
                                padding: "0.4rem 0.9rem",
                                borderRadius: "999px",
                                border: "1px solid var(--border-color, #e2e8f0)",
                                backgroundColor: chartRange === "week" ? "#3b82f6" : "transparent",
                                color: chartRange === "week" ? "white" : "inherit",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartRange("month")}
                            style={{
                                padding: "0.4rem 0.9rem",
                                borderRadius: "999px",
                                border: "1px solid var(--border-color, #e2e8f0)",
                                backgroundColor: chartRange === "month" ? "#3b82f6" : "transparent",
                                color: chartRange === "month" ? "white" : "inherit",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                            }}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={handleClearHistory}
                            style={{
                                marginLeft: "auto",
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
                    </div>

                    <div style={{ width: "100%", height: 260 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis fontSize={12} label={{ value: "% of guideline", angle: -90, position: "insideLeft", fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="percentOfGuideline" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </section>
    );
}