import React, { useState } from "react";
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

const Commute = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [routeLine, setRouteLine] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);
  const [routeStats, setRouteStats] = useState(null);

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
      const cleanest = routeResults.cleanestRoute;
      const leafletCoords = cleanest.geometry.map((coord) => [
        coord[1],
        coord[0],
      ]);

      setRouteLine(leafletCoords);
      setMapCenter(leafletCoords[0]);
      setRouteStats({
        distance: cleanest.distance,
        pm25: cleanest.pm25,
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
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
      <div className="content-card" style={{ padding: "2.5rem" }}>
        <h2 className="commute-title" style={{ marginTop: 0 }}>
          Clean Route Planner
        </h2>

        <div className="commute-layout">
          <div className="commute-sidebar">
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

              <button
                type="submit"
                disabled={isCalculating}
                className="commute-btn"
              >
                {isCalculating ? "Analyzing PM2.5..." : "Find Cleanest Route"}
              </button>
            </form>

            {routeStats && (
              <div className="commute-stats">
                <h3>Route Selected</h3>
                <p>
                  Distance: <strong>{routeStats.distance} km</strong>
                </p>
                <p>
                  Avg PM2.5: <strong>{routeStats.pm25} µg/m³</strong>
                </p>
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
              {routeLine && (
                <>
                  <Marker position={routeLine[0]} icon={defaultIcon}>
                    <Popup>
                      <strong>Start:</strong> {origin}
                    </Popup>
                  </Marker>

                  <Marker
                    position={routeLine[routeLine.length - 1]}
                    icon={defaultIcon}
                  >
                    <Popup>
                      <strong>Destination:</strong> {destination}
                    </Popup>
                  </Marker>

                  <Polyline
                    positions={routeLine}
                    color="#0d9488"
                    weight={6}
                    opacity={0.8}
                  />
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
