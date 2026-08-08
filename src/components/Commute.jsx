import React, { useState } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRouteHistory } from "../hooks/useRouteHistory";
import CommuteForm from "./CommuteForm";
import RouteResults from "./RouteResults";
import RouteMap from "./RouteMap";

import "leaflet/dist/leaflet.css";

const Commute = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("driving");
  const [isCalculating, setIsCalculating] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [pollutionDataAvailable, setPollutionDataAvailable] = useState(true);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [searchId, setSearchId] = useState(0);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);

  const { isLocating, geoError, setGeoError, handleGetLocation } = useGeolocation(setOrigin);
  const {
    routeHistory,
    savedLocations,
    newLocationLabel,
    setNewLocationLabel,
    addHistoryEntry,
    saveLocation,
    deleteSavedLocation,
  } = useRouteHistory();

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setIsCalculating(true);

    try {
      // @ts-ignore
      const routeResults = await calculateCleanRoute(origin, destination, mode);
      const allRoutesData = routeResults.allRoutes.map(r => ({
        ...r,
        leafletCoords: r.geometry.map((coord) => [coord[1], coord[0]])
      }));

      setRoutes(allRoutesData);
      setPollutionDataAvailable(routeResults.pollutionDataAvailable !== false);
      setActiveRouteIndex(0);
      setSearchId((prev) => prev + 1);

      if (allRoutesData.length > 0) {
        setMapCenter(allRoutesData[0].leafletCoords[0]);
        eventBus.emit("ROUTE_PLANNED", { origin, destination, mode });
      }
      addHistoryEntry(origin, destination);
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
            <CommuteForm
              origin={origin}
              setOrigin={setOrigin}
              destination={destination}
              setDestination={setDestination}
              mode={mode}
              setMode={setMode}
              isCalculating={isCalculating}
              isLocating={isLocating}
              handleGetLocation={handleGetLocation}
              handleRouteSearch={handleRouteSearch}
              savedLocations={savedLocations}
              applySavedLocation={applySavedLocation}
              deleteSavedLocation={deleteSavedLocation}
              newLocationLabel={newLocationLabel}
              setNewLocationLabel={setNewLocationLabel}
              saveLocation={saveLocation}
            />

            <RouteResults
              routes={routes}
              activeRouteIndex={activeRouteIndex}
              setActiveRouteIndex={setActiveRouteIndex}
              pollutionDataAvailable={pollutionDataAvailable}
              mode={mode}
              routeHistory={routeHistory}
              applyHistoryEntry={applyHistoryEntry}
            />
          </div>

          <RouteMap
            mapCenter={mapCenter}
            routes={routes}
            activeRouteIndex={activeRouteIndex}
            origin={origin}
            destination={destination}
            searchId={searchId}
          />
        </div>
      </div>
    </div>
  );
};

export default Commute;
