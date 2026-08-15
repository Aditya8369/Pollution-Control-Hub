import React from 'react';
import PropTypes from 'prop-types';
import InfoTooltip from "./InfoTooltip";

function formatReading(value, unit) {
  if (value === null || value === undefined || value === "") return "Not available";
  return `${value} ${unit}`;
}

function coverageNote(route) {
  if (!route || route.totalCheckpoints == null) return null;
  if (!route.measured) {
    return "No pollution readings were available for this route.";
  }
  if (route.measuredCheckpoints < route.totalCheckpoints) {
    return `Based on ${route.measuredCheckpoints} of ${route.totalCheckpoints} sample points — the rest could not be fetched.`;
  }
  return null;
}

const noop = () => { };

export default function RouteResults({
  routes = [],
  activeRouteIndex = 0,
  setActiveRouteIndex = noop,
  pollutionDataAvailable = true,
  mode = "",
}) {
  if (routes.length === 0) {
    return null;
  }

  const activeRoute = routes[activeRouteIndex];

  // activeRouteIndex is reset to 0 on each search, but a stale index (or a shorter
  // results set) would otherwise dereference undefined below.
  if (!activeRoute) {
    return null;
  }

  return (
    <>
      {!pollutionDataAvailable && (
        <div
          className="commute-error-banner commute-error-banner--no-data"
          role="status"
          data-testid="commute-no-pollution-data"
        >
          <span>
            ⚠️ <strong>Air quality data unavailable.</strong>{" "}
            <InfoTooltip text="Pollution measurements could not be retrieved for these routes. The routes are still shown using distance and travel time." />
          </span>
          <span>
            These routes are shown by distance and time only — none of them could be ranked for pollution,
            so no route is marked cleanest.
          </span>
        </div>
      )}

      {/* Rendered via the new sub-component */}
      <ActiveRouteStats activeRoute={activeRoute} mode={mode} />

      <div className="commute-options">
        <h3>Route Options</h3>
        <div className="commute-route-list">
          {routes.map((route, idx) => {
            const isActive = idx === activeRouteIndex;
            const isCleanest = idx === 0 && route.measured !== false;
            return (
              <button
                key={idx}
                type="button"
                className={`commute-route-option ${isActive ? 'active' : ''}`}
                onClick={() => setActiveRouteIndex(idx)}
                aria-pressed={isActive}
              >
                <div className="commute-route-option-head">
                  <strong className="commute-route-option-title">
                    Route {idx + 1}
                  </strong>
                  {isCleanest && (
                    <span className="commute-cleanest-wrap">
                      <span className="commute-cleanest-badge">
                        Cleanest
                      </span>
                      <InfoTooltip text="The route with the lowest measured pollution exposure among the available route options." />
                    </span>
                  )}
                </div>
                <div className="commute-route-option-meta">
                  <span>⏱ {route.duration} min</span>
                  <span>📏 {route.distance} km</span>
                  {route.measured === false ? (
                    <span className="commute-route-pm commute-route-pm--unmeasured">
                      ☁️ No reading
                      <InfoTooltip text="No pollution reading was available for this route, so it could not be ranked based on air quality." />
                    </span>
                  ) : (
                    <span className={`commute-route-pm ${isCleanest ? 'commute-route-pm--cleanest' : ''}`}>
                      ☁️ {route.pm25} µg/m³
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

RouteResults.propTypes = {
  routes: PropTypes.array,
  activeRouteIndex: PropTypes.number,
  setActiveRouteIndex: PropTypes.func,
  pollutionDataAvailable: PropTypes.bool,
  mode: PropTypes.string,
};
