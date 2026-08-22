import React, { useEffect, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRouteHistory } from "../hooks/useRouteHistory";
import { useRouteSearch } from "../hooks/useRouteSearch";
import { getAQIBand } from "../services/airQualityService";
import RouteForm from "./RouteForm";
import SavedLocations from "./SavedLocations";
import RouteHistory from "./RouteHistory";
import RouteResults from "./RouteResults";
import RouteComparison from "./RouteComparison";
import RouteMap from "./RouteMap";
import "leaflet/dist/leaflet.css";

const TRANSPORT_MODE_KEY = "pollution-hub-commute-mode";
const TRANSPORT_MODES = ["driving", "biking", "foot"];
const DEFAULT_TRANSPORT_MODE = "driving";

/**
 * The persisted mode is read back through the same allow-list the buttons offer, so a
 * stale or hand-edited value falls back to driving instead of leaving every mode chip
 * unselected and the OSRM profile unresolvable.
 */
function readStoredMode() {
  try {
    const stored = localStorage.getItem(TRANSPORT_MODE_KEY);
    return TRANSPORT_MODES.includes(stored) ? stored : DEFAULT_TRANSPORT_MODE;
  } catch {
    // localStorage may be unavailable (e.g. private browsing) — fall back to the default.
    return DEFAULT_TRANSPORT_MODE;
  }
}

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
  const [mode, setMode] = useState(readStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(TRANSPORT_MODE_KEY, mode);
    } catch {
      // localStorage may be unavailable (e.g. private browsing) — ignore.
    }
  }, [mode]);

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

  const {
    routes,
    pollutionDataAvailable,
    activeRouteIndex,
    setActiveRouteIndex,
    searchId,
    mapCenter,
    isCalculating,
    routeError,
    setRouteError,
    executeRouteSearch,
  } = useRouteSearch();

  const handleRouteSearch = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    executeRouteSearch(origin, destination, mode, addHistoryEntry);
  };

  const applyHistoryEntry = (entry) => {
    setOrigin(entry.origin);
    setDestination(entry.destination);
    executeRouteSearch(entry.origin, entry.destination, mode, addHistoryEntry);
  };

  const applySavedLocation = (value, field) => {
    if (field === "origin") setOrigin(value);
    else setDestination(value);
  };

  return (
    // A11Y FIX: Semantic landmark for screen readers
    <main className="commute-container" aria-labelledby="commute-heading">
      <h2 id="commute-heading">Clean Route Planner</h2>

      {geoError && (
        // A11Y FIX: role="alert" ensures screen readers announce errors immediately
        <div className="geo-error-banner" role="alert" aria-live="assertive">
          <span><span aria-hidden="true">⚠️</span> Reverse Geocoding Notice: {geoError}</span>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            aria-label="Dismiss geolocation error"
            style={{ background: "none", border: "none", color: "#c2410c", fontWeight: "bold", cursor: "pointer", paddingLeft: "1rem" }}
          >
            ×
          </button>
        </div>
      )}

      {routeError && (
        <div
          className="commute-error-banner"
          role="alert"
          aria-live="assertive"
          data-testid="commute-route-error"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span><span aria-hidden="true">⚠️</span> {routeError}</span>
          <button
            type="button"
            onClick={() => setRouteError(null)}
            aria-label="Dismiss route error"
            style={{ background: "none", border: "none", color: "#b91c1c", fontWeight: "bold", cursor: "pointer" }}
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
      <RouteHistory entries={routeHistory} onSelect={applyHistoryEntry} />
      <RouteResults
        routes={routes}
        activeRouteIndex={activeRouteIndex}
        setActiveRouteIndex={setActiveRouteIndex}
        pollutionDataAvailable={pollutionDataAvailable}
        mode={mode}
        isCalculating={isCalculating}
      />
      {!isCalculating && (
        <RouteComparison
          routes={routes}
          activeRouteIndex={activeRouteIndex}
          setActiveRouteIndex={setActiveRouteIndex}
        />
      )}
      <RouteMap
        routes={routes}
        activeRouteIndex={activeRouteIndex}
        mapCenter={mapCenter}
        searchId={searchId}
        legendItems={LEGEND_ITEMS}
        origin={origin}
        destination={destination}
      />
    </main>
  );
};

export default Commute;
