import React, { useState } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRouteHistory } from "../hooks/useRouteHistory";
import { getAQIBand } from "../services/airQualityService";
import { eventBus } from "../core/events";
import { describeRouteError } from "../utils/routeErrors";
import SavedLocations from "./SavedLocations";
import RouteForm from "./RouteForm";
import RouteResults from "./RouteResults";
import RouteMap from "./RouteMap";
import RouteHistory from "./RouteHistory";
import "leaflet/dist/leaflet.css";
import "./Commute.css";

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
  const [routeError, setRouteError] = useState(null);

  const { isLocating, geoError, setGeoError, locationSuccess, handleGetLocation } = useGeolocation(setOrigin);
  const {
    routeHistory,
    savedLocations,
    newLocationLabel,
    setNewLocationLabel,
    addHistoryEntry,
    saveLocation,
    deleteSavedLocation,
  } = useRouteHistory();

  /**
   * Fire-and-forget bookkeeping that runs after a successful search.
   *
   * @param {boolean} hasRoutes - Whether the search produced at least one route.
   */
  const recordSearchSideEffects = (hasRoutes) => {
    try {
      addHistoryEntry(origin, destination);
    } catch (error) {
      console.error("Could not record route history:", error);
    }

    if (!hasRoutes) return;

    try {
      eventBus.emit("ROUTE_PLANNED", { origin, destination, mode });
    } catch (error) {
      console.error("Could not emit ROUTE_PLANNED:", error);
    }
  };

  const handleRouteSearch = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setIsCalculating(true);
    setRouteError(null);

    let routeResults;
    try {
      // @ts-ignore
      routeResults = await calculateCleanRoute(origin, destination, mode);
    } catch (error) {
      console.error("Route search failed:", error);
      setRouteError(describeRouteError(error));
      setIsCalculating(false);
      return;
    }

    // Past this point the search succeeded. Nothing below is allowed to report
    // itself as a routing failure — that is what turned a missing import into
    // "Error calculating route" on every successful search (#668).
    try {
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
      }

      // History and achievements are bookkeeping. A failure in either should cost
      // the user that bookkeeping, not the routes they just waited for.
      recordSearchSideEffects(allRoutesData.length > 0);
    } finally {
      setIsCalculating(false);
    }
  };

  const applyHistoryEntry = async (entry) => {
    setOrigin(entry.origin);
    setDestination(entry.destination);
    
    // Automatically trigger the route search using the selected history values
    setIsCalculating(true);
    setRouteError(null);

    try {
      // @ts-ignore
      const routeResults = await calculateCleanRoute(entry.origin, entry.destination, mode);
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
      }
    } catch (error) {
      console.error("Route search failed from history:", error);
      setRouteError(describeRouteError(error));
    } finally {
      setIsCalculating(false);
    }
  };

  const applySavedLocation = (value, field) => {
    if (field === "origin") setOrigin(value);
    else setDestination(value);
  };

  return (
    <div className="commute-container">
      <h2>Clean Route Planner</h2>
      {geoError && (
        <div className="geo-error-banner">
          ⚠️ Reverse Geocoding Notice: {geoError}
          <button
            type="button"
            className="geo-error-banner-dismiss"
            onClick={() => setGeoError(null)}
          >
            ×
          </button>
        </div>
      )}
      {routeError && (
        <div
          className="commute-error-banner"
          role="alert"
          data-testid="commute-route-error"
        >
          <span>⚠️ {routeError}</span>
          <button
            type="button"
            className="commute-error-dismiss"
            onClick={() => setRouteError(null)}
            aria-label="Dismiss route error"
          >
            ×
          </button>
        </div>
      )}
      <SavedLocations
        savedLocations={savedLocations}
        applySavedLocation={applySavedLocation}
        deleteSavedLocation={deleteSavedLocation}
      />
      <RouteForm
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        mode={mode}
        setMode={setMode}
        isCalculating={isCalculating}
        isLocating={isLocating}
        locationSuccess={locationSuccess}
        handleGetLocation={handleGetLocation}
        handleRouteSearch={handleRouteSearch}
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
      />
      <RouteHistory
        entries={routeHistory}
        onSelect={applyHistoryEntry}
      />
      <RouteMap
        routes={routes}
        activeRouteIndex={activeRouteIndex}
        mapCenter={mapCenter}
        searchId={searchId}
        legendItems={LEGEND_ITEMS}
        origin={origin}
        destination={destination}
      />
    </div>
  );
};

export default Commute;
