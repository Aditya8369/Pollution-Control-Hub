import React, { useRef } from 'react';
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

function ActiveRouteStats({ activeRoute, mode }) {
  if (!activeRoute) return null;

  const note = coverageNote(activeRoute);

  return (
    <div className="commute-active-stats" style={{
      background: '#f0fdfa',
      border: '1px solid #99f6e4',
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
      marginBottom: '1.25rem',
    }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f766e' }}>
        Selected Route Summary {mode && <span style={{ fontWeight: 400, color: '#6b7280' }}>({mode})</span>}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#374151' }}>
        <span>⏱ <strong>{activeRoute.duration}</strong> min</span>
        <span>📏 <strong>{activeRoute.distance}</strong> km</span>
        {activeRoute.measured !== false ? (
          <span>☁️ PM2.5: <strong>{formatReading(activeRoute.pm25, 'µg/m³')}</strong></span>
        ) : (
          <span style={{ color: '#64748b' }}>☁️ PM2.5: <strong>No reading</strong></span>
        )}
      </div>
      {note && (
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{note}</p>
      )}
    </div>
  );
}

const noop = () => { };

export default function RouteResults({
  routes = [],
  activeRouteIndex = 0,
  setActiveRouteIndex = noop,
  pollutionDataAvailable = true,
  mode = "",
  isCalculating = false,
}) {
  const routeButtonRefs = useRef([]);

  if (isCalculating) {
    return (
      <div className="commute-skeleton" data-testid="commute-skeleton">
        <div className="commute-stats commute-skeleton-block">
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line-short" />
        </div>
        <div className="commute-options">
          <h3>Route Options</h3>
          <div className="commute-route-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="commute-route-option commute-skeleton-block">
                <div className="skeleton-line skeleton-line-title skeleton-line-short" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleRouteOptionKeyDown = (e, idx) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nextIndex =
      e.key === 'ArrowDown'
        ? (idx + 1) % routes.length
        : (idx - 1 + routes.length) % routes.length;
    setActiveRouteIndex(nextIndex);
    routeButtonRefs.current[nextIndex]?.focus();
  };

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
            display: "flex",
            alignItems: "flex-start",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
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
                ref={(el) => (routeButtonRefs.current[idx] = el)}
                type="button"
                className={`commute-route-option ${isActive ? 'active' : ''}`}
                onClick={() => setActiveRouteIndex(idx)}
                onKeyDown={(e) => handleRouteOptionKeyDown(e, idx)}
                aria-pressed={isActive}
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Cleanest
                      </span>
                      <InfoTooltip text="The route with the lowest measured pollution exposure among the available route options." />
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4b5563' }}>
                  <span>⏱ {route.duration} min</span>
                  <span>📏 {route.distance} km</span>
                  {route.measured === false ? (
                    <span style={{ color: '#64748b', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      ☁️ No reading
                      <InfoTooltip text="No pollution reading was available for this route, so it could not be ranked based on air quality." />
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
    </>
  );
}

RouteResults.propTypes = {
  routes: PropTypes.array,
  activeRouteIndex: PropTypes.number,
  setActiveRouteIndex: PropTypes.func,
  pollutionDataAvailable: PropTypes.bool,
  mode: PropTypes.string,
  isCalculating: PropTypes.bool,
};
