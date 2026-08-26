import { useReducer } from "react";
import { calculateCleanRoute } from "../services/routePlanner";
import { describeRouteError } from "../utils/routeErrors";
import { eventBus } from "../core/events";

const initialState = {
  routes: [],
  pollutionDataAvailable: true,
  activeRouteIndex: 0,
  searchId: 0,
  mapCenter: [28.6139, 77.209],
  isCalculating: false,
  routeError: null,
};

/**
 * Consolidates route-search state that used to be seven separate useState
 * calls. The win is SEARCH_SUCCESS: routes, pollutionDataAvailable,
 * activeRouteIndex, and searchId now update together in one dispatch — a
 * single predictable transaction — instead of several sequential setState
 * calls that could each trigger their own render (issue #718).
 *
 * @param {typeof initialState} state
 * @param {{ type: string, payload?: any }} action
 */
function routeSearchReducer(state, action) {
  switch (action.type) {
    case "SEARCH_START":
      return { ...state, isCalculating: true, routeError: null };

    case "SEARCH_ERROR":
      return { ...state, routeError: action.payload, isCalculating: false };

    case "SEARCH_SUCCESS":
      return {
        ...state,
        routes: action.payload.routes,
        pollutionDataAvailable: action.payload.pollutionDataAvailable,
        activeRouteIndex: 0,
        searchId: state.searchId + 1,
        mapCenter: action.payload.mapCenter ?? state.mapCenter,
        isCalculating: false,
      };

    // Safety net matching the original try/finally: guarantees the spinner
    // clears even if something after SEARCH_SUCCESS throws.
    case "SEARCH_SETTLED":
      return { ...state, isCalculating: false };

    case "SET_ACTIVE_ROUTE_INDEX":
      return { ...state, activeRouteIndex: action.payload };

    case "SET_ROUTE_ERROR":
      return { ...state, routeError: action.payload };

    default:
      return state;
  }
}

export function useRouteSearch() {
  const [state, dispatch] = useReducer(routeSearchReducer, initialState);

  const setActiveRouteIndex = (index) => dispatch({ type: "SET_ACTIVE_ROUTE_INDEX", payload: index });
  const setRouteError = (error) => dispatch({ type: "SET_ROUTE_ERROR", payload: error });

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
    dispatch({ type: "SEARCH_START" });

    let routeResults;
    try {
      routeResults = await calculateCleanRoute(origin, destination, mode);
    } catch (error) {
      console.error("Route search failed:", error);
      dispatch({ type: "SEARCH_ERROR", payload: describeRouteError(error) });
      return;
    }

    // A resolved-but-malformed result used to reach `routeResults.allRoutes` unguarded
    // and reject outside the catch above, leaving the spinner spinning with no message.
    if (!routeResults || !Array.isArray(routeResults.allRoutes)) {
      console.error("Route search returned no usable routes:", routeResults);
      dispatch({ type: "SEARCH_ERROR", payload: describeRouteError(new Error("Could not calculate routes")) });
      return;
    }

    try {
      const allRoutesData = routeResults.allRoutes.map((r) => ({
        ...r,
        leafletCoords: r.geometry.map((coord) => [coord[1], coord[0]]),
      }));

      dispatch({
        type: "SEARCH_SUCCESS",
        payload: {
          routes: allRoutesData,
          pollutionDataAvailable: routeResults.pollutionDataAvailable !== false,
          mapCenter: allRoutesData.length > 0 ? allRoutesData[0].leafletCoords[0] : undefined,
        },
      });

      recordSearchSideEffects(origin, destination, mode, allRoutesData.length > 0, addHistoryEntry);
    } finally {
      dispatch({ type: "SEARCH_SETTLED" });
    }
  };

  return {
    routes: state.routes,
    pollutionDataAvailable: state.pollutionDataAvailable,
    activeRouteIndex: state.activeRouteIndex,
    setActiveRouteIndex,
    searchId: state.searchId,
    mapCenter: state.mapCenter,
    isCalculating: state.isCalculating,
    routeError: state.routeError,
    setRouteError,
    executeRouteSearch,
  };
}