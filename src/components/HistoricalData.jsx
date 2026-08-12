import { useState, useMemo, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchHistoricalRange } from "../services/airQualityService";
import { formatHistoricalCSV } from "../services/historicalDataService";

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

    const dailyData = useMemo(() => {
        if (!rawData?.hourly?.time) return [];

        const byDate = new Map();
        rawData.hourly.time.forEach((timestamp, idx) => {
            const date = timestamp.split("T")[0];
            if (!byDate.has(date)) {
                byDate.set(date, { date, pm25: [], pm10: [], no2: [], ozone: [], co: [], aqi: [] });
            }
            const bucket = byDate.get(date);
            bucket.pm25.push(rawData.hourly.pm2_5?.[idx]);
            bucket.pm10.push(rawData.hourly.pm10?.[idx]);
            bucket.no2.push(rawData.hourly.nitrogen_dioxide?.[idx]);
            bucket.ozone.push(rawData.hourly.ozone?.[idx]);
            bucket.co.push(rawData.hourly.carbon_monoxide?.[idx]);
            bucket.aqi.push(rawData.hourly.us_aqi?.[idx]);
        });

        const avg = (arr) => {
            const valid = arr.filter((v) => typeof v === "number" && !isNaN(v));
            return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        };

        return Array.from(byDate.values())
            .map((bucket) => ({
                date: bucket.date,
                maxAqi: avg(bucket.aqi),
                pm25: avg(bucket.pm25),
                pm10: avg(bucket.pm10),
                no2: avg(bucket.no2),
                ozone: avg(bucket.ozone),
                co: avg(bucket.co),
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [rawData]);

    const chartData = useMemo(
        () =>
            dailyData.map((d) => ({
                date: d.date,
                AQI: d.maxAqi,
                "PM2.5": d.pm25,
                PM10: d.pm10,
                NO2: d.no2,
                Ozone: d.ozone,
                CO: d.co,
            })),
        [dailyData]
    );

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

    return (
        <div className="historical-data-explorer content-card" style={{ padding: "2.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Historical Data Explorer</h2>
            <p style={{ color: "var(--muted)", margin: "0.5rem 0 1.5rem" }}>
                Compare air quality trends for {position?.cityName || "your area"} over a custom date range.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
                        Start Date
                    </label>
                    <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        maxDate={endDate}
                    />
                </div>
                <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
                        End Date
                    </label>
                    <DatePicker
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
            </div>

            {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

            {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={30} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--line)",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
                        <Line type="monotone" dataKey="AQI" stroke="#0d9488" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="PM2.5" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="PM10" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="NO2" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="Ozone" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="CO" stroke="#64748b" dot={false} strokeWidth={1.5} />
                    </LineChart>
                </ResponsiveContainer>
            )}

            {!loading && !error && chartData.length === 0 && (
                <p style={{ color: "var(--muted)" }}>Pick a date range and click "Fetch Data" to view trends.</p>
            )}
        </div>
    );
}