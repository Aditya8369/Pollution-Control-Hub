import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import { getAQIBand } from "../services/airQualityService";
import { UNMEASURED_SEGMENT_COLOR } from "../services/routePlanner";
import { getMapTileUrlTemplate, supportsWebP } from "../utils/mapTiles";
import { CITY_COORDINATES } from "../constants/cities";
import { POLLUTION_SOURCES } from "../constants/pollutionSources";

import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = new L.Icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

const INACTIVE_ROUTE_COLORS = [
  "#0d9488",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
];

const getSourceIcon = (type) => {
  let emoji = "🏭";
  let color = "#ef4444";
  if (type === "waste_disposal") {
    emoji = "🗑️";
    color = "#f97316";
  } else if (type === "high_traffic") {
    emoji = "🚗";
    color = "#eab308";
  }

  return new L.DivIcon({
    html: `<div style="
      font-size: 1.25rem; 
      display: flex; 
      justify-content: center; 
      align-items: center;
      width: 28px; 
      height: 28px; 
      background: white; 
      border: 2px solid ${color}; 
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.25);
    ">${emoji}</div>`,
    className: "custom-pollution-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const getSourceColor = (type) => {
  if (type === "waste_disposal") return "#f97316";
  if (type === "high_traffic") return "#eab308";
  return "#ef4444";
};

const getSourceRadius = (type) => {
  if (type === "waste_disposal") return 400;
  if (type === "high_traffic") return 250;
  return 500; // industrial_zone
};

export default function RouteMap({
  mapCenter,
  routes,
  activeRouteIndex,
  origin,
  destination,
  searchId,
}) {
  const activeRoute = routes[activeRouteIndex];
  const activeRouteColors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
  const tileUrlTemplate = getMapTileUrlTemplate('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', supportsWebP());

  // Interactive Layer Controls State
  const [showSources, setShowSources] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");

  // Determine closest city name to mapCenter to show correct local pollution sources
  const currentCityName = useMemo(() => {
    let closestCity = "Delhi";
    let minDistance = Infinity;
    
    const centerLat = mapCenter?.[0] ?? 28.6139;
    const centerLon = mapCenter?.[1] ?? 77.209;
    
    for (const city of CITY_COORDINATES) {
      const dist = Math.pow(city.lat - centerLat, 2) + Math.pow(city.lon - centerLon, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = city.name;
      }
    }
    return closestCity;
  }, [mapCenter]);

  // Filter sources based on active city and selected category
  const filteredSources = useMemo(() => {
    if (!showSources) return [];
    
    return POLLUTION_SOURCES.filter(source => {
      const cityMatches = source.city.toLowerCase() === currentCityName.toLowerCase();
      const typeMatches = sourceFilter === "all" || source.type === sourceFilter;
      return cityMatches && typeMatches;
    });
  }, [showSources, sourceFilter, currentCityName]);

  return (
    <div className="commute-map-container" style={{ position: "relative" }}>
      {/* Floating Interactive Control Panel */}
      <div
        data-testid="pollution-overlay-controls"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          background: "var(--card, rgba(30, 41, 59, 0.85))",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--line, rgba(255, 255, 255, 0.1))",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.15)",
          fontSize: "0.85rem",
          color: "var(--ink, #f8fafc)",
          maxWidth: "220px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", cursor: "pointer" }}>
          <input
            type="checkbox"
            data-testid="toggle-pollution-sources"
            checked={showSources}
            onChange={(e) => setShowSources(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Show Pollution Sources
        </label>

        {showSources && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "500" }}>Filter Category:</span>
            <select
              data-testid="pollution-category-filter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg, #0f172a)",
                color: "var(--ink)",
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              <option value="all">All Sources</option>
              <option value="industrial_zone">Industrial Zones</option>
              <option value="waste_disposal">Waste Disposal</option>
              <option value="high_traffic">High Traffic</option>
            </select>
          </div>
        )}
      </div>

      <MapContainer
        key={searchId}
        center={mapCenter}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={tileUrlTemplate}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Render Pollution Sources Circles and Markers */}
        {filteredSources.map((source) => (
          <React.Fragment key={source.id}>
            <Circle
              center={[source.lat, source.lon]}
              radius={getSourceRadius(source.type)}
              pathOptions={{
                color: getSourceColor(source.type),
                fillColor: getSourceColor(source.type),
                fillOpacity: 0.15,
                weight: 1
              }}
            />
            <Marker
              position={[source.lat, source.lon]}
              icon={getSourceIcon(source.type)}
            >
              <Popup>
                <div style={{ maxWidth: "200px" }}>
                  <strong style={{ fontSize: "0.95rem" }}>{source.name}</strong>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: getSourceColor(source.type), fontWeight: "bold", marginTop: "0.15rem" }}>
                    {source.type.replace("_", " ")}
                  </div>
                  <p style={{ fontSize: "0.8rem", margin: "0.35rem 0 0 0", color: "#475569" }}>
                    {source.details}
                  </p>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

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

            {routes.map((route, idx) => {
              if (idx === activeRouteIndex) return null;
              return (
                <Polyline
                  key={`inactive-${idx}`}
                  positions={route.leafletCoords}
                  color={INACTIVE_ROUTE_COLORS[idx % INACTIVE_ROUTE_COLORS.length]}
                  weight={4}
                  opacity={0.4}
                  dashArray={route.measured === false ? "5, 10" : undefined}
                />
              );
            })}

            {activeRoute && activeRoute.segments && activeRoute.segments.length > 0 ? (
              activeRoute.segments.map((seg, index) => {
                const isMeasured = seg.measured !== false && seg.aqi != null;
                const band = isMeasured ? getAQIBand(seg.aqi) : null;
                const startPt = seg.coordinates[0] ? seg.coordinates[0].join("-") : index;
                const segKey = `route-${searchId}-seg-${index}-aqi-${seg.aqi ?? "na"}-${startPt}`;

                return (
                  <Polyline
                    key={segKey}
                    positions={seg.coordinates}
                    color={isMeasured ? band.color : UNMEASURED_SEGMENT_COLOR}
                    weight={7}
                    opacity={isMeasured ? 1.0 : 0.55}
                    dashArray={isMeasured ? undefined : "8 8"}
                  >
                    <Popup>
                      <div>
                        <strong>Route Segment {index + 1}</strong>
                        <br />
                        {isMeasured ? (
                          <>
                            AQI: {seg.aqi} — {band.label}
                            <br />
                            PM2.5: {seg.pm25} µg/m³
                          </>
                        ) : (
                          <>Air quality data unavailable for this stretch.</>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })
            ) : activeRoute ? (
              <Polyline
                key={`active-${activeRouteIndex}`}
                positions={activeRoute.leafletCoords}
                color={activeRouteColors[activeRouteIndex % activeRouteColors.length]}
                weight={7}
                opacity={1.0}
              />
            ) : null}
          </>
        )}
      </MapContainer>

      <div
        className="route-aqi-legend"
        data-testid="route-aqi-legend"
      >
        <div className="route-aqi-legend-title">
          Route AQI Legend
        </div>
        <div className="route-aqi-legend-list">
          {LEGEND_ITEMS.map((item, idx) => (
            <div key={`legend-item-${idx}`} className="route-aqi-legend-item">
              <span
                className="route-aqi-legend-swatch"
                style={{ backgroundColor: item.color }}
              ></span>
              <span>{item.label} ({item.range})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

RouteMap.propTypes = {
  mapCenter: PropTypes.array.isRequired,
  routes: PropTypes.array.isRequired,
  activeRouteIndex: PropTypes.number.isRequired,
  origin: PropTypes.string,
  destination: PropTypes.string,
  searchId: PropTypes.number.isRequired,
};
