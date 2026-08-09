import React from 'react';
import PropTypes from 'prop-types';

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

export default function RouteResults({
  routes,
  activeRouteIndex,
  setActiveRouteIndex,
  pollutionDataAvailable,
  mode,
  routeHistory,
  applyHistoryEntry,
}) {
  if (routes.length === 0) {
    return (
      routeHistory.length > 0 && (
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
      )
    );
  }

  const activeRoute = routes[activeRouteIndex];
  const note = coverageNote(activeRoute);

  return (
    <>
      {!pollutionDataAvailable && (
        <div
          className="commute-error-banner"
          role="status"
          data-testid="commute-no-pollution-data"
          style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#c2410c",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ <strong>Air quality data unavailable.</strong> These routes are shown
          by distance and time only — none of them could be ranked for pollution,
          so no route is marked cleanest.
        </div>
      )}

      <div className="commute-stats" style={{ marginBottom: "1.5rem" }}>
        <h3>Route Selected</h3>
        <p>
          Mode: <strong style={{ textTransform: "capitalize" }}>{activeRoute.mode || mode}</strong>
        </p>
        <p>
          Distance: <strong>{activeRoute.distance} km</strong>
        </p>
        <p>
          Est. Time: <strong>{activeRoute.duration} mins</strong>
        </p>
        <p>
          Avg PM2.5: <strong>{formatReading(activeRoute.pm25, "µg/m³")}</strong>
        </p>
        <p>
          Inhaled PM2.5 Dose: <strong>{formatReading(activeRoute.inhaledDose, "µg")}</strong>
        </p>
        {note && (
          <p
            className="commute-coverage-note"
            data-testid="commute-coverage-note"
            style={{ fontSize: "0.85rem", color: "#b45309", marginTop: "0.25rem" }}
          >
            {note}
          </p>
        )}
      </div>

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
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${isActive ? '#0d9488' : '#e5e7eb'}`,
                  background: isActive ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.1rem', color: isActive ? '#0f766e' : '#374151' }}>
                    Route {idx + 1}
                  </strong>
                  {isCleanest && (
                    <span style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      Cleanest
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4b5563' }}>
                  <span>⏱ {route.duration} min</span>
                  <span>📏 {route.distance} km</span>
                  {route.measured === false ? (
                    <span style={{ color: '#64748b', fontWeight: '600' }}>
                      ☁️ No reading
                    </span>
                  ) : (
                    <span style={{ color: isCleanest ? '#059669' : '#b45309', fontWeight: '600' }}>
                      ☁️ {route.pm25} µg/m³
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
    </>
  );
}

RouteResults.propTypes = {
  routes: PropTypes.array.isRequired,
  activeRouteIndex: PropTypes.number.isRequired,
  setActiveRouteIndex: PropTypes.func.isRequired,
  pollutionDataAvailable: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  routeHistory: PropTypes.array.isRequired,
  applyHistoryEntry: PropTypes.func.isRequired,
};
