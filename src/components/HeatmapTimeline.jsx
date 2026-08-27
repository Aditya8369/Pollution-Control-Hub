import { useState, useEffect, useRef, useMemo, useId } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchLocalGridTimeline } from "../services/airQualityService";
import { getMapTileUrlTemplate, supportsWebP } from "../utils/mapTiles";
import { loadHeatLayer } from "../utils/heatLayer";
import {
    HOURS_IN_DAY,
    clampHourIndex,
    formatHourLabel,
    getHourCount,
    getHourTime,
    getMaxHourIndex,
    initialHourIndex,
} from "../utils/timelineHours";

const POLLUTANTS = [
    { key: "us_aqi", label: "AQI", limit: null, maxRef: 300 },
    { key: "pm2_5", label: "PM2.5", limit: 15, maxRef: 150 },
    { key: "pm10", label: "PM10", limit: 45, maxRef: 300 },
    { key: "nitrogen_dioxide", label: "NO₂", limit: 25, maxRef: 200 },
    { key: "ozone", label: "O₃", limit: 100, maxRef: 300 },
];

const PLAY_INTERVAL_MS = 900;

/** Classifies a reading into the Low/Moderate/High/Very High bands from issue #889's example. */
function classify(value, pollutant) {
    if (value === null || value === undefined) return { label: "Unknown", color: "#94a3b8" };

    if (pollutant.limit === null) {
        // AQI itself — simplified 4-band read of the standard US AQI scale.
        if (value <= 50) return { label: "Low", color: "#22c55e" };
        if (value <= 100) return { label: "Moderate", color: "#f59e0b" };
        if (value <= 200) return { label: "High", color: "#f97316" };
        return { label: "Very High", color: "#ef4444" };
    }

    const ratio = value / pollutant.limit;
    if (ratio <= 1) return { label: "Low", color: "#22c55e" };
    if (ratio <= 2) return { label: "Moderate", color: "#f59e0b" };
    if (ratio <= 4) return { label: "High", color: "#f97316" };
    return { label: "Very High", color: "#ef4444" };
}

/**
 * Imperatively manages a leaflet.heat layer for the currently selected hour + pollutant.
 *
 * Loaded through `loadHeatLayer` rather than a top-level `import 'leaflet.heat'` side
 * effect — that plugin expects a global `L` and throws `ReferenceError: L is not
 * defined` under a bundler, which previously took down all of LocationMap.jsx the
 * same way. See `src/utils/heatLayer.js`.
 */
function TimelineHeatLayer({ points }) {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return undefined;

        let cancelled = false;
        let layer = null;

        loadHeatLayer(L).then((heatLayer) => {
            if (cancelled || typeof heatLayer !== "function") return;
            layer = heatLayer(points, { radius: 40, blur: 10, maxZoom: 12 });
            layer.addTo(map);
        });

        return () => {
            cancelled = true;
            if (layer) map.removeLayer(layer);
        };
    }, [map, points]);

    return null;
}

/**
 * Keeps the viewport on the city the rest of the panel is describing.
 *
 * `<MapContainer center>` is read once, on mount, and react-leaflet documents it
 * as immutable. `App.jsx` keeps this component mounted across a city search and
 * just swaps the props, so the heading, the hotspot line and the heat points all
 * moved to the new city while the map stayed parked over the old one — an empty
 * map under a heading naming somewhere else. Moving the view is an imperative
 * call on the map instance, which is what this child is for.
 *
 * @param {{ center: [number, number] }} params
 */
function RecenterOnCityChange({ center }) {
    const map = useMap();
    const [lat, lon] = center;

    useEffect(() => {
        if (typeof lat !== "number" || typeof lon !== "number") return;
        if (typeof map?.setView !== "function") return;
        // Zoom is the user's; only the centre follows the city.
        const zoom = typeof map.getZoom === "function" ? map.getZoom() : undefined;
        map.setView([lat, lon], zoom);
    }, [map, lat, lon]);

    return null;
}

/** @param {{ lat?: number, lon?: number, cityName?: string }} params */
export default function HeatmapTimeline({ lat, lon, cityName }) {
    const [gridData, setGridData] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [pollutantKey, setPollutantKey] = useState("us_aqi");
    const [hourIndex, setHourIndex] = useState(() => initialHourIndex(HOURS_IN_DAY));
    const [isPlaying, setIsPlaying] = useState(false);
    const playTimerRef = useRef(null);
    const sliderId = useId();

    const activePollutant = POLLUTANTS.find((p) => p.key === pollutantKey) || POLLUTANTS[0];

    useEffect(() => {
        if (typeof lat !== "number" || typeof lon !== "number") return undefined;
        let cancelled = false;
        setStatus("loading");

        fetchLocalGridTimeline(lat, lon)
            .then((data) => {
                if (cancelled) return;
                if (!data || data.length === 0) {
                    setStatus("error");
                    return;
                }
                setGridData(data);
                setStatus("ready");
            })
            .catch(() => {
                if (!cancelled) setStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [lat, lon]);

    const hourCount = getHourCount(gridData);
    const maxIndex = getMaxHourIndex(hourCount);

    // A grid shorter than 24 hours would otherwise leave `hourIndex` — seeded from
    // the local clock before any fetch resolved — past the end of the series, which
    // renders as an empty map with no error.
    useEffect(() => {
        if (hourCount === 0) return;
        setHourIndex((prev) => clampHourIndex(prev, hourCount));
    }, [hourCount]);

    // Play mode: auto-advance the hour on an interval, looping back to 0.
    useEffect(() => {
        if (!isPlaying || hourCount === 0) return undefined;

        playTimerRef.current = setInterval(() => {
            setHourIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
        }, PLAY_INTERVAL_MS);

        return () => clearInterval(playTimerRef.current);
    }, [isPlaying, hourCount, maxIndex]);

    const currentTime = getHourTime(gridData, hourIndex);

    const heatPoints = useMemo(() => {
        return gridData
            .map((point) => {
                const value = point.hourly[pollutantKey]?.[hourIndex];
                if (typeof value !== "number") return null;
                const intensity = Math.min(1, Math.max(0, value / activePollutant.maxRef));
                return [point.lat, point.lon, intensity];
            })
            .filter(Boolean);
    }, [gridData, pollutantKey, hourIndex, activePollutant]);

    // Hotspot: the grid point with the highest reading at the selected hour (step 10).
    const hotspot = useMemo(() => {
        let best = null;
        gridData.forEach((point) => {
            const value = point.hourly[pollutantKey]?.[hourIndex];
            if (typeof value !== "number") return;
            if (!best || value > best.value) {
                best = { areaName: point.areaName, value };
            }
        });
        return best;
    }, [gridData, pollutantKey, hourIndex]);

    const currentBand = classify(hotspot?.value ?? null, activePollutant);
    /** @type {[number, number]} */
    const mapCenter =
        typeof lat === "number" && typeof lon === "number"
            ? [lat, lon]
            : [20.5937, 78.9629];
    // `supportsWebP()` creates a canvas and reads a data URL out of it. That answer
    // cannot change for the life of the tab, and this ran on every slider tick.
    const tileUrlTemplate = useMemo(
        () => getMapTileUrlTemplate("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", supportsWebP()),
        []
    );

    return (
        <section data-testid="heatmap-timeline" className="panel">
            <div className="panel-head">
                <h2>Pollution Heatmap Timeline</h2>
                <p>
                    See how pollution changes throughout the day{cityName ? ` around ${cityName}` : ""} — drag the
                    slider or press play to watch it unfold.
                </p>
            </div>

            {status === "loading" && <p>Loading today's hourly readings…</p>}
            {status === "error" && <p style={{ color: "#dc2626" }}>Couldn't load hourly grid data. Try again shortly.</p>}

            {status === "ready" && (
                <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
                        <label style={{ fontSize: "0.85rem" }}>
                            Pollutant:{" "}
                            <select
                                data-testid="timeline-pollutant-select"
                                value={pollutantKey}
                                onChange={(e) => setPollutantKey(e.target.value)}
                                style={{ padding: "0.4rem 0.6rem" }}
                            >
                                {POLLUTANTS.map((p) => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            data-testid="timeline-play-toggle"
                            aria-pressed={isPlaying}
                            onClick={() => setIsPlaying((prev) => !prev)}
                            style={{
                                padding: "0.45rem 1rem",
                                borderRadius: "999px",
                                border: "none",
                                backgroundColor: isPlaying ? "#ef4444" : "#3b82f6",
                                color: "white",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            {isPlaying ? "⏸ Pause" : "▶ Play"}
                        </button>

                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{formatHourLabel(currentTime)}</span>
                        <span
                            style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.6rem",
                                borderRadius: "999px",
                                color: "white",
                                backgroundColor: currentBand.color,
                            }}
                        >
                            {currentBand.label}
                        </span>
                    </div>

                    <label htmlFor={sliderId} className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
                        Hour of day
                    </label>
                    <input
                        id={sliderId}
                        type="range"
                        min="0"
                        max={maxIndex}
                        value={hourIndex}
                        data-testid="timeline-hour-slider"
                        // Without this a screen reader announces the array index -
                        // "14 of 23" - rather than the hour the map is showing.
                        aria-valuetext={formatHourLabel(currentTime) || `Hour ${hourIndex + 1} of ${hourCount}`}
                        onChange={(e) => {
                            setIsPlaying(false);
                            setHourIndex(clampHourIndex(Number(e.target.value), hourCount));
                        }}
                        style={{ width: "100%", marginBottom: "1rem" }}
                    />

                    {hotspot && (
                        <p data-testid="timeline-hotspot" style={{ marginBottom: "1rem" }}>
                            🔺 Hotspot right now: <strong>{hotspot.areaName}</strong> at{" "}
                            <strong>{Math.round(hotspot.value)}</strong>{" "}
                            {activePollutant.key === "us_aqi" ? "AQI" : "µg/m³"} ({currentBand.label})
                        </p>
                    )}

                    <div className="commute-map-container" style={{ height: "420px" }}>
                        <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
                            <TileLayer url={tileUrlTemplate} attribution='&copy; OpenStreetMap contributors' />
                            <RecenterOnCityChange center={mapCenter} />
                            <TimelineHeatLayer points={heatPoints} />
                        </MapContainer>
                    </div>
                </>
            )}
        </section>
    );
}