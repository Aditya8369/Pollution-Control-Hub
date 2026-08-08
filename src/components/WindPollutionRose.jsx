import { useState, useEffect, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { buildWindRose } from "../utils/windRose";

export default function WindPollutionRose({ lat, lon, pollutant = "pm2_5" }) {
  const [rose, setRose] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPollutant, setSelectedPollutant] = useState(pollutant);

  useEffect(() => {
    // Number.isFinite, not truthiness. `!lat` rejects the equator and `!lon` rejects
    // the prime meridian, so Quito, Nairobi, Kampala, Accra and Greenwich took the
    // early return -- and because `loading` starts true and was only cleared after
    // this guard, they sat on the loading spinner permanently.
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setLoading(false);
      setError("Wind data needs a valid location.");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Fetch hourly wind speed, wind direction, and pollutants from Open-Meteo API
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&past_days=3`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m&past_days=3`;

    Promise.all([
      fetch(url, { signal: controller.signal }).then((res) => res.json()),
      fetch(weatherUrl, { signal: controller.signal }).then((res) => res.json())
    ])
      .then(([airRes, weatherRes]) => {
        if (!isMounted) return;

        if (!airRes.hourly || !weatherRes.hourly) {
          throw new Error("Invalid response format from weather/air-quality service.");
        }

        setRose(buildWindRose(airRes.hourly, weatherRes.hourly));
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted || err.name === "AbortError") return;
        console.error("Failed to load wind/pollution rose data", err);
        setError(err.message || "Failed to load wind & pollution data.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [lat, lon]);

  const pollutantLabels = useMemo(
    () => ({
      pm2_5: "PM2.5 (µg/m³)",
      pm10: "PM10 (µg/m³)",
      nitrogen_dioxide: "NO₂ (µg/m³)",
      ozone: "O₃ (µg/m³)"
    }),
    []
  );

  const sectorByDirection = useMemo(() => {
    const map = new Map();
    for (const sector of rose?.sectors ?? []) {
      map.set(sector.direction, sector);
    }
    return map;
  }, [rose]);

  const unsampled = rose ? rose.sectors.length - rose.sampledSectors : 0;

  return (
    <article className="chart-card wind-rose-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>Wind & Pollution Rose</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
            Identifies dominant directions bringing higher pollution levels.
          </p>
        </div>
        <div>
          <select
            aria-label="Select Pollutant for Rose Chart"
            value={selectedPollutant}
            onChange={(e) => setSelectedPollutant(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color, #cbd5e1)",
              backgroundColor: "var(--bg-card, #fff)",
              color: "var(--text-primary, #0f172a)",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <option value="pm2_5">PM2.5</option>
            <option value="pm10">PM10</option>
            <option value="nitrogen_dioxide">NO₂</option>
            <option value="ozone">O₃</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          <span className="loading-spinner live-dot active" aria-hidden="true" style={{ marginRight: "0.5rem" }} />
          Calculating wind direction & pollution dispersion...
        </div>
      )}

      {error && (
        <div style={{ padding: "1.5rem", color: "var(--danger, #ef4444)", textAlign: "center" }}>
          {error}
        </div>
      )}

      {!loading && !error && rose && rose.totalObservations === 0 && (
        <div data-testid="wind-rose-no-data" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
          No wind direction readings were returned for this location.
        </div>
      )}

      {!loading && !error && rose && rose.totalObservations > 0 && (
        <>
          <div style={{ width: "100%", height: 320, marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={rose.sectors}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="direction" stroke="var(--text-primary, #0f172a)" tick={{ fontSize: 12, fontWeight: "bold" }} />
                <PolarRadiusAxis angle={30} stroke="var(--muted, #94a3b8)" />
                <Tooltip
                  formatter={(val, name) => [
                    // A sector with no observations reaches the chart as null and is
                    // skipped by Recharts, but guard it so a future series that does
                    // render nulls cannot print "0 µg/m³" for an unsampled direction.
                    val == null ? "no readings" : `${val} µg/m³`,
                    pollutantLabels[name] || name
                  ]}
                  labelFormatter={(label) => {
                    const sector = sectorByDirection.get(label);
                    if (!sector || !sector.hasData) {
                      return `Wind Direction: ${label} — never observed`;
                    }
                    return `Wind Direction: ${label} (${sector.frequency} h, ${sector.frequencyPct}% of the time)`;
                  }}
                />
                <Radar
                  name={selectedPollutant}
                  dataKey={selectedPollutant}
                  stroke="#0d9488"
                  fill="#0d9488"
                  fillOpacity={0.45}
                  connectNulls={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* How much data is behind the shape above. Without this a single-sector
              spike is indistinguishable from a well-sampled compass. */}
          <p
            data-testid="wind-rose-coverage"
            style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.75rem 0 0", lineHeight: 1.5 }}
          >
            Based on {rose.totalObservations} hourly observations across{" "}
            {rose.sampledSectors} of {rose.sectors.length} compass directions
            {rose.dominantDirection ? `, most often from ${rose.dominantDirection}` : ""}.
            {unsampled > 0 && ` ${unsampled} direction(s) were never observed and are left blank rather than plotted as zero.`}
          </p>
        </>
      )}
    </article>
  );
}
