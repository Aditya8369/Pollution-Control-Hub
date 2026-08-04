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

// 16 Cardinal Directions
const DIRECTIONS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW"
];

// Helper function to map wind degree (0-360) to 16 cardinal direction labels
function getCardinalDirection(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return DIRECTIONS[index];
}

export default function WindPollutionRose({ lat, lon, pollutant = "pm2_5" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPollutant, setSelectedPollutant] = useState(pollutant);

  useEffect(() => {
    if (!lat || !lon) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Fetch hourly wind speed, wind direction, and pollutants from Open-Meteo API
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&past_days=3`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m&past_days=3`;

    Promise.all([fetch(url).then((res) => res.json()), fetch(weatherUrl).then((res) => res.json())])
      .then(([airRes, weatherRes]) => {
        if (!isMounted) return;

        if (!airRes.hourly || !weatherRes.hourly) {
          throw new Error("Invalid response format from weather/air-quality service.");
        }

        const airHourly = airRes.hourly;
        const weatherHourly = weatherRes.hourly;

        // Group pollutant concentration and wind speed by 16 cardinal direction sectors
        const groups = {};
        DIRECTIONS.forEach((dir) => {
          groups[dir] = { count: 0, pm2_5Sum: 0, pm10Sum: 0, no2Sum: 0, o3Sum: 0, windSpeedSum: 0 };
        });

        const len = Math.min(
          airHourly.time?.length || 0,
          weatherHourly.time?.length || 0
        );

        for (let i = 0; i < len; i++) {
          const deg = weatherHourly.wind_direction_10m[i];
          const speed = weatherHourly.wind_speed_10m[i];
          const pm2_5 = airHourly.pm2_5[i];
          const pm10 = airHourly.pm10[i];
          const no2 = airHourly.nitrogen_dioxide[i];
          const o3 = airHourly.ozone[i];

          if (deg != null) {
            const dir = getCardinalDirection(deg);
            groups[dir].count += 1;
            groups[dir].pm2_5Sum += pm2_5 || 0;
            groups[dir].pm10Sum += pm10 || 0;
            groups[dir].no2Sum += no2 || 0;
            groups[dir].o3Sum += o3 || 0;
            groups[dir].windSpeedSum += speed || 0;
          }
        }

        const processed = DIRECTIONS.map((dir) => {
          const g = groups[dir];
          const cnt = g.count || 1;
          return {
            direction: dir,
            pm2_5: Number((g.pm2_5Sum / cnt).toFixed(1)),
            pm10: Number((g.pm10Sum / cnt).toFixed(1)),
            nitrogen_dioxide: Number((g.no2Sum / cnt).toFixed(1)),
            ozone: Number((g.o3Sum / cnt).toFixed(1)),
            avgWindSpeed: Number((g.windSpeedSum / cnt).toFixed(1)),
            frequency: g.count
          };
        });

        setData(processed);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load wind/pollution rose data", err);
        setError(err.message || "Failed to load wind & pollution data.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
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

      {!loading && !error && data && (
        <div style={{ width: "100%", height: 320, marginTop: "1rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="direction" stroke="var(--text-primary, #0f172a)" tick={{ fontSize: 12, fontWeight: "bold" }} />
              <PolarRadiusAxis angle={30} stroke="var(--muted, #94a3b8)" />
              <Tooltip
                formatter={(val, name) => [
                  `${val} µg/m³`,
                  pollutantLabels[name] || name
                ]}
                labelFormatter={(label) => `Wind Direction: ${label}`}
              />
              <Radar
                name={selectedPollutant}
                dataKey={selectedPollutant}
                stroke="#0d9488"
                fill="#0d9488"
                fillOpacity={0.45}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
