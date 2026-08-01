// @ts-nocheck
import React, { useState, useEffect } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);
  
  const ROUTE_COLORS = ["#0d9488", "#3b82f6", "#eab308", "#8b5cf6", "#f97316"];
  const [routeHistory, setRouteHistory] = useState(() => readRouteHistory());
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [newLocationLabel, setNewLocationLabel] = useState("");

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
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
          const data = await response.json();

          if (data && data.display_name) {
            const shortAddress = data.display_name
              .split(",")
              .slice(0, 3)
              .join(",");
            setOrigin(shortAddress);
          } else {
            setOrigin(`${latitude}, ${longitude}`);
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setOrigin(`${latitude}, ${longitude}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        alert(
          "Unable to retrieve your location. Please check your browser permissions.",
        );
        console.error("Error getting location:", error);
        setIsLocating(false);
      },
      options, // Pass options here
    );
  };

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setIsCalculating(true);

    try {
      const routeResults = await calculateCleanRoute(origin, destination);
      const allRoutesFormatted = routeResults.allRoutes.map(route => ({
        ...route,
        leafletCoords: route.geometry.map((coord) => [coord[1], coord[0]])
      }));

      setRoutes(allRoutesFormatted);
      setSelectedRouteIndex(0); // Cleanest route is first
      if (allRoutesFormatted.length > 0) {
        setMapCenter(allRoutesFormatted[0].leafletCoords[0]);
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
              <div className="commute-options" style={{ marginTop: '1rem' }}>
                <h3>Route Options</h3>
                <div className="commute-route-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {routes.map((route, index) => {
                    const isSelected = selectedRouteIndex === index;
                    const routeColor = ROUTE_COLORS[index % ROUTE_COLORS.length];
                    const isCleanest = index === 0;
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`commute-route-option ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedRouteIndex(index)}
                        style={{
                          border: `2px solid ${isSelected ? routeColor : '#e5e7eb'}`,
                          backgroundColor: isSelected ? `${routeColor}10` : '#ffffff',
                          padding: '1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          textAlign: 'left',
                          width: '100%',
                          display: 'block'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, color: '#1f2937' }}>
                            Route {index + 1}
                          </h4>
                          {isCleanest && (
                            <span style={{ 
                              backgroundColor: '#10b981', 
                              color: 'white', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              ⭐ Cleanest Recommended
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                          <div>
                            <span style={{ color: '#6b7280', display: 'block' }}>Distance</span>
                            <strong>{route.distance} km</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280', display: 'block' }}>Duration</span>
                            <strong>{route.duration} mins</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280', display: 'block' }}>PM2.5</span>
                            <strong>{route.pm25} µg/m³</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
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

          <div className="commute-map-container">
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

                  {/* Render unselected routes first so selected route renders on top */}
                  {routes.map((route, index) => {
                    if (index === selectedRouteIndex) return null;
                    return (
                      <Polyline
                        key={`route-${index}`}
                        positions={route.leafletCoords}
                        color={ROUTE_COLORS[index % ROUTE_COLORS.length]}
                        weight={4}
                        opacity={0.5}
                        eventHandlers={{
                          click: () => setSelectedRouteIndex(index),
                        }}
                      />
                    );
                  })}
                  
                  {/* Render selected route */}
                  {routes[selectedRouteIndex] && (
                    <Polyline
                      key={`route-${selectedRouteIndex}-selected`}
                      positions={routes[selectedRouteIndex].leafletCoords}
                      color={ROUTE_COLORS[selectedRouteIndex % ROUTE_COLORS.length]}
                      weight={8}
                      opacity={1}
                    />
                  )}
                </>
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Commute;
