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

const noop = () => { };
function ActiveRouteStats({ activeRoute, mode = "" }) {
  if (!activeRoute) {
    return null;
  }

  const routeMode = activeRoute.mode || mode || "driving";
  const coverageText = coverageNote(activeRoute);

  return (
    <div className="commute-active-route" data-testid="commute-active-route">
      <h3>Route Selected</h3>
      <div
        className="commute-selected-route-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            Mode
          </div>
          <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{routeMode}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            PM2.5
          </div>
          <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{formatReading(activeRoute.pm25, 'µg/m³')}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            Inhaled dose
          </div>
          <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{formatReading(activeRoute.inhaledDose, 'µg')}</strong>
        </div>
      </div>

      {coverageText && (
        <div
          className="commute-coverage-note"
          data-testid="commute-coverage-note"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--bg-card-alt, var(--card))',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
        >
          {coverageText}
        </div>
      )}
    </div>
  );
}

ActiveRouteStats.propTypes = {
  activeRoute: PropTypes.shape({
    mode: PropTypes.string,
    pm25: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    inhaledDose: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    measured: PropTypes.bool,
    measuredCheckpoints: PropTypes.number,
    totalCheckpoints: PropTypes.number,
  }),
  mode: PropTypes.string,
};

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
  isCalculating: PropTypes.bool,
};
