import { useState, useMemo, useCallback, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchHistoricalRange } from "../services/airQualityService";
import { formatHistoricalCSV } from "../services/historicalDataService";
import { exportToSVG, exportToPNG } from "../utils/chartExport";
import { POLLUTANTS, aggregateData } from "../utils/dataAggregation";

// Use the local calendar date, not toISOString() (which converts to UTC and,
// in UTC+ timezones like IST, rolls the date forward by a day in the evening).
const toISODate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** @param {any} params */
export default function HistoricalData({ position }) {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    });
    const [endDate, setEndDate] = useState(() => new Date());
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [granularity, setGranularity] = useState("daily");
    const [selectedPollutants, setSelectedPollutants] = useState(["us_aqi", "pm2_5", "pm10"]);
    const chartContainerRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (!position?.lat || !position?.lon) return;
        setLoading(true);
        setError(null);
        try {
            const result = await fetchHistoricalRange(
                position.lat,
                position.lon,
                toISODate(startDate),
                toISODate(endDate)
            );
            setRawData(result);
        } catch (err) {
            setError(err.message || "Failed to load historical data.");
        } finally {
            setLoading(false);
        }
    }, [position, startDate, endDate]);

    const rawItems = useMemo(() => {
        if (!rawData?.hourly?.time) return [];
        return rawData.hourly.time.map((time, idx) => ({
            time,
            date: time.split("T")[0],
            us_aqi: rawData.hourly.us_aqi?.[idx],
            pm2_5: rawData.hourly.pm2_5?.[idx],
            pm10: rawData.hourly.pm10?.[idx],
            nitrogen_dioxide: rawData.hourly.nitrogen_dioxide?.[idx],
            ozone: rawData.hourly.ozone?.[idx],
            carbon_monoxide: rawData.hourly.carbon_monoxide?.[idx],
        }));
    }, [rawData]);

    const dailyData = useMemo(() => {
        return aggregateData(rawItems, "daily", ["us_aqi", "pm2_5", "pm10", "nitrogen_dioxide", "ozone", "carbon_monoxide"]).map(d => ({
            date: d.rawTime || d.label,
            maxAqi: d.us_aqi,
            pm25: d.pm2_5,
            pm10: d.pm10,
            no2: d.nitrogen_dioxide,
            ozone: d.ozone,
            co: d.carbon_monoxide
        }));
    }, [rawItems]);

    const chartData = useMemo(() => {
        return aggregateData(rawItems, granularity, selectedPollutants);
    }, [rawItems, granularity, selectedPollutants]);

    const handleDownloadCSV = () => {
        const csv = formatHistoricalCSV(dailyData, toISODate(startDate), toISODate(endDate));
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "historical";
        link.download = `${cityName}_historical_data_${toISODate(startDate)}_to_${toISODate(endDate)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadSVG = () => {
        if (!chartContainerRef.current) return;
        const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "historical";
        exportToSVG(chartContainerRef.current, `${cityName}_historical_chart_${toISODate(startDate)}_to_${toISODate(endDate)}.svg`);
    };

    const handleDownloadPNG = () => {
        if (!chartContainerRef.current) return;
        const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "historical";
        exportToPNG(chartContainerRef.current, `${cityName}_historical_chart_${toISODate(startDate)}_to_${toISODate(endDate)}.png`, 2);
    };

    return (
        <div className="historical-data-explorer content-card" style={{ padding: "2.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Historical Data Explorer</h2>
            <p style={{ color: "var(--muted)", margin: "0.5rem 0 1.5rem" }}>
                Compare air quality trends for {position?.cityName || "your area"} over a custom date range.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <div>
                    <label htmlFor="historical-start-date" style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
                        Start Date
                    </label>
                    <DatePicker
                        id="historical-start-date"
                        selected={startDate}
                        onChange={setStartDate}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        maxDate={endDate}
                    />
                </div>
                <div>
                    <label htmlFor="historical-end-date" style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
                        End Date
                    </label>
                    <DatePicker
                        id="historical-end-date"
                        selected={endDate}
                        onChange={setEndDate}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        maxDate={new Date()}
                    />
                </div>
                <button type="button" className="btn-primary" onClick={fetchData} disabled={loading}>
                    {loading ? "Loading..." : "Fetch Data"}
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadCSV}
                    disabled={dailyData.length === 0}
                >
                    Download CSV
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadSVG}
                    disabled={dailyData.length === 0}
                >
                    Download SVG
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadPNG}
                    disabled={dailyData.length === 0}
                >
                    Download PNG
                </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1.25rem", background: "var(--bg-card-alt, rgba(0,0,0,0.02))", padding: "1rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }} data-testid="historical-granularity-controls">
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>Granularity:</span>
                    {[
                        { id: "hourly", label: "Hourly" },
                        { id: "daily", label: "Daily Avg" },
                        { id: "weekly", label: "Weekly Avg" }
                    ].map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            className="btn-secondary text-sm"
                            style={{
                                padding: "0.25rem 0.6rem",
                                fontSize: "0.8rem",
                                fontWeight: granularity === g.id ? "bold" : "normal",
                                backgroundColor: granularity === g.id ? "var(--brand)" : undefined,
                                color: granularity === g.id ? "#ffffff" : undefined
                            }}
                            onClick={() => setGranularity(g.id)}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }} data-testid="historical-pollutant-controls">
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginRight: "0.25rem" }}>Compare Pollutants:</span>
                    {Object.entries(POLLUTANTS).map(([key, item]) => {
                        const isSelected = selectedPollutants.includes(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                    if (isSelected) {
                                        if (selectedPollutants.length > 1) {
                                            setSelectedPollutants(selectedPollutants.filter(p => p !== key));
                                        }
                                    } else {
                                        setSelectedPollutants([...selectedPollutants, key]);
                                    }
                                }}
                                style={{
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: "999px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    border: `1.5px solid ${item.color}`,
                                    backgroundColor: isSelected ? item.color : "transparent",
                                    color: isSelected ? "#ffffff" : item.color,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

            {chartData.length > 0 && (
                <div ref={chartContainerRef} className="chart-container-wrapper" style={{ width: "100%", background: "var(--card)" }}>
                    <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={30} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--card)",
                                    border: "1px solid var(--line)",
                                    borderRadius: "8px",
                                    fontSize: "0.85rem",
                                }}
                                formatter={(val, name) => {
                                    const pollutantConfig = Object.values(POLLUTANTS).find(p => p.name === name || p.key === name);
                                    const unit = pollutantConfig?.unit || '';
                                    return [`${val} ${unit}`, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
                            {selectedPollutants.map((key) => {
                                const config = POLLUTANTS[key];
                                if (!config) return null;
                                return (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={config.name}
                                        stroke={config.color}
                                        dot={false}
                                        strokeWidth={key === "us_aqi" ? 2.5 : 1.5}
                                        activeDot={{ r: 5 }}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!loading && !error && chartData.length === 0 && (
                <p style={{ color: "var(--muted)" }}>Pick a date range and click "Fetch Data" to view trends.</p>
            )}
        </div>
    );
}