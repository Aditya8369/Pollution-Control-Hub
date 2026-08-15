import React from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import { getAQIBand } from "../services/airQualityService";
import { UNMEASURED_SEGMENT_COLOR } from "../services/routePlanner";

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

  return (
    <div className="commute-map-container" style={{ position: "relative" }}>
      <MapContainer
        key={searchId}
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

            {routes.map((route, idx) => {
              if (idx === activeRouteIndex) return null;
              return (
                <Polyline
                  key={`inactive-${idx}`}
                  positions={route.leafletCoords}
                  color={INACTIVE_ROUTE_COLORS[idx % INACTIVE_ROUTE_COLORS.length]}
                  weight={4}
                  opacity={0.4}
                />
              );
            })}

            {/* Replaced IIFE with direct conditional rendering */}
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
  );
}

RouteMap.propTypes = {
  mapCenter: PropTypes.array.isRequired,
  routes: PropTypes.array.isRequired,
  activeRouteIndex: PropTypes.number.isRequired,
  origin: PropTypes.string.isRequired,
  destination: PropTypes.string.isRequired,
  searchId: PropTypes.number.isRequired,
};
