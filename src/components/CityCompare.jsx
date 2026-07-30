// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { SAFE_LIMITS } from "../constants/cities";
import { fetchAirQualityByCoords, getAQIBand } from "../services/airQualityService";
import { cacheStore } from "../utils/cacheStore";
import LocationSearch from "./LocationSearch";

const STORAGE_KEY = "pollution-hub-compare-cities";

const PRESETS = [
  {
    name: "Global Megacities",
    cities: [
      { name: "Delhi", lat: 28.6139, lon: 77.209 },
      { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
      { name: "London", lat: 51.5074, lon: -0.1278 },
      { name: "New York", lat: 40.7128, lon: -74.006 },
    ],
  },
  {
    name: "Indian Metros",
    cities: [
      { name: "Delhi", lat: 28.6139, lon: 77.209 },
      { name: "Mumbai", lat: 19.076, lon: 72.8777 },
      { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
      { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    ],
  },
];

const CHART_COLORS = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b"];

export default function CityCompare() {
  const [selectedCities, setSelectedCities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : PRESETS[0].cities.slice(0, 2);
    } catch {
      return PRESETS[0].cities.slice(0, 2);
    }
  });

  const [citiesData, setCitiesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCities));
  }, [selectedCities]);

  // Fetch AQI data in parallel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all(
      selectedCities.map((city) => {
        const key = `aqi_compare_${city.lat}_${city.lon}`;
        return cacheStore.deduplicate(key, () =>
          fetchAirQualityByCoords(city.lat, city.lon, undefined, true)
        ).catch(() => null);
      })
    ).then((results) => {
      if (isMounted) {
        setCitiesData(results);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCities]);

  // Find lowest AQI for Cleaner Air badge
  const minAqi = useMemo(() => {
    const valid = citiesData
      .map((d) => d?.current?.us_aqi)
      .filter((v) => typeof v === "number");
    return valid.length > 1 ? Math.min(...valid) : null;
  }, [citiesData]);

  const handleAddCity = (location) => {
    if (!location || location === "auto") return;
    setNotice("");

    const exists = selectedCities.some((c) => Math.abs(c.lat - location.lat) < 0.05);
    if (exists) {
      setNotice(`${location.name} is already added.`);
      return;
    }

    if (selectedCities.length >= 4) {
      setNotice("Maximum 4 cities compared. Click Swap on any card to change it.");
      return;
    }

    setSelectedCities([...selectedCities, { name: location.name, lat: location.lat, lon: location.lon }]);
  };

  const handleSwapCity = (index, location) => {
    if (!location || location === "auto") return;
    const updated = [...selectedCities];
    updated[index] = { name: location.name, lat: location.lat, lon: location.lon };
    setSelectedCities(updated);
    setEditingIndex(null);
  };

  const handleRemoveCity = (index) => {
    if (selectedCities.length <= 1) return;
    setSelectedCities(selectedCities.filter((_, i) => i !== index));
  };

  return (
    <div className="city-compare-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
      <div className="content-card" style={{ padding: "2.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h2 className="commute-title" style={{ marginTop: 0 }}>
            Multi-City AQI Comparison
          </h2>
          <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
            Compare live air quality metrics, WHO guideline limits, and hourly trends side-by-side.
          </p>
        </div>

        {/* Controls & Presets */}
        <div className="compare-controls-bar">
          <div className="preset-buttons-group">
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--muted)" }}>
              Quick Presets:
            </span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="btn-secondary text-sm"
                style={{ borderRadius: "20px", padding: "0.35rem 0.8rem" }}
                onClick={() => {
                  setNotice("");
                  setSelectedCities(preset.cities);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LocationSearch
              onLocationSelected={handleAddCity}
              placeholder={selectedCities.length >= 4 ? "4/4 Cities selected" : "Add city to compare..."}
              disabled={selectedCities.length >= 4}
            />
            <small style={{ color: "var(--muted)" }}>({selectedCities.length}/4)</small>
          </div>
        </div>

        {notice && (
          <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", padding: "0.75rem 1rem", borderRadius: "var(--r-md)", marginBottom: "1.5rem" }}>
            {notice}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--muted)" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
            <p>Fetching comparison data...</p>
          </div>
        ) : (
          <div className={`compare-grid cols-${selectedCities.length}`}>
            {selectedCities.map((city, index) => {
              const data = citiesData[index];
              const current = data?.current;
              const isWinner = minAqi !== null && current?.us_aqi === minAqi;
              const band = current ? getAQIBand(current.us_aqi) : null;
              const pm25Ratio = current ? Math.round((current.pm2_5 / SAFE_LIMITS.pm2_5) * 100) : 0;

              return (
                <div key={`${city.name}-${index}`} className={`compare-card ${isWinner ? "winner-card" : ""}`}>

                  {/* Badge Slot */}
                  <div className="card-badge-slot">
                    {isWinner ? (
                      <span className="winner-badge">Cleaner Air</span>
                    ) : (
                      <span className="winner-badge-placeholder" />
                    )}
                  </div>

                  {/* Header */}
                  <div className="compare-card-header">
                    {editingIndex === index ? (
                      <div style={{ flex: 1 }}>
                        <LocationSearch onLocationSelected={(loc) => handleSwapCity(index, loc)} placeholder="Swap city..." />
                        <button type="button" className="btn-text-cancel" onClick={() => setEditingIndex(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <h3 className="compare-city-name">{city.name}</h3>
                        <div className="card-actions">
                          <button type="button" className="btn-change-city" onClick={() => setEditingIndex(index)}>Swap</button>
                          {selectedCities.length > 1 && (
                            <button type="button" className="btn-remove" onClick={() => handleRemoveCity(index)}>×</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!current ? (
                    <p style={{ color: "var(--muted)", margin: "1.5rem 0" }}>Unable to load data.</p>
                  ) : (
                    <>
                      {/* Main AQI */}
                      <div className="aqi-display-main" style={{ margin: "1rem 0" }}>
                        <div style={{ fontSize: "2.75rem", fontWeight: "800", color: band.color, lineHeight: 1 }}>
                          {current.us_aqi}
                        </div>
                        <span style={{ background: `${band.color}20`, color: band.color, padding: "0.25rem 0.6rem", borderRadius: "8px", fontWeight: "700", fontSize: "0.85rem" }}>
                          {band.label}
                        </span>
                      </div>

                      {/* Primary Pollutant & WHO limit */}
                      <div className="pollutant-summary-box">
                        <div className="summary-row">
                          <span>Primary Pollutant</span>
                          <strong>PM2.5 ({current.pm2_5} µg/m³)</strong>
                        </div>
                        <div className="summary-row">
                          <span>WHO Safe Limit</span>
                          <strong style={{ color: pm25Ratio <= 100 ? "#10b981" : "#ef4444" }}>
                            {pm25Ratio}% {pm25Ratio <= 100 ? "(Safe)" : "(Exceeded)"}
                          </strong>
                        </div>
                        <div className="who-bar-bg">
                          <div className="who-bar-fill" style={{ width: `${Math.min(100, pm25Ratio)}%`, background: pm25Ratio <= 100 ? "#10b981" : "#ef4444" }} />
                        </div>
                      </div>

                      {/* Pollutant Breakdown */}
                      <div className="pollutant-list" style={{ marginTop: "1rem" }}>
                        <div className="pollutant-item"><span>PM10</span><strong>{current.pm10} µg/m³</strong></div>
                        <div className="pollutant-item"><span>NO₂</span><strong>{current.nitrogen_dioxide} µg/m³</strong></div>
                        <div className="pollutant-item"><span>O₃</span><strong>{current.ozone} µg/m³</strong></div>
                        <div className="pollutant-item"><span>CO</span><strong>{current.carbon_monoxide} µg/m³</strong></div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 24-Hour Comparative Forecast Chart */}
        {!loading && selectedCities.length >= 2 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>24-Hour Comparative Forecast Trend</h3>
            <div style={{ background: "var(--card)", padding: "1.5rem", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>

              {/* Legend */}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {selectedCities.map((city, i) => (
                  <div key={city.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <strong>{city.name}</strong>
                  </div>
                ))}
              </div>

              {/* Trend SVG */}
              <svg viewBox="0 0 800 180" style={{ width: "100%", height: "200px", overflow: "visible" }}>
                <line x1="0" y1="30" x2="800" y2="30" stroke="var(--line)" strokeDasharray="4" />
                <line x1="0" y1="80" x2="800" y2="80" stroke="var(--line)" strokeDasharray="4" />
                <line x1="0" y1="130" x2="800" y2="130" stroke="var(--line)" strokeDasharray="4" />

                {selectedCities.map((city, i) => {
                  const trend = citiesData[i]?.trend || [];
                  if (!trend.length) return null;
                  const points = trend.map((t, idx) => {
                    const x = (idx / (trend.length - 1 || 1)) * 800;
                    const y = Math.max(15, Math.min(160, 160 - (t.us_aqi / 300) * 140));
                    return `${x},${y}`;
                  }).join(" ");

                  return (
                    <polyline
                      key={city.name}
                      fill="none"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth="3"
                      points={points}
                    />
                  );
                })}

                <text x="10" y="175" fill="var(--muted)" fontSize="11">Earlier</text>
                <text x="380" y="175" fill="var(--muted)" fontSize="11">12 Hours Ago</text>
                <text x="760" y="175" fill="var(--muted)" fontSize="11">Now</text>
              </svg>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
