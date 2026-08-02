import React, { useState, useEffect } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import { getAQIBand } from "../services/airQualityService";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";

const LEGEND_ITEMS = [
  { range: "0–50", aqi: 25 },
  { range: "51–100", aqi: 75 },
  { range: "101–150", aqi: 125 },
  { range: "151–200", aqi: 175 },
  { range: "201–300", aqi: 250 },
  { range: "301+", aqi: 350 },
].map((item) => ({
  range: item.range,
  ...getAQIBand(item.aqi),
}));
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Import the images directly from the local node_modules folder
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Use the local images for the Leaflet icon
const defaultIcon = new L.Icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HISTORY_STORAGE_KEY = "commute-route-history";
const SAVED_LOCATIONS_KEY = "commute-saved-locations";
const MAX_HISTORY = 10;

function readRouteHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readSavedLocations() {
  try {
    const raw = localStorage.getItem(SAVED_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const Commute = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("driving");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [searchId, setSearchId] = useState(0);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);
  const [routeHistory, setRouteHistory] = useState(() => readRouteHistory());
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [newLocationLabel, setNewLocationLabel] = useState("");

  const handleGetLocation = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);

    // Options object to force GPS / High Accuracy
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          if (data && data.display_name) {
            const shortAddress = data.display_name
              .split(",")
              .slice(0, 3)
              .join(",");
            setOrigin(shortAddress);
          } else {
            setOrigin("Location unavailable");
            setGeoError("Location details unavailable for coordinates.");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setOrigin("Location unavailable");
          setGeoError("Failed to fetch address details. Displaying placeholder.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setGeoError("Unable to retrieve location. Check browser permissions.");
        setIsLocating(false);
      },
      options,
    );
  };

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setIsCalculating(true);

    try {
      const routeResults = await calculateCleanRoute(origin, destination, mode);
      const allRoutesData = routeResults.allRoutes.map(r => ({
        ...r,
        leafletCoords: r.geometry.map((coord) => [coord[1], coord[0]])
      }));

      setRoutes(allRoutesData);
      setActiveRouteIndex(0); // Cleanest route is first
      setSearchId((prev) => prev + 1);
      
      if (allRoutesData.length > 0) {
        setMapCenter(allRoutesData[0].leafletCoords[0]);
      }
      setRouteHistory((prev) => {
        const entry = { origin, destination, timestamp: new Date().toISOString() };
        const deduped = prev.filter(
          (item) => !(item.origin === origin && item.destination === destination)
        );
        const updated = [entry, ...deduped].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      alert(
        "Error calculating route. Ensure the locations are spelled correctly.",
      );
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  };
  const applyHistoryEntry = (entry) => {
    setOrigin(entry.origin);
    setDestination(entry.destination);
  };

  const saveLocation = (value) => {
    const label = newLocationLabel.trim();
    if (!label || !value.trim()) return;

    setSavedLocations((prev) => {
      const deduped = prev.filter(
        (loc) => loc.label.toLowerCase() !== label.toLowerCase()
      );
      const updated = [...deduped, { id: crypto.randomUUID(), label, value: value.trim() }];
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
    setNewLocationLabel("");
  };

  const deleteSavedLocation = (id) => {
    setSavedLocations((prev) => {
      const updated = prev.filter((loc) => loc.id !== id);
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const applySavedLocation = (value, field) => {
    if (field === "origin") setOrigin(value);
    else setDestination(value);
  };
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
      <div className="content-card" style={{ padding: "2.5rem" }}>
        <h2 className="commute-title" style={{ marginTop: 0 }}>
          Clean Route Planner
        </h2>

        {geoError && (
          <div
            className="commute-error-banner"
            role="alert"
            style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#c2410c",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.9rem"
            }}
          >
            <span>⚠️ <strong>Reverse Geocoding Notice:</strong> {geoError}</span>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#c2410c",
                fontWeight: "bold",
                cursor: "pointer",
                paddingLeft: "1rem"
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="commute-layout">
          <div className="commute-sidebar">
            {savedLocations.length > 0 && (
              <div className="commute-saved-locations">
                <label>Saved Locations</label>
                <div className="commute-chip-row">
                  {savedLocations.map((loc) => (
                    <span key={loc.id} className="commute-chip-group">
                      <button
                        type="button"
                        className="saved-location-chip"
                        onClick={() => applySavedLocation(loc.value, "origin")}
                        title={`Set as Starting Point: ${loc.value}`}
                      >
                        {loc.label}
                      </button>
                      <button
                        type="button"
                        className="saved-location-chip saved-location-chip--dest"
                        onClick={() => applySavedLocation(loc.value, "destination")}
                        title={`Set as Destination: ${loc.value}`}
                      >
                        → Dest
                      </button>
                      <button
                        type="button"
                        className="saved-location-remove"
                        onClick={() => deleteSavedLocation(loc.id)}
                        aria-label={`Remove saved location ${loc.label}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleRouteSearch} className="commute-form">
              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <label style={{ marginBottom: 0 }}>Starting Point</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0d9488",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {isLocating ? "Locating..." : "📍 Use My Location"}
                  </button>
                </div>

                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Connaught Place"
                  required
                />
              </div>

              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. India Gate"
                  required
                />
              </div>

              <div className="form-group">
                <label>Transport Mode</label>
                <div className="mode-selector-group" role="group" aria-label="Transport Mode">
                  <button
                    type="button"
                    className={`mode-chip-btn ${mode === "driving" ? "active" : ""}`}
                    onClick={() => setMode("driving")}
                  >
                    Driving
                  </button>
                  <button
                    type="button"
                    className={`mode-chip-btn ${mode === "biking" ? "active" : ""}`}
                    onClick={() => setMode("biking")}
                  >
                    Cycling
                  </button>
                  <button
                    type="button"
                    className={`mode-chip-btn ${mode === "foot" ? "active" : ""}`}
                    onClick={() => setMode("foot")}
                  >
                    Walking
                  </button>
                </div>
              </div>

              <div className="form-group commute-save-location">
                <label>Save current locations for quick access</label>
                <div className="commute-save-row">
                  <input
                    type="text"
                    value={newLocationLabel}
                    onChange={(e) => setNewLocationLabel(e.target.value)}
                    placeholder='Label (e.g. "Home")'
                  />
                  <button
                    type="button"
                    className="commute-save-btn"
                    onClick={() => saveLocation(origin)}
                    disabled={!origin.trim() || !newLocationLabel.trim()}
                  >
                    Save Start
                  </button>
                  <button
                    type="button"
                    className="commute-save-btn"
                    onClick={() => saveLocation(destination)}
                    disabled={!destination.trim() || !newLocationLabel.trim()}
                  >
                    Save Destination
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCalculating}
                className="commute-btn"
              >
                {isCalculating ? "Analyzing PM2.5..." : "Find Cleanest Route"}
              </button>
            </form>

            {routes.length > 0 && (
              <>
                <div className="commute-stats" style={{ marginBottom: "1.5rem" }}>
                  <h3>Route Selected</h3>
                  {(() => {
                    const activeRoute = routes[activeRouteIndex];
                    return (
                      <>
                        <p>
                          Mode: <strong style={{ textTransform: "capitalize" }}>{activeRoute.mode || mode}</strong>
                        </p>
                        <p>
                          Distance: <strong>{activeRoute.distance} km</strong>
                        </p>
                        <p>
                          Est. Time: <strong>{activeRoute.duration} mins</strong>
                        </p>
                        <p>
                          Avg PM2.5: <strong>{activeRoute.pm25} µg/m³</strong>
                        </p>
                        <p>
                          Inhaled PM2.5 Dose: <strong>{activeRoute.inhaledDose} µg</strong>
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div className="commute-options">
                  <h3>Route Options</h3>
                  <div className="commute-route-list">
                    {routes.map((route, idx) => {
                      const isActive = idx === activeRouteIndex;
                      const isCleanest = idx === 0;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`commute-route-option ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveRouteIndex(idx)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '1rem',
                            marginBottom: '0.75rem',
                            borderRadius: '0.5rem',
                            border: `2px solid ${isActive ? '#0d9488' : '#e5e7eb'}`,
                            background: isActive ? '#f0fdfa' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '1.1rem', color: isActive ? '#0f766e' : '#374151' }}>
                              Route {idx + 1}
                            </strong>
                            {isCleanest && (
                              <span style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                Cleanest
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4b5563' }}>
                            <span>⏱ {route.duration} min</span>
                            <span>📏 {route.distance} km</span>
                            <span style={{ color: isCleanest ? '#059669' : '#b45309', fontWeight: '600' }}>
                              ☁️ {route.pm25} µg/m³
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {routeHistory.length > 0 && (
              <div className="commute-history">
                <h3>Recent Routes</h3>
                <ul className="commute-history-list">
                  {routeHistory.map((entry, index) => (
                    <li key={`${entry.timestamp}-${index}`}>
                      <button
                        type="button"
                        className="commute-history-item"
                        onClick={() => applyHistoryEntry(entry)}
                      >
                        {entry.origin} → {entry.destination}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="commute-map-container" style={{ position: "relative" }}>
            <MapContainer
              key={`${mapCenter[0]}-${mapCenter[1]}`}
              center={mapCenter}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {routes.length > 0 && (
                <>
                  <Marker position={routes[0].leafletCoords[0]} icon={defaultIcon}>
                    <Popup>
                      <strong>Start:</strong> {origin}
                    </Popup>
                  </Marker>

                  <Marker
                    position={routes[0].leafletCoords[routes[0].leafletCoords.length - 1]}
                    icon={defaultIcon}
                  >
                    <Popup>
                      <strong>Destination:</strong> {destination}
                    </Popup>
                  </Marker>

                  {/* Render inactive routes first so they appear underneath */}
                  {routes.map((route, idx) => {
                    if (idx === activeRouteIndex) return null;
                    const colors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
                    return (
                      <Polyline
                        key={`inactive-${idx}`}
                        positions={route.leafletCoords}
                        color={colors[idx % colors.length]}
                        weight={4}
                        opacity={0.4}
                      />
                    );
                  })}

                  {/* Render active route with segments for AQI heatmap */}
                  {routes[activeRouteIndex] && (() => {
                    const activeRoute = routes[activeRouteIndex];
                    if (activeRoute.segments && activeRoute.segments.length > 0) {
                      return activeRoute.segments.map((seg, index) => {
                        const band = getAQIBand(seg.aqi);
                        const startPt = seg.coordinates[0] ? seg.coordinates[0].join("-") : index;
                        const segKey = `route-${searchId}-seg-${index}-aqi-${seg.aqi}-${startPt}`;

                        return (
                          <Polyline
                            key={segKey}
                            positions={seg.coordinates}
                            color={band.color}
                            weight={7}
                            opacity={1.0}
                          >
                            <Popup>
                              <div>
                                <strong>Route Segment {index + 1}</strong>
                                <br />
                                AQI: {seg.aqi} — {band.label}
                                <br />
                                PM2.5: {seg.pm25} µg/m³
                              </div>
                            </Popup>
                          </Polyline>
                        );
                      });
                    } else {
                      const colors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
                      return (
                        <Polyline
                          key={`active-${activeRouteIndex}`}
                          positions={activeRoute.leafletCoords}
                          color={colors[activeRouteIndex % colors.length]}
                          weight={7}
                          opacity={1.0}
                        />
                      );
                    }
                  })()}
                </>
              )}
            </MapContainer>

            {/* Compact AQI Route Legend */}
            <div
              className="route-aqi-legend"
              data-testid="route-aqi-legend"
              style={{
                position: "absolute",
                bottom: "1rem",
                right: "1rem",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                padding: "0.6rem 0.8rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 1000,
                fontSize: "0.8rem",
                color: "#1e293b",
                fontFamily: "inherit"
              }}
            >
              <div style={{ fontWeight: "700", marginBottom: "0.4rem", color: "#0f172a" }}>
                Route AQI Legend
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {LEGEND_ITEMS.map((item, idx) => (
                  <div key={`legend-item-${idx}`} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: item.color,
                      }}
                    ></span>
                    <span>{item.label} ({item.range})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Commute;
