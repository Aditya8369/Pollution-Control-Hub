import { useState } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import { describeRouteError } from "../utils/routeErrors";
import { eventBus } from "../core/events";

export function useRouteSearch() {
  const [routes, setRoutes] = useState([]);
  const [pollutionDataAvailable, setPollutionDataAvailable] = useState(true);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [searchId, setSearchId] = useState(0);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.209]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const recordSearchSideEffects = (origin, destination, mode, hasRoutes, addHistoryEntry) => {
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

  const executeRouteSearch = async (origin, destination, mode, addHistoryEntry) => {
    setIsCalculating(true);
    setRouteError(null);

    let routeResults;
    try {
      routeResults = await calculateCleanRoute(origin, destination, mode);
    } catch (error) {
      console.error("Route search failed:", error);
      setRouteError(describeRouteError(error));
      setIsCalculating(false);
      return;
    }

    try {
      const allRoutesData = routeResults.allRoutes.map((r) => ({
        ...r,
        leafletCoords: r.geometry.map((coord) => [coord[1], coord[0]]),
      }));
      setRoutes(allRoutesData);
      setPollutionDataAvailable(routeResults.pollutionDataAvailable !== false);
      setActiveRouteIndex(0);
      setSearchId((prev) => prev + 1);
      if (allRoutesData.length > 0) {
        setMapCenter(allRoutesData[0].leafletCoords[0]);
      }

      recordSearchSideEffects(origin, destination, mode, allRoutesData.length > 0, addHistoryEntry);
    } finally {
      setIsCalculating(false);
    }
  };

  return {
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
  };
}
